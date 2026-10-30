-- Garde-fous automatiques (revue de sécurité du Jalon 16 ; ADR 0092). Toute migration future qui oublie une
-- règle fait échouer ces tests : search_path fixé, aucune fonction privilégiée ouverte à public, liste blanche des
-- fonctions et tables ouvertes au visiteur (anon), sécurité au niveau des lignes partout.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- GF01 Fonctions security definer : search_path fixé, aucun droit pour public.
do $$ declare v text; begin
  select string_agg(p.proname, ', ' order by p.proname) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if v is not null then raise exception 'GF01 : security definer sans search_path : %', v; end if;

  select string_agg(p.proname, ', ' order by p.proname) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a
                                     where a.grantee = 0 and a.privilege_type = 'EXECUTE'));
  if v is not null then raise exception 'GF01 : security definer exécutable par public : %', v; end if;
end $$;

-- GF02 Fonctions privilégiées ouvertes au visiteur : seulement la liste blanche justifiée (liens des parents à jeton,
-- connexion et session, rôle courant, catalogue et indicatifs, déclencheurs de lecture du catalogue).
do $$ declare v text; begin
  select string_agg(p.proname, ', ' order by p.proname) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in (
      'accepter_rapports_parents', 'arreter_rapports_parents', 'confirmer_consentement_parent',
      'prendre_quota_parent', 'questionnaire_pour_parent', 'rapport_par_jeton', 'repondre_questionnaire_parent',
      'limiter_connexion', 'rendre_essai_connexion', 'session_active', 'role_courant',
      'est_referent', 'est_referent_du_chapitre', 'indicatifs_autorises');
  if v is not null then raise exception 'GF02 : fonction privilégiée ouverte au visiteur hors liste blanche : %', v; end if;
end $$;

-- GF03 Sécurité au niveau des lignes sur toutes les tables ; le visiteur ne lit que le catalogue.
do $$ declare v text; begin
  select string_agg(c.relname, ', ' order by c.relname) into v
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v is not null then raise exception 'GF03 : table sans sécurité au niveau des lignes : %', v; end if;

  select string_agg(distinct table_name || ' (' || privilege_type || ')', ', ') into v
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public'
    and (privilege_type <> 'SELECT' or table_name not in (
      'pays', 'referentiels', 'niveaux', 'series', 'matieres', 'unites', 'unites_series', 'chapitres',
      'prerequis_chapitres'));
  if v is not null then raise exception 'GF03 : droit du visiteur hors catalogue : %', v; end if;
end $$;

\o
\echo 'OK GF01 fonctions privilégiées : search_path fixé, rien pour public'
\echo 'OK GF02 fonctions ouvertes au visiteur : liste blanche seulement'
\echo 'OK GF03 sécurité au niveau des lignes partout ; le visiteur ne lit que le catalogue'
