-- Jalon 3, étape 4 : rapports aux parents (ADR 0027, 0031).
-- Consentement « rapports aux parents » séparé de celui de l'inscription, demandé par l'élève, accordé par le
-- parent depuis un lien à usage unique, révocable par l'élève ou par le parent. Les parents n'ont pas de
-- compte : chaque rapport envoyé porte son propre lien (empreinte seule en base). Le Tuteur ne voit jamais le
-- contact du parent : l'envoi passe par le service de messagerie (rôle sans autre droit).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'service_messagerie') then
    create role service_messagerie nologin noinherit;
  end if;
  grant service_messagerie to serveur_application;
end;
$$;
grant usage on schema public to service_messagerie;

alter table rapports_parents add column empreinte_jeton text unique;

create function empreinte_jeton(p_jeton text) returns text
language sql immutable
set search_path = pg_catalog, public
as $$ select encode(sha256(convert_to(coalesce(p_jeton, ''), 'UTF8')), 'hex') $$;

create function nouveau_jeton() returns text
language sql volatile
set search_path = pg_catalog, public
as $$ select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') $$;

/**
 * L'élève connecté demande à ses parents s'ils veulent recevoir des rapports. Le contact est celui donné à
 * l'inscription (accord parental) ; à défaut (élève majeur), celui qu'il indique. Renvoie le jeton en clair
 * (à envoyer au parent) et le contact, une seule fois.
 */
create function demander_consentement_rapports(p_contact text default null)
returns table (jeton text, contact text)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_contact text;
  v_jeton text := nouveau_jeton();
begin
  if auth.uid() is null or not exists (select 1 from eleves where id = auth.uid() and statut = 'actif') then
    raise exception 'Compte élève actif requis.' using errcode = '42501';
  end if;
  if exists (
    select 1 from consentements
    where eleve_id = auth.uid() and type = 'rapport_parents' and revoque_le is null
  ) then
    raise exception 'Une demande est déjà en cours ou acceptée.' using errcode = '22023';
  end if;
  select c.contact_parent into v_contact from consentements c
  where c.eleve_id = auth.uid() and c.type = 'inscription' and c.contact_parent is not null
  order by c.demande_le desc limit 1;
  v_contact := coalesce(v_contact, nullif(trim(p_contact), ''));
  if v_contact is null then
    raise exception 'Indiquez le numéro ou l''email de votre parent ou tuteur.' using errcode = '22023';
  end if;
  insert into consentements (eleve_id, type, contact_parent, empreinte_jeton)
  values (auth.uid(), 'rapport_parents', v_contact, empreinte_jeton(v_jeton));
  return query select v_jeton, v_contact;
end;
$$;

/** Le parent accepte depuis le lien (sans compte). Jeton à usage unique. */
create function accepter_rapports_parents(p_jeton text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  update consentements set accorde_le = now(), empreinte_jeton = null
  where empreinte_jeton = empreinte_jeton(p_jeton) and type = 'rapport_parents'
    and accorde_le is null and revoque_le is null
  returning id into v_id;
  return v_id is not null;
end;
$$;

/** L'élève retire son accord aux rapports (demande en cours ou accordée). */
create function revoquer_rapports_parents() returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update consentements set revoque_le = now(), empreinte_jeton = null
  where eleve_id = auth.uid() and type = 'rapport_parents' and revoque_le is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

/** Le parent arrête les rapports depuis le lien d'un rapport reçu. */
create function arreter_rapports_parents(p_jeton text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update consentements c set revoque_le = now()
  from rapports_parents r
  where r.empreinte_jeton = empreinte_jeton(p_jeton) and r.consentement_id = c.id and c.revoque_le is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

/** Rapport consulté depuis son lien : prénom, contenu, date, et si l'accord est toujours actif. */
create function rapport_par_jeton(p_jeton text)
returns table (prenom text, contenu jsonb, cree_le timestamptz, accord_actif boolean, eleve_id uuid, consentement_id uuid)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select p.prenom_ou_pseudo, r.contenu, r.cree_le,
    (c.accorde_le is not null and c.revoque_le is null), r.eleve_id, r.consentement_id
  from rapports_parents r
  join consentements c on c.id = r.consentement_id
  join profils p on p.id = r.eleve_id
  where r.empreinte_jeton = empreinte_jeton(p_jeton)
$$;

/**
 * Service de messagerie : pour un rapport préparé dont l'accord est actif, renvoie le contact du parent et un
 * jeton neuf (lien du rapport), puis marque le rapport comme envoyé. Rien pour un rapport déjà envoyé.
 */
create function preparer_envoi_rapport(p_rapport uuid) returns table (contact text, jeton text)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_jeton text := nouveau_jeton();
  v_contact text;
begin
  select c.contact_parent into v_contact
  from rapports_parents r join consentements c on c.id = r.consentement_id
  where r.id = p_rapport and r.statut = 'prepare' and c.accorde_le is not null and c.revoque_le is null
  for update of r;
  if v_contact is null then
    return;
  end if;
  update rapports_parents set statut = 'envoye', envoye_le = now(), empreinte_jeton = empreinte_jeton(v_jeton)
  where id = p_rapport;
  return query select v_contact, v_jeton;
end;
$$;

/** Élèves dont l'accord aux rapports est actif et sans rapport depuis 7 jours (identifiants seulement). */
create function rapports_hebdomadaires_dus() returns table (eleve_id uuid, consentement_id uuid)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.eleve_id, c.id from consentements c join eleves e on e.id = c.eleve_id
  where c.type = 'rapport_parents' and c.accorde_le is not null and c.revoque_le is null and e.statut = 'actif'
    and not exists (
      select 1 from rapports_parents r where r.consentement_id = c.id and r.cree_le > now() - interval '7 days'
    )
$$;

revoke execute on function demander_consentement_rapports(text), accepter_rapports_parents(text),
  revoquer_rapports_parents(), arreter_rapports_parents(text), rapport_par_jeton(text),
  preparer_envoi_rapport(uuid), rapports_hebdomadaires_dus(), nouveau_jeton(), empreinte_jeton(text)
  from public, anon, authenticated;
grant execute on function demander_consentement_rapports(text), revoquer_rapports_parents() to authenticated;
grant execute on function accepter_rapports_parents(text), arreter_rapports_parents(text), rapport_par_jeton(text)
  to anon;
grant execute on function preparer_envoi_rapport(uuid) to service_messagerie;
grant execute on function rapports_hebdomadaires_dus() to agent_tuteur;
