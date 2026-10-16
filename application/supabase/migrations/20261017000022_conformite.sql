-- Jalon 4, étape 3 : agent Conformité programme (ADR 0039 ; prompt C ; §5.2).
-- Documents officiels déposés par un référent ou l'administration (texte ou PDF), traités comme des données.
-- L'agent lit le référentiel, le document de sa tâche et les contenus validés de l'unité comparée ; il écrit
-- des rapports d'écart au statut brouillon. Il ne modifie jamais le référentiel ; aucune donnée d'élève.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_conformite') then
    create role agent_conformite nologin noinherit;
  end if;
  grant agent_conformite to serveur_application;
end;
$$;
grant usage on schema public to agent_conformite;
grant execute on function contexte_agent(text) to agent_conformite;

create table documents_officiels (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  titre text not null check (char_length(titre) between 1 and 200),
  -- Origine déclarée par la personne qui dépose (organisme, référence, lien) : à vérifier, jamais présumée.
  origine text not null check (char_length(origine) between 1 and 500),
  declare_officiel boolean not null default false,
  format text not null check (format in ('texte', 'pdf')),
  texte text check (char_length(texte) <= 400000),
  pdf bytea check (octet_length(pdf) <= 10 * 1024 * 1024),
  empreinte text not null,
  depose_par uuid references profils (id) on delete set null,
  depose_le timestamptz not null default now(),
  check ((format = 'texte' and texte is not null and pdf is null) or (format = 'pdf' and pdf is not null and texte is null))
);
alter table documents_officiels enable row level security;
revoke all on documents_officiels from public, anon, authenticated;

