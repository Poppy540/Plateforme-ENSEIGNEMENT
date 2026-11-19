-- Jalon 5, étape 0 : corrections de la revue de sécurité et de confidentialité (ADR 0043,
-- docs/securite/revue-jalon-5.md). Chaque bloc renvoie au constat corrigé.

-- ---------------------------------------------------------------------------------------------------------
-- S1 Accord parental : un élève est mineur tant que l'âge de la majorité de son pays est inconnu (pack pays,
-- ADR 0019) ; la base l'impose, quelle que soit la déclaration envoyée par le formulaire.
-- S2 Jetons : la base ne rend plus jamais un jeton en clair à la session de l'élève (qui pourrait l'utiliser
-- lui-même si l'API de données de Supabase était ouverte). Elle renvoie l'identifiant de la demande ; seul le
-- service de messagerie émet le jeton, une fois, et l'envoie au parent.
-- ---------------------------------------------------------------------------------------------------------
create or replace function inscrire_eleve(
  p_prenom_ou_pseudo text,
  p_referentiel_code text,
  p_niveau_code text,
  p_serie_code text,
  p_est_mineur boolean,
  p_contact_parent text default null,
  p_etablissement text default null
) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_referentiel_id uuid;
  v_age_majorite integer;
  v_niveau niveaux%rowtype;
  v_serie_id uuid;
  v_consentement uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte est déjà inscrit.' using errcode = '23505';
  end if;

  select r.id, p.age_majorite into v_referentiel_id, v_age_majorite
  from referentiels r join pays p on p.code = r.pays_code where r.code = p_referentiel_code;
  if v_referentiel_id is null then
    raise exception 'Référentiel inconnu.' using errcode = '22023';
  end if;
  if not p_est_mineur and v_age_majorite is null then
    raise exception 'L''âge de la majorité de ce pays n''est pas connu : l''accord d''un parent est nécessaire.'
      using errcode = '22023';
  end if;

  select * into v_niveau from niveaux where referentiel_id = v_referentiel_id and code = p_niveau_code;
  if v_niveau.id is null then
    raise exception 'Classe inconnue pour ce référentiel.' using errcode = '22023';
  end if;

  if p_serie_code is not null then
    select id into v_serie_id from series where referentiel_id = v_referentiel_id and code = p_serie_code;
    if v_serie_id is null then
      raise exception 'Série inconnue pour ce référentiel.' using errcode = '22023';
    end if;
  end if;
  if v_niveau.series_obligatoires and v_serie_id is null then
    raise exception 'Une série est obligatoire pour cette classe.' using errcode = '22023';
  end if;
  if not v_niveau.series_obligatoires and v_serie_id is not null then
    raise exception 'Cette classe n''a pas de série.' using errcode = '22023';
  end if;

  if p_est_mineur and coalesce(trim(p_contact_parent), '') = '' then
    raise exception 'Le contact d''un parent ou tuteur est obligatoire pour un élève mineur.' using errcode = '22023';
  end if;

  insert into profils (id, role, prenom_ou_pseudo) values (auth.uid(), 'eleve', trim(p_prenom_ou_pseudo));
  insert into eleves (id, referentiel_id, niveau_id, serie_id, etablissement, est_mineur, statut)
  values (
    auth.uid(), v_referentiel_id, v_niveau.id, v_serie_id, nullif(trim(p_etablissement), ''), p_est_mineur,
    case when p_est_mineur then 'en_attente_parent'::statut_compte else 'actif'::statut_compte end
  );

  if p_est_mineur then
    insert into consentements (eleve_id, type, contact_parent)
    values (auth.uid(), 'inscription', trim(p_contact_parent))
    returning id into v_consentement;
  end if;

  -- Identifiant de la demande d'accord (null pour un élève majeur) : jamais le jeton.
  return v_consentement::text;
end;
$$;

/**
 * Service de messagerie : émet le jeton d'une demande d'accord encore sans jeton (inscription ou rapports),
 * en garde l'empreinte, et renvoie le contact du parent et le jeton en clair, une seule fois.
 */
