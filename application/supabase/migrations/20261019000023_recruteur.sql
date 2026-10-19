-- Jalon 4, étape 4 : agent Recruteur (ADR 0040 ; Partie E ; §5.2 ; ADR 0010). Données FICTIVES seulement tant
-- que le juriste n'a pas rendu son avis. Le propriétaire (rôle administrateur) décide de tout ; l'agent prépare.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_recruteur') then
    create role agent_recruteur nologin noinherit;
  end if;
  grant agent_recruteur to serveur_application;
end;
$$;
grant usage on schema public to agent_recruteur;
grant execute on function contexte_agent(text) to agent_recruteur;

create type statut_candidat as enum (
  'identifie', 'qualifie', 'contacte', 'relance', 'en_echange', 'entretien', 'accord_prepare', 'signe',
  'refus', 'suppression_demandee'
);
create type adequation_candidat as enum ('forte', 'moyenne', 'faible', 'impossible_a_evaluer');

-- Fiche MINIMALE : aucune colonne pour une donnée sensible, une pièce d'identité ou un numéro officiel.
create table candidats (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 120),
  famille text not null,
  niveau text check (char_length(niveau) <= 60),
  structure text check (char_length(structure) <= 200),
  -- Contact professionnel (email) ; jamais acheté, jamais collecté automatiquement.
  contact text not null check (char_length(contact) between 3 and 200),
  source text not null check (char_length(source) between 1 and 60),
  source_detail text check (char_length(source_detail) <= 300),
  adequation adequation_candidat,
  justification text check (char_length(justification) <= 1500),
  points_a_verifier text[] not null default '{}',
  secteur_public_a_verifier boolean not null default false,
  statut statut_candidat not null default 'identifie',
  cree_par uuid references profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
alter table candidats enable row level security;
revoke all on candidats from public, anon, authenticated;

/** Empreinte d'un contact (minuscules, sans espaces) : la liste d'opposition ne garde rien d'autre. */
create function empreinte_contact(p_contact text) returns text
language sql immutable
set search_path = pg_catalog, public
as $$ select encode(sha256(convert_to(lower(regexp_replace(coalesce(p_contact, ''), '\s', '', 'g')), 'UTF8')), 'hex') $$;

create table liste_opposition (
  empreinte text primary key,
  motif text not null check (motif in ('refus', 'suppression')),
  inscrit_le timestamptz not null default now()
);
alter table liste_opposition enable row level security;
revoke all on liste_opposition from public, anon, authenticated;

/** La personne est-elle dans la liste d'opposition ? (Seule question permise ; la liste n'est jamais lue.) */
create function dans_opposition(p_contact text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from liste_opposition where empreinte = empreinte_contact(p_contact)) $$;

/** Un candidat n'est jamais créé si son contact est dans la liste d'opposition. */
create function candidats_avant_insertion() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if dans_opposition(new.contact) then
    raise exception 'Cette personne a demandé à ne plus être contactée.' using errcode = '23514';
  end if;
  new.statut := 'identifie';
  return new;
end;
$$;
create trigger candidats_avant_insertion before insert on candidats
  for each row execute function candidats_avant_insertion();

create table messages_recrutement (
  id uuid primary key default gen_random_uuid(),
  candidat_id uuid not null references candidats (id) on delete cascade,
  nature text not null check (nature in ('premier_contact', 'relance', 'reponse', 'invitation_entretien')),
  objet text not null check (char_length(objet) between 1 and 200),
  texte text not null check (char_length(texte) between 1 and 5000),
  empreinte text not null default '',
  statut text not null default 'brouillon' check (statut in ('brouillon', 'approuve', 'envoye', 'annule')),
  approuve_par uuid references profils (id) on delete set null,
  approuve_le timestamptz,
  empreinte_approuvee text,
  envoye_le timestamptz,
  cree_le timestamptz not null default now()
);
alter table messages_recrutement enable row level security;
revoke all on messages_recrutement from public, anon, authenticated;

