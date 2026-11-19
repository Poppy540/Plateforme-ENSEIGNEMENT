-- Décisions de la revue de sécurité (Jalon 6, étape 1 ; ADR 0049) : propositions de la revue appliquées,
-- réglables ensuite par le propriétaire.
--   D4 empreintes de la liste d'opposition avec un sel secret ;
--   D5 indicatifs téléphoniques autorisés, tirés des packs pays ;
--   D6 sessions révocables en base ;
--   D7 lecture des référents limitée à leurs familles, sans élève ;
--   D9 suppression d'un document officiel par le propriétaire.

-- ---------------------------------------------------------------------------
-- D6 Sessions révocables. La table ne garde que l'identifiant du compte et des dates (ni adresse, ni appareil).
-- Le cookie signé porte l'identifiant de la session ; chaque requête vérifie qu'elle est encore active.
-- ---------------------------------------------------------------------------
create table sessions_ouvertes (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null,
  revoquee_le timestamptz
);
create index on sessions_ouvertes (utilisateur);
alter table sessions_ouvertes enable row level security;
revoke all on sessions_ouvertes from public, anon, authenticated;

/** Ouverture d'une session pour la personne connectée (au plus 30 jours ; durée choisie par le serveur). */
create function ouvrir_session(p_heures integer) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  -- Ménage : sessions expirées ou révoquées de la même personne.
  delete from sessions_ouvertes where utilisateur = auth.uid() and (expire_le < now() or revoquee_le is not null);
  insert into sessions_ouvertes (utilisateur, expire_le)
  values (auth.uid(), now() + make_interval(hours => least(greatest(p_heures, 1), 720)))
  returning id into v_id;
  return v_id;
end;
$$;

/** Session active : compte, rôle et date d'ouverture (le serveur applique la durée propre au rôle). */
create function session_active(p_session uuid) returns table (utilisateur uuid, role role_compte, cree_le timestamptz)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select s.utilisateur, p.role, s.cree_le
  from sessions_ouvertes s left join profils p on p.id = s.utilisateur
  where s.id = p_session and s.revoquee_le is null and s.expire_le > now()
$$;

/** Déconnexion : une session de la personne connectée. */
create function revoquer_session(p_session uuid) returns boolean
language sql security definer
set search_path = pg_catalog, public
as $$
  with r as (
    update sessions_ouvertes set revoquee_le = now()
    where id = p_session and utilisateur = auth.uid() and revoquee_le is null returning 1
  ) select exists (select 1 from r)
$$;

/** « Me déconnecter de tous mes appareils ». */
create function revoquer_mes_sessions() returns integer
language sql security definer
set search_path = pg_catalog, public
as $$
  with r as (
    update sessions_ouvertes set revoquee_le = now()
    where utilisateur = auth.uid() and revoquee_le is null returning 1
  ) select count(*)::int from r
$$;

/** Incident (dossier de production §8) : l'administration ferme toutes les sessions, sauf la sienne. */
create function revoquer_toutes_les_sessions(p_garder uuid) returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Administration requise.' using errcode = '42501';
  end if;
  update sessions_ouvertes set revoquee_le = now()
  where revoquee_le is null and id is distinct from p_garder;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function ouvrir_session(integer), session_active(uuid), revoquer_session(uuid),
  revoquer_mes_sessions(), revoquer_toutes_les_sessions(uuid) from public;
grant execute on function session_active(uuid) to anon;
grant execute on function ouvrir_session(integer), revoquer_session(uuid), revoquer_mes_sessions(),
  revoquer_toutes_les_sessions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- D4 Liste d'opposition : empreinte salée par un secret gardé hors de la base (variable SEL_OPPOSITION,
-- transmise par le serveur pour la transaction : une copie de la base seule ne permet plus de retrouver une
-- adresse devinable). Les empreintes déjà inscrites, sans sel, restent reconnues.
-- ---------------------------------------------------------------------------
alter table liste_opposition add column salee boolean not null default true;
update liste_opposition set salee = false;

