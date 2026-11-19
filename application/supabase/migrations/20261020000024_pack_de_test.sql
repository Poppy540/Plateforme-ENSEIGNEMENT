-- Jalon 4, étape 5 : statut « test » pour un pack fictif d'essai de portabilité (ADR 0041). Un pack « test »
-- n'est importé qu'avec l'option --test du générateur (tests et base locale), jamais en production.
alter table pays drop constraint pays_statut_pack_check;
alter table pays add constraint pays_statut_pack_check
  check (statut_pack in ('en_preparation', 'pilote', 'ouvert', 'test'));
