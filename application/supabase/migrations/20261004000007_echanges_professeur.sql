-- Échanges entre l'élève et l'agent Professeur (« messages de la session », prompt maître §5.2).
-- Seul le texte est conservé (pas de raisonnement interne du modèle) ; l'élève relit ses propres échanges.
-- Les écritures passent par le rôle agent_professeur, limité à l'élève connecté et aux chapitres de son unité.

create type auteur_echange as enum ('eleve', 'professeur');

create table echanges_professeur (
  id bigint generated always as identity primary key,
  eleve_id uuid not null references eleves (id) on delete cascade,
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  auteur auteur_echange not null,
  contenu text not null check (char_length(contenu) between 1 and 20000),
  cree_le timestamptz not null default now()
);

create index on echanges_professeur (eleve_id, chapitre_id, id);

alter table echanges_professeur enable row level security;
revoke all on echanges_professeur from anon, authenticated, agent_professeur;

grant select on echanges_professeur to authenticated;
create policy echanges_personnels on echanges_professeur for select to authenticated
  using (eleve_id = auth.uid());

grant select, insert on echanges_professeur to agent_professeur;
create policy echanges_agent_lecture on echanges_professeur for select to agent_professeur
  using (eleve_id = contexte_agent('eleve_id') and chapitre_accessible_agent(chapitre_id));
create policy echanges_agent_insertion on echanges_professeur for insert to agent_professeur
  with check (eleve_id = contexte_agent('eleve_id') and chapitre_accessible_agent(chapitre_id));

-- Le serveur prend le rôle agent_professeur pour les requêtes de l'agent (en plus de anon / authenticated).
grant agent_professeur to serveur_application;
