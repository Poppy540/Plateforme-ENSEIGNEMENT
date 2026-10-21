-- Leçons écrites (Jalon 6, étape 4 ; ADR 0051). Données fictives du pays « xx » (10_donnees_fictives).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select on ids to public;

-- Script fictif du chapitre validé f1, avec des notes au référent qui ne doivent jamais sortir.
insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
values ('00000000-0000-0000-0000-0000000000f1', '{
  "sections": [
    {"type": "accroche", "titre": "Une question", "debut_secondes": 0, "duree_secondes": 30,
     "texte_parle": "Texte fictif de l''accroche.", "indications_visuelles": "NOTE VISUELLE"},
    {"type": "resume", "titre": "À retenir", "debut_secondes": 30, "duree_secondes": 30,
     "texte_parle": "Résumé fictif.", "indications_visuelles": "NOTE VISUELLE"}],
  "glossaire": [{"terme": "Terme", "definition": "Définition fictive"}],
  "travaux_pratiques": {"consignes": ["Consigne fictive"], "materiel": [], "securite": ["Sécurité fictive"]},
  "points_a_verifier": ["NOTE AU REFERENT"], "exemples_locaux_a_valider": ["NOTE AU REFERENT"],
  "idees_questions_controle": ["NOTE AU REFERENT"], "message_au_referent": "NOTE AU REFERENT"
}'::jsonb, 5, 'test')
returning id \gset script_
insert into ids values ('script', :'script_id');

-- B01 Script encore en brouillon : aucune leçon.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert lecon_du_chapitre('00000000-0000-0000-0000-0000000000f1') is null, 'B01 : leçon d''un brouillon';
end $$;
reset role;
\echo OK B01 pas de leçon sans validation

-- B02 Script validé et approuvé (même version, même empreinte) : texte des élèves seulement.
update scripts set statut = 'valide' where id = (select valeur from ids where cle = 'script');
insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
select 'script', id, version, empreinte, 'valide', '33333333-3333-3333-3333-333333333333'
from scripts where id = (select valeur from ids where cle = 'script');
set role authenticated;
do $$
declare l jsonb := lecon_du_chapitre('00000000-0000-0000-0000-0000000000f1');
begin
  assert jsonb_array_length(l -> 'sections') = 2, 'B02 : sections';
  assert l -> 'sections' -> 0 ->> 'texte' = 'Texte fictif de l''accroche.', 'B02 : ordre et texte';
  assert l -> 'securite' ->> 0 = 'Sécurité fictive', 'B02 : sécurité';
  assert l::text not like '%NOTE%', 'B02 : note au référent ou indication visuelle servie';
  assert not exists (select 1 from scripts), 'B02 : script lisible par un élève';
end $$;
reset role;
set role anon;
do $$ begin
  begin perform lecon_du_chapitre('00000000-0000-0000-0000-0000000000f1'); raise exception 'B02 : leçon sans connexion';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo OK B02 leçon tirée du script validé, sans les notes

-- B03 Approbation d'une autre empreinte, ou chapitre repassé à valider : plus de leçon.
update approbations set empreinte = 'autre' where objet_type = 'script' and objet_id = (select valeur from ids where cle = 'script');
set role authenticated;
do $$ begin
  assert lecon_du_chapitre('00000000-0000-0000-0000-0000000000f1') is null, 'B03 : empreinte non vérifiée';
end $$;
reset role;
update approbations set empreinte = (select empreinte from scripts where id = (select valeur from ids where cle = 'script'))
where objet_type = 'script' and objet_id = (select valeur from ids where cle = 'script');
update chapitres set statut = 'a_valider' where id = '00000000-0000-0000-0000-0000000000f1';
set role authenticated;
do $$ begin
  assert lecon_du_chapitre('00000000-0000-0000-0000-0000000000f1') is null, 'B03 : chapitre non validé';
end $$;
reset role;
update chapitres set statut = 'valide' where id = '00000000-0000-0000-0000-0000000000f1';
delete from approbations where objet_type = 'script' and objet_id = (select valeur from ids where cle = 'script');
update scripts set statut = 'rejete' where id = (select valeur from ids where cle = 'script');
\echo OK B03 empreinte et chapitre vérifiés

\o
\echo TOUS LES TESTS DES LEÇONS ÉCRITES SONT PASSÉS
