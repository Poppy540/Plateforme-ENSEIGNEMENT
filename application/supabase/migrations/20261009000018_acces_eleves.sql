-- Jalon 3, préparation du pilote : interrupteur d'accès des élèves (ADR 0034).
-- Une seule ligne. Fermé : les pages élève, l'assistant d'aide et l'inscription affichent un message neutre ;
-- « Mes données » (télécharger, supprimer) reste accessible. Seule l'administration le modifie.

create table acces_eleves (
  id boolean primary key default true check (id),
  ouvert boolean not null default true,
  motif text check (char_length(motif) <= 500),
  maj_le timestamptz not null default now(),
  maj_par uuid references profils (id) on delete set null
);
insert into acces_eleves (id) values (true);

alter table acces_eleves enable row level security;
revoke all on acces_eleves from public, anon, authenticated;
grant select (ouvert) on acces_eleves to anon;
grant select on acces_eleves to authenticated;
create policy acces_eleves_lecture_visiteur on acces_eleves for select to anon using (true);
create policy acces_eleves_lecture on acces_eleves for select to authenticated using (true);
grant update (ouvert, motif, maj_le, maj_par) on acces_eleves to authenticated;
create policy acces_eleves_administration on acces_eleves for update to authenticated
  using (role_courant() = 'administrateur')
  with check (role_courant() = 'administrateur' and maj_par = auth.uid());