/** Référent (de n'importe quelle famille) de ce référentiel, ou administration. */
create function peut_gerer_documents(p_referentiel uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select role_courant() = 'administrateur'
    or exists (select 1 from referents_familles where referent_id = auth.uid() and referentiel_id = p_referentiel)
$$;

/** Dépôt d'un document (texte ou PDF) ; empreinte calculée par la base ; déposant = personne connectée. */
create function deposer_document_officiel(
  p_referentiel uuid, p_titre text, p_origine text, p_declare_officiel boolean, p_texte text, p_pdf bytea
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  if not peut_gerer_documents(p_referentiel) then
    raise exception 'Référent du référentiel ou administration requis.' using errcode = '42501';
  end if;
  if (p_texte is null) = (p_pdf is null) then
    raise exception 'Un texte ou un PDF, pas les deux.' using errcode = '22023';
  end if;
  insert into documents_officiels (referentiel_id, titre, origine, declare_officiel, format, texte, pdf, empreinte, depose_par)
  values (p_referentiel, trim(p_titre), trim(p_origine), p_declare_officiel,
          case when p_pdf is null then 'texte' else 'pdf' end, p_texte, p_pdf,
          encode(sha256(coalesce(p_pdf, convert_to(p_texte, 'UTF8'))), 'hex'), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

grant select (id, referentiel_id, titre, origine, declare_officiel, format, empreinte, depose_par, depose_le)
  on documents_officiels to authenticated;
create policy documents_lecture on documents_officiels for select to authenticated
  using (peut_gerer_documents(referentiel_id));
grant select on documents_officiels to agent_conformite;
create policy documents_conformite on documents_officiels for select to agent_conformite
  using (id = contexte_agent('document_id') and referentiel_id = contexte_agent('referentiel_id'));

-- Lecture du référentiel (tous statuts) et des contenus validés de l'unité comparée.
grant select on pays, referentiels, niveaux, series, matieres, unites, unites_series, chapitres,
  prerequis_chapitres to agent_conformite;
create policy catalogue_conformite on pays for select to agent_conformite using (true);
create policy catalogue_conformite on referentiels for select to agent_conformite using (true);
create policy catalogue_conformite on niveaux for select to agent_conformite using (true);
create policy catalogue_conformite on series for select to agent_conformite using (true);
create policy catalogue_conformite on matieres for select to agent_conformite using (true);
create policy catalogue_conformite on unites for select to agent_conformite
  using (referentiel_id = contexte_agent('referentiel_id'));
create policy catalogue_conformite on unites_series for select to agent_conformite using (true);
create policy chapitres_conformite on chapitres for select to agent_conformite
  using (exists (select 1 from unites u where u.id = unite_id and u.referentiel_id = contexte_agent('referentiel_id')));
create policy prerequis_conformite on prerequis_chapitres for select to agent_conformite using (true);
grant select (id, chapitre_id, version, contenu, statut) on scripts to agent_conformite;
create policy scripts_conformite on scripts for select to agent_conformite
  using (statut = 'valide' and exists (select 1 from chapitres c where c.id = chapitre_id and c.unite_id = contexte_agent('unite_id')));
grant select (id, chapitre_id, version, questions, statut) on quiz to agent_conformite;
create policy quiz_conformite on quiz for select to agent_conformite
  using (statut = 'valide' and exists (select 1 from chapitres c where c.id = chapitre_id and c.unite_id = contexte_agent('unite_id')));

-- Signalements de l'agent (source contradictoire, réforme, document illisible…) : jamais d'élève.
grant insert on signalements to agent_conformite;
create policy signalements_conformite on signalements for insert to agent_conformite
  with check (source = 'agent_conformite' and traite_le is null and eleve_id is null);

-- Rapports d'écart (brouillons, figés), lus par les référents de la famille de l'unité et l'administration.
create table rapports_conformite (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  document_id uuid not null references documents_officiels (id) on delete cascade,
  unite_id uuid not null references unites (id) on delete cascade,
  version integer not null,
  contenu jsonb not null,
  controles jsonb not null default '[]'::jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'traite')),
  demande_par uuid references profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  traite_par uuid references profils (id) on delete set null,
  traite_le timestamptz,
  unique (document_id, unite_id, version)
);
alter table rapports_conformite enable row level security;
revoke all on rapports_conformite from public, anon, authenticated;

create function rapports_conformite_avant_insertion() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  new.version := coalesce((select max(version) from rapports_conformite
                           where document_id = new.document_id and unite_id = new.unite_id), 0) + 1;
  new.statut := 'brouillon';
  new.traite_par := null;
  new.traite_le := null;
  return new;
end;
$$;
create trigger rapports_conformite_avant_insertion before insert on rapports_conformite
  for each row execute function rapports_conformite_avant_insertion();

grant insert (referentiel_id, document_id, unite_id, contenu, controles, demande_par) on rapports_conformite to agent_conformite;
grant select (id, version) on rapports_conformite to agent_conformite;
create policy rapports_insertion_conformite on rapports_conformite for insert to agent_conformite
  with check (referentiel_id = contexte_agent('referentiel_id') and document_id = contexte_agent('document_id')
              and unite_id = contexte_agent('unite_id'));
create policy rapports_retour_conformite on rapports_conformite for select to agent_conformite
  using (document_id = contexte_agent('document_id'));

/** Le référent connecté couvre-t-il la famille de cette unité ? */
create function est_referent_unite(p_unite uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from unites u join matieres m on m.id = u.matiere_id
    join referents_familles rf on rf.referentiel_id = u.referentiel_id and rf.famille = m.famille
    where u.id = p_unite and rf.referent_id = auth.uid()
  )
$$;
grant select on rapports_conformite to authenticated;
create policy rapports_conformite_lecture on rapports_conformite for select to authenticated
  using (est_referent_unite(unite_id) or role_courant() = 'administrateur');

create function clore_rapport_conformite(p_rapport uuid) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update rapports_conformite set statut = 'traite', traite_par = auth.uid(), traite_le = now()
  where id = p_rapport and statut = 'brouillon' and est_referent_unite(unite_id);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke execute on function peut_gerer_documents(uuid), deposer_document_officiel(uuid, text, text, boolean, text, bytea),
  est_referent_unite(uuid), clore_rapport_conformite(uuid), rapports_conformite_avant_insertion() from public, anon;
grant execute on function peut_gerer_documents(uuid), deposer_document_officiel(uuid, text, text, boolean, text, bytea),
  est_referent_unite(uuid), clore_rapport_conformite(uuid) to authenticated;
