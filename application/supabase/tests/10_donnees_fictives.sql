-- Données fictives de test (aucune donnée réelle). Pays fictif « xx » (le pack de test « zz » est importé plus loin).
insert into pays (code, nom, langue_enseignement, fuseau_horaire) values ('xx', 'Pays fictif', 'fr', 'UTC');
insert into referentiels (id, code, pays_code, version) values ('00000000-0000-0000-0000-0000000000a1', 'xx-general', 'xx', '0.1');
insert into niveaux (id, referentiel_id, code, libelle, cycle, ordre, code_interne, series_obligatoires) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'n4', 'Niveau 4', 'c1', 4, 's-4', false),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'n7', 'Niveau 7', 'c2', 7, 's-7', true);
insert into series (id, referentiel_id, code, libelle, type, code_interne) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'S1', 'Série 1', 'generale', 'sci');
insert into matieres (id, referentiel_id, code, libelle, famille, couche) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'maths', 'Maths', 'mathematiques', 'adaptable'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a1', 'histoire', 'Histoire', 'histoire-geo-ses', 'local');
insert into unites (id, referentiel_id, code, niveau_id, matiere_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'xx-n4-maths', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'xx-n4-histoire', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2');
insert into chapitres (id, unite_id, code, ordre, titre, sous_themes, statut) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'c1', 1, 'Chapitre validé', '{a,b}', 'valide'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', 'c2', 2, 'Chapitre à valider', '{c}', 'a_valider'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e2', 'h1', 1, 'Histoire validée', '{}', 'valide');

-- Comptes fictifs : élève A, élève B, référent maths R, référent histoire H.
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'), ('44444444-4444-4444-4444-444444444444'),
  ('55555555-5555-5555-5555-555555555555');
insert into profils (id, role, prenom_ou_pseudo) values
  ('11111111-1111-1111-1111-111111111111', 'eleve', 'Élève A'),
  ('22222222-2222-2222-2222-222222222222', 'eleve', 'Élève B'),
  ('33333333-3333-3333-3333-333333333333', 'referent', 'Référent maths'),
  ('44444444-4444-4444-4444-444444444444', 'referent', 'Référent histoire');
insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', false, 'actif'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', false, 'actif');
insert into referents_familles (referent_id, referentiel_id, famille) values
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-0000000000a1', 'mathematiques'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-0000000000a1', 'histoire-geo-ses');
insert into progression (eleve_id, chapitre_id, statut) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f1', 'en_cours'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000f1', 'termine');