-- Création : brouillon, empreinte calculée. Ensuite le texte est figé : une modification = un nouveau brouillon.
create function messages_recrutement_versionnes() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.empreinte := encode(sha256(convert_to(new.objet || E'\n' || new.texte, 'UTF8')), 'hex');
    new.statut := 'brouillon';
    new.approuve_par := null; new.approuve_le := null; new.empreinte_approuvee := null; new.envoye_le := null;
    return new;
  end if;
  if new.objet is distinct from old.objet or new.texte is distinct from old.texte
     or new.empreinte is distinct from old.empreinte or new.candidat_id is distinct from old.candidat_id
     or new.nature is distinct from old.nature then
    raise exception 'Un message ne se modifie pas : créez un nouveau brouillon.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_recrutement_versionnes before insert or update on messages_recrutement
  for each row execute function messages_recrutement_versionnes();

-- ---------------------------------------------------------------------------------------------------------
-- Droits de l'agent : fiches minimales, brouillons de messages, statuts du pipeline (sauf « signé »),
-- inscription dans la liste d'opposition. Ni approbation, ni envoi, ni lecture de la liste d'opposition.
-- ---------------------------------------------------------------------------------------------------------
grant select (id, referentiel_id, nom, famille, niveau, structure, source, source_detail, adequation,
  justification, points_a_verifier, secteur_public_a_verifier, statut, cree_le) on candidats to agent_recruteur;
grant update (adequation, justification, points_a_verifier, secteur_public_a_verifier, statut, maj_le)
  on candidats to agent_recruteur;
create policy candidats_recruteur on candidats for select to agent_recruteur
  using (id = contexte_agent('candidat_id'));
create policy candidats_recruteur_maj on candidats for update to agent_recruteur
  using (id = contexte_agent('candidat_id') and statut not in ('refus', 'suppression_demandee', 'signe'))
  with check (statut not in ('signe', 'refus', 'suppression_demandee'));
grant select (id, candidat_id, nature, objet, texte, statut, envoye_le, cree_le) on messages_recrutement
  to agent_recruteur;
grant insert (candidat_id, nature, objet, texte) on messages_recrutement to agent_recruteur;
create policy messages_recruteur on messages_recrutement for select to agent_recruteur
  using (candidat_id = contexte_agent('candidat_id'));
create policy messages_recruteur_creation on messages_recrutement for insert to agent_recruteur
  with check (candidat_id = contexte_agent('candidat_id'));