/** Ancienne empreinte, sans sel (lecture des inscriptions antérieures seulement). */
create function empreinte_contact_sans_sel(p_contact text) returns text
language sql immutable
set search_path = pg_catalog, public
as $$ select encode(sha256(convert_to(lower(regexp_replace(coalesce(p_contact, ''), '\s', '', 'g')), 'UTF8')), 'hex') $$;

create or replace function empreinte_contact(p_contact text) returns text
language plpgsql stable
set search_path = pg_catalog, public
as $$
declare v_sel text := coalesce(current_setting('app.sel_opposition', true), '');
begin
  if char_length(v_sel) < 16 then
    raise exception 'Sel de la liste d''opposition absent.' using errcode = '55000';
  end if;
  return encode(sha256(convert_to(v_sel || E'\n' || lower(regexp_replace(coalesce(p_contact, ''), '\s', '', 'g')), 'UTF8')), 'hex');
end;
$$;

create or replace function dans_opposition(p_contact text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from liste_opposition
    where (salee and empreinte = empreinte_contact(p_contact))
       or (not salee and empreinte = empreinte_contact_sans_sel(p_contact))
  )
$$;

revoke execute on function empreinte_contact_sans_sel(text), empreinte_contact(text), dans_opposition(text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- D5 Indicatifs téléphoniques autorisés (connexion, contact du parent) : déclarés par chaque pack pays.
-- ---------------------------------------------------------------------------
alter table pays add column indicatifs_telephone text[] not null default '{}'
  check (array_to_string(indicatifs_telephone, ',') ~ '^(\+[1-9][0-9]{0,3}(,\+[1-9][0-9]{0,3})*)?$');

/** Indicatifs de tous les pays importés (aucune autre donnée). */
create function indicatifs_autorises() returns text[]
language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(array_agg(distinct i order by i), '{}') from pays, unnest(indicatifs_telephone) i $$;
revoke execute on function indicatifs_autorises() from public;
grant execute on function indicatifs_autorises() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- D7 Référents : approbations de leurs familles seulement (et les leurs) ; plus aucun signalement (ils portent
-- l'identifiant de l'élève et, parfois, une détresse) : la file humaine reste à l'administration.
-- ---------------------------------------------------------------------------
/** Chapitre auquel se rapporte un objet validé (chapitre, script, quiz, vidéo). */
create function chapitre_de_l_objet(p_type text, p_id uuid) returns uuid
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select case p_type
    when 'chapitre' then p_id
    when 'script' then (select chapitre_id from scripts where id = p_id)
    when 'quiz' then (select chapitre_id from quiz where id = p_id)
    else (select s.chapitre_id from videos v join scripts s on s.id = v.script_id where v.id = p_id)
  end
$$;

/** La personne connectée est-elle référente du chapitre de cet objet ? (Seule réponse rendue : oui ou non.) */
create function est_referent_de_l_objet(p_type text, p_id uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(est_referent_du_chapitre(chapitre_de_l_objet(p_type, p_id)), false) $$;

revoke execute on function chapitre_de_l_objet(text, uuid), est_referent_de_l_objet(text, uuid)
  from public, anon, authenticated;
grant execute on function est_referent_de_l_objet(text, uuid) to authenticated;

drop policy approbations_referents on approbations;
create policy approbations_referents on approbations for select to authenticated
  using (valideur_id = auth.uid() or est_referent_de_l_objet(objet_type, objet_id));

drop policy signalements_lecture on signalements;
create policy signalements_lecture on signalements for select to authenticated
  using (role_courant() = 'administrateur');

-- ---------------------------------------------------------------------------
-- D9 Suppression d'un document officiel par le propriétaire (ses rapports d'écart partent avec lui), tracée.
-- ---------------------------------------------------------------------------
create function supprimer_document_officiel(p_document uuid, p_acteur_empreinte text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_titre text;
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Seul le propriétaire supprime un document.' using errcode = '42501';
  end if;
  delete from documents_officiels where id = p_document returning titre into v_titre;
  if v_titre is null then return false; end if;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'suppression_document_officiel', 'document_officiel', p_document, '{}');
  return true;
end;
$$;
revoke execute on function supprimer_document_officiel(uuid, text) from public, anon;
grant execute on function supprimer_document_officiel(uuid, text) to authenticated;
