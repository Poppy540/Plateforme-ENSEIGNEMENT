-- Conservation étendue (Jalon 6, étape 1 ; revue de sécurité D2 et D3 ; ADR 0049). Le mécanisme est prêt ; les
-- durées restent à null dans le pack (rien n'est effacé) tant que le juriste ne les a pas fixées.

-- Pays de rattachement noté à la création (l'élève ou le compte peut disparaître ensuite) : la purge d'un pays
-- retrouve ainsi ses signalements et tickets, même après la suppression du compte.
alter table signalements add column pays_code text references pays (code);
alter table tickets_support add column pays_code text references pays (code);

create function pays_d_un_eleve(p_eleve uuid) returns text
language sql stable security definer
set search_path = pg_catalog, public
as $$ select r.pays_code from eleves e join referentiels r on r.id = e.referentiel_id where e.id = p_eleve $$;

create function pays_d_un_chapitre(p_chapitre uuid) returns text
language sql stable security definer
set search_path = pg_catalog, public
as $$ select r.pays_code from chapitres c join unites u on u.id = c.unite_id join referentiels r on r.id = u.referentiel_id
      where c.id = p_chapitre $$;

create function signalements_pays() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  new.pays_code := coalesce(pays_d_un_eleve(new.eleve_id), pays_d_un_chapitre(new.chapitre_id));
  return new;
end;
$$;
create trigger signalements_pays before insert on signalements
  for each row execute function signalements_pays();

create function tickets_pays() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  new.pays_code := pays_d_un_eleve(new.demandeur_id);
  return new;
end;
$$;
create trigger tickets_pays before insert on tickets_support
  for each row execute function tickets_pays();

update signalements set pays_code = coalesce(pays_d_un_eleve(eleve_id), pays_d_un_chapitre(chapitre_id));
update tickets_support set pays_code = pays_d_un_eleve(demandeur_id);

-- D2 Résumés à la suppression d'un compte : « effacer » (pack pays) remplace le résumé rédigé par l'agent ; par
-- défaut (« garder » ou null), le résumé reste, détaché du compte, comme avant.
create function profils_avant_suppression() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_pays text := pays_d_un_eleve(old.id);
begin
  if v_pays is not null
     and (select conservation ->> 'resumes_apres_suppression' from pays where code = v_pays) = 'effacer' then
    update signalements set resume = '(résumé effacé à la suppression du compte)' where eleve_id = old.id;
    update tickets_support set resume = '(résumé effacé à la suppression du compte)' where demandeur_id = old.id;
  end if;
  return old;
end;
$$;
create trigger profils_avant_suppression before delete on profils
  for each row execute function profils_avant_suppression();

-- D3 Purge étendue, par pays, selon les durées du pack (null = rien n'est effacé). Ne touche jamais un
-- signalement ou un ticket non traité, ni la liste d'opposition.
create function purger_donnees_etendues(p_pays text) returns table (categorie text, nombre integer)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_conservation jsonb := (select conservation from pays where code = p_pays);
  v_jours integer;
  v_n integer;
begin
  if v_conservation is null then
    raise exception 'Pays inconnu : %', p_pays using errcode = '22023';
  end if;

  v_jours := (v_conservation ->> 'signalements_traites_jours')::int;
  if v_jours is not null then
    with effaces as (
      delete from signalements s
      where s.pays_code = p_pays and s.traite_le < now() - make_interval(days => v_jours) returning id
    ), alertes as (
      delete from alertes_veille a using effaces e where a.objet_type = 'signalement' and a.objet_id = e.id
    ) select count(*)::int into v_n from effaces;
    categorie := 'signalements traités'; nombre := v_n; return next;
  end if;

  v_jours := (v_conservation ->> 'tickets_resolus_jours')::int;
  if v_jours is not null then
    with effaces as (
      delete from tickets_support t
      where t.pays_code = p_pays and t.statut = 'resolu' and t.traite_le < now() - make_interval(days => v_jours)
      returning id
    ), alertes as (
      delete from alertes_veille a using effaces e where a.objet_type = 'ticket' and a.objet_id = e.id
    ) select count(*)::int into v_n from effaces;
    categorie := 'tickets résolus'; nombre := v_n; return next;
  end if;

  v_jours := (v_conservation ->> 'recrutement_clos_jours')::int;
  if v_jours is not null then
    -- Fiche, messages et dossiers d'accord ; l'empreinte de la liste d'opposition reste.
    delete from candidats c using referentiels r
    where r.id = c.referentiel_id and r.pays_code = p_pays
      and c.statut in ('refus', 'suppression_demandee') and c.maj_le < now() - make_interval(days => v_jours);
    get diagnostics v_n = row_count;
    categorie := 'candidats clos'; nombre := v_n; return next;
  end if;

  v_jours := (v_conservation ->> 'rapports_parents_jours')::int;
  if v_jours is not null then
    delete from rapports_parents rp using eleves e, referentiels r
    where rp.eleve_id = e.id and r.id = e.referentiel_id and r.pays_code = p_pays
      and rp.cree_le < now() - make_interval(days => v_jours);
    get diagnostics v_n = row_count;
    categorie := 'rapports aux parents'; nombre := v_n; return next;
  end if;

  -- Sessions expirées ou révoquées depuis plus d'un jour (aucune durée à fixer : elles ne servent plus).
  delete from sessions_ouvertes where coalesce(revoquee_le, expire_le) < now() - interval '1 day';
  get diagnostics v_n = row_count;
  categorie := 'sessions closes'; nombre := v_n; return next;
end;
$$;

revoke execute on function pays_d_un_eleve(uuid), pays_d_un_chapitre(uuid), signalements_pays(), tickets_pays(),
  profils_avant_suppression(), purger_donnees_etendues(text) from public, anon, authenticated;
-- purger_donnees_etendues : réservée à l'administration (connexion d'administration), jamais aux agents.