/** L'agent enregistre un refus ou une demande de suppression : opposition et arrêt de tout contact. */
create function enregistrer_opposition(p_motif text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare c candidats;
begin
  select * into c from candidats where id = contexte_agent('candidat_id');
  if c.id is null then
    raise exception 'Candidat non fixé.' using errcode = '42501';
  end if;
  insert into liste_opposition (empreinte, motif) values (empreinte_contact(c.contact), p_motif)
  on conflict (empreinte) do nothing;
  update candidats set statut = case when p_motif = 'suppression' then 'suppression_demandee' else 'refus' end::statut_candidat,
    maj_le = now() where id = c.id;
  update messages_recrutement set statut = 'annule' where candidat_id = c.id and statut in ('brouillon', 'approuve');
  return true;
end;
$$;

grant insert on signalements to agent_recruteur;
create policy signalements_recruteur on signalements for insert to agent_recruteur
  with check (source = 'agent_recruteur' and traite_le is null and eleve_id is null and chapitre_id is null);

-- ---------------------------------------------------------------------------------------------------------
-- Le propriétaire (administration) : lecture, création des fiches, approbation, accord signé, suppression.
-- ---------------------------------------------------------------------------------------------------------
grant select, insert (referentiel_id, nom, famille, niveau, structure, contact, source, source_detail, cree_par)
  on candidats to authenticated;
grant update (statut, maj_le) on candidats to authenticated;
create policy candidats_administration on candidats for select to authenticated
  using (role_courant() = 'administrateur');
create policy candidats_administration_creation on candidats for insert to authenticated
  with check (role_courant() = 'administrateur' and cree_par = auth.uid());
create policy candidats_administration_maj on candidats for update to authenticated
  using (role_courant() = 'administrateur') with check (role_courant() = 'administrateur');
grant select on messages_recrutement to authenticated;
create policy messages_administration on messages_recrutement for select to authenticated
  using (role_courant() = 'administrateur');

/** Approbation d'un brouillon par le propriétaire : l'empreinte du texte lu est enregistrée. */
create function approuver_message_recrutement(p_message uuid, p_empreinte text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Seul le propriétaire approuve.' using errcode = '42501';
  end if;
  update messages_recrutement m set statut = 'approuve', approuve_par = auth.uid(), approuve_le = now(),
    empreinte_approuvee = m.empreinte
  where m.id = p_message and m.statut = 'brouillon' and m.empreinte = p_empreinte
    and exists (select 1 from candidats c where c.id = m.candidat_id and c.statut not in ('refus', 'suppression_demandee'));
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

/**
 * Envoi par le service de messagerie : message approuvé et inchangé, personne hors liste d'opposition et sans
 * refus, un seul premier contact, une seule relance et seulement après le délai. Renvoie contact, objet, texte.
 */
create function envoyer_message_recrutement(p_message uuid, p_delai_relance_jours integer)
returns table (contact text, objet text, texte text)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  m messages_recrutement;
  c candidats;
  v_premier timestamptz;
begin
  select * into m from messages_recrutement where id = p_message for update;
  if m.id is null or m.statut <> 'approuve' or m.empreinte_approuvee is distinct from m.empreinte then
    raise exception 'Message non approuvé (ou modifié depuis l''approbation).' using errcode = '42501';
  end if;
  select * into c from candidats where id = m.candidat_id for update;
  if c.statut in ('refus', 'suppression_demandee') or dans_opposition(c.contact) then
    update messages_recrutement set statut = 'annule' where id = m.id;
    raise exception 'Cette personne ne doit plus être contactée.' using errcode = '42501';
  end if;
  select min(envoye_le) into v_premier from messages_recrutement
  where candidat_id = c.id and nature = 'premier_contact' and statut = 'envoye';
  if m.nature = 'premier_contact' and v_premier is not null then
    raise exception 'Premier contact déjà envoyé.' using errcode = '22023';
  end if;
  if m.nature = 'relance' then
    if v_premier is null then
      raise exception 'Pas de relance sans premier contact.' using errcode = '22023';
    end if;
    if exists (select 1 from messages_recrutement where candidat_id = c.id and nature = 'relance' and statut = 'envoye') then
      raise exception 'Une seule relance.' using errcode = '22023';
    end if;
    if v_premier > now() - make_interval(days => greatest(p_delai_relance_jours, 1)) then
      raise exception 'Délai de relance non écoulé.' using errcode = '22023';
    end if;
    if exists (select 1 from messages_recrutement where candidat_id = c.id and nature = 'reponse' and statut = 'envoye') then
      raise exception 'La personne a déjà répondu : pas de relance.' using errcode = '22023';
    end if;
  end if;
  update messages_recrutement set statut = 'envoye', envoye_le = now() where id = m.id;
  update candidats set statut = case m.nature when 'premier_contact' then 'contacte' when 'relance' then 'relance'
    else statut end, maj_le = now()
  where id = c.id and statut in ('identifie', 'qualifie', 'contacte');
  return query select c.contact, m.objet, m.texte;
end;
$$;

/** Le propriétaire supprime une fiche : opposition enregistrée, données effacées (fiche et messages). */
create function supprimer_candidat(p_candidat uuid) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare c candidats;
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Seul le propriétaire supprime.' using errcode = '42501';
  end if;
  select * into c from candidats where id = p_candidat;
  if c.id is null then return false; end if;
  insert into liste_opposition (empreinte, motif) values (empreinte_contact(c.contact), 'suppression')
  on conflict (empreinte) do nothing;
  delete from candidats where id = c.id;
  return true;
end;
$$;

revoke execute on function empreinte_contact(text), dans_opposition(text), enregistrer_opposition(text),
  approuver_message_recrutement(uuid, text), envoyer_message_recrutement(uuid, integer), supprimer_candidat(uuid),
  candidats_avant_insertion(), messages_recrutement_versionnes() from public, anon, authenticated;
grant execute on function enregistrer_opposition(text) to agent_recruteur;
grant execute on function approuver_message_recrutement(uuid, text), supprimer_candidat(uuid) to authenticated;
grant execute on function envoyer_message_recrutement(uuid, integer) to service_messagerie;
grant execute on function dans_opposition(text) to authenticated;