create function emettre_jeton_consentement(p_consentement uuid) returns table (contact text, jeton text)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_jeton text := nouveau_jeton();
  v_contact text;
begin
  update consentements set empreinte_jeton = empreinte_jeton(v_jeton)
  where id = p_consentement and empreinte_jeton is null and accorde_le is null and revoque_le is null
    and contact_parent is not null
  returning contact_parent into v_contact;
  if v_contact is null then
    raise exception 'Demande d''accord introuvable ou jeton déjà émis.' using errcode = '22023';
  end if;
  return query select v_contact, v_jeton;
end;
$$;
revoke execute on function emettre_jeton_consentement(uuid) from public, anon, authenticated;
grant execute on function emettre_jeton_consentement(uuid) to service_messagerie;

-- S2 et S7 (rapports aux parents) : identifiant seulement, et une demande par jour au plus (un élève ne peut
-- pas faire envoyer des messages en boucle à un numéro en retirant puis en redemandant l'accord).
drop function demander_consentement_rapports(text);
create function demander_consentement_rapports(p_contact text default null) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_contact text;
  v_id uuid;
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
  if exists (
    select 1 from consentements
    where eleve_id = auth.uid() and type = 'rapport_parents' and demande_le > now() - interval '1 day'
  ) then
    raise exception 'Une seule demande par jour : réessaie demain.' using errcode = '22023';
  end if;
  select c.contact_parent into v_contact from consentements c
  where c.eleve_id = auth.uid() and c.type = 'inscription' and c.contact_parent is not null
  order by c.demande_le desc limit 1;
  v_contact := coalesce(v_contact, nullif(trim(p_contact), ''));
  if v_contact is null then
    raise exception 'Indiquez le numéro ou l''email de votre parent ou tuteur.' using errcode = '22023';
  end if;
  insert into consentements (eleve_id, type, contact_parent)
  values (auth.uid(), 'rapport_parents', v_contact)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function demander_consentement_rapports(text) from public, anon;
grant execute on function demander_consentement_rapports(text) to authenticated;

-- C11 Accord aux rapports retiré (par l'élève ou par le parent) : le contact du parent n'est plus nécessaire.
create or replace function revoquer_rapports_parents() returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update consentements set revoque_le = now(), empreinte_jeton = null, contact_parent = null
  where eleve_id = auth.uid() and type = 'rapport_parents' and revoque_le is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

create or replace function arreter_rapports_parents(p_jeton text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update consentements c set revoque_le = now(), empreinte_jeton = null, contact_parent = null
  from rapports_parents r
  where r.empreinte_jeton = empreinte_jeton(p_jeton) and r.consentement_id = c.id and c.revoque_le is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

-- S6 Lien d'un rapport : 60 jours après l'envoi ; après l'arrêt des rapports, le contenu n'est plus lisible.
create or replace function rapport_par_jeton(p_jeton text)
returns table (prenom text, contenu jsonb, cree_le timestamptz, accord_actif boolean, eleve_id uuid, consentement_id uuid)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select p.prenom_ou_pseudo,
    case when c.accorde_le is not null and c.revoque_le is null then r.contenu end,
    r.cree_le, (c.accorde_le is not null and c.revoque_le is null), r.eleve_id, r.consentement_id
  from rapports_parents r
  join consentements c on c.id = r.consentement_id
  join profils p on p.id = r.eleve_id
  where r.empreinte_jeton = empreinte_jeton(p_jeton)
    and coalesce(r.envoye_le, r.cree_le) > now() - interval '60 days'
$$;

-- ---------------------------------------------------------------------------------------------------------
-- S4 Quotas des appels au modèle, pris AVANT l'appel et gardés même s'il échoue (plan du Tuteur, corrections
-- et contestations de quiz, questions des parents). Une ligne par élève, nature et jour ; rien d'autre.
-- ---------------------------------------------------------------------------------------------------------
create table quotas_eleves (
  eleve_id uuid not null references eleves (id) on delete cascade,
  nature text not null check (nature in ('plan_tuteur', 'correction_quiz', 'contestation_quiz', 'question_parent')),
  jour date not null default current_date,
  n integer not null default 0,
  primary key (eleve_id, nature, jour)
);
alter table quotas_eleves enable row level security;
revoke all on quotas_eleves from public, anon, authenticated;

create function prendre_quota(p_eleve uuid, p_nature text, p_max integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  delete from quotas_eleves where jour < current_date - 1;
  insert into quotas_eleves (eleve_id, nature) values (p_eleve, p_nature)
  on conflict (eleve_id, nature, jour) do nothing;
  update quotas_eleves set n = n + 1
  where eleve_id = p_eleve and nature = p_nature and jour = current_date and n < p_max
  returning n into v_n;
  return v_n is not null;
end;
$$;
revoke execute on function prendre_quota(uuid, text, integer) from public, anon, authenticated;

/** L'élève connecté prend une place de son quota du jour (plan, correction, contestation). */
create function prendre_quota_eleve(p_nature text, p_max integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not exists (select 1 from eleves where id = auth.uid())
     or p_nature not in ('plan_tuteur', 'correction_quiz', 'contestation_quiz') then
    raise exception 'Élève connecté requis.' using errcode = '42501';
  end if;
  return prendre_quota(auth.uid(), p_nature, p_max);
end;
$$;
revoke execute on function prendre_quota_eleve(text, integer) from public, anon;
grant execute on function prendre_quota_eleve(text, integer) to authenticated;

/** Question d'un parent depuis le lien d'un rapport : accord actif exigé, quota par élève et par jour. */
create function prendre_quota_parent(p_jeton text, p_max integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_eleve uuid;
begin
  select r.eleve_id into v_eleve
  from rapports_parents r join consentements c on c.id = r.consentement_id
  where r.empreinte_jeton = empreinte_jeton(p_jeton) and c.accorde_le is not null and c.revoque_le is null
    and coalesce(r.envoye_le, r.cree_le) > now() - interval '60 days';
  if v_eleve is null then
    return false;
  end if;
  return prendre_quota(v_eleve, 'question_parent', p_max);
end;
$$;
revoke execute on function prendre_quota_parent(text, integer) from public, authenticated;
grant execute on function prendre_quota_parent(text, integer) to anon;

-- ---------------------------------------------------------------------------------------------------------
-- Droits trop larges.
-- ---------------------------------------------------------------------------------------------------------
-- S3 La liste d'opposition ne se consulte jamais depuis une session (le déclencheur suffit).
revoke execute on function dans_opposition(text) from authenticated;

-- S5 Les signalements d'élèves passent par les agents : pas d'insertion directe (priorité, dates, traitant
-- et chapitre auraient pu être forgés, et l'équipe de veille alertée à volonté).
drop policy signalements_eleve on signalements;
revoke insert on signalements from authenticated;

-- S5 L'état d'accord d'un élève quelconque ne se teste pas depuis une session (seul le Tuteur s'en sert).
revoke execute on function consentement_actif(uuid, type_consentement) from authenticated;

-- S8 L'agent Conformité ne lit que les liens de prérequis de son référentiel.
drop policy prerequis_conformite on prerequis_chapitres;
create policy prerequis_conformite on prerequis_chapitres for select to agent_conformite
  using (exists (
    select 1 from chapitres c join unites u on u.id = c.unite_id
    where c.id = prerequis_chapitres.chapitre_id and u.referentiel_id = contexte_agent('referentiel_id')
  ));

-- S8 Une proposition d'un rapport de cohérence déjà traité ne se décide plus.
create function decisions_coordinateur_rapport_ouvert() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if (select statut from rapports_coordinateur where id = new.rapport_id) is distinct from 'brouillon' then
    raise exception 'Ce rapport est déjà traité.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function decisions_coordinateur_rapport_ouvert() from public, anon, authenticated;
create trigger decisions_coordinateur_rapport_ouvert before insert on decisions_coordinateur
  for each row execute function decisions_coordinateur_rapport_ouvert();
