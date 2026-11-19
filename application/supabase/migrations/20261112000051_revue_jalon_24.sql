-- Corrections de la revue du Jalon 24 (docs/securite/revue-jalon-24.md ; ADR 0120).
--   S13 : « commencé » n'est noté que pour un chapitre du pays (référentiel) de l'élève, et après le quota ;
--         un chapitre d'un autre pays n'est ni noté ni compté.
--   S18 : la place dans une classe pleine se décide sous verrou (deux élèves simultanés ne dépassent plus la capacité).
--   S20 : le mot du pays pour les séries est borné en longueur.
-- « create or replace » : les droits d'exécution d'origine sont conservés.

create or replace function noter_visionnage(p_chapitre uuid, p_evenement text, p_max integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not exists (select 1 from eleves where id = auth.uid() and statut = 'actif') then
    raise exception 'Élève connecté requis.' using errcode = '42501';
  end if;
  if p_evenement not in ('video_demarree', 'video_terminee', 'lecon_ouverte') then
    raise exception 'Événement inconnu.' using errcode = '22023';
  end if;
  -- Chapitre validé du pays de l'élève (toutes classes : il peut y revoir un prérequis), sinon rien n'est noté.
  if not exists (select 1 from chapitres c join unites u on u.id = c.unite_id
                 join eleves e on e.id = auth.uid()
                 where c.id = p_chapitre and c.statut = 'valide' and u.referentiel_id = e.referentiel_id) then
    return false;
  end if;
  if not prendre_quota(auth.uid(), 'visionnage', greatest(p_max, 1)) then
    return false;
  end if;
  if p_evenement in ('lecon_ouverte', 'video_demarree') then
    perform marquer_chapitre_commence(auth.uid(), p_chapitre);
  end if;
  insert into visionnages_jour (chapitre_id, videos_demarrees, videos_terminees, lecons_ouvertes)
  values (p_chapitre, (p_evenement = 'video_demarree')::int, (p_evenement = 'video_terminee')::int,
          (p_evenement = 'lecon_ouverte')::int)
  on conflict (chapitre_id, jour) do update set
    videos_demarrees = visionnages_jour.videos_demarrees + excluded.videos_demarrees,
    videos_terminees = visionnages_jour.videos_terminees + excluded.videos_terminees,
    lecons_ouvertes = visionnages_jour.lecons_ouvertes + excluded.lecons_ouvertes;
  return true;
end;
$$;

create or replace function rejoindre_classe(p_code text) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_eleve eleves%rowtype;
  v_classe classes%rowtype;
  v_resume text;
begin
  select * into v_eleve from eleves where id = auth.uid();
  if v_eleve.id is null then
    raise exception 'Réservé aux élèves inscrits.' using errcode = '42501';
  end if;
  select * into v_classe from classes
  where empreinte_code = empreinte_code_saisi(p_code) and code_expire_le > now()
  for update;  -- S18 : la dernière place se décide sous verrou
  if v_classe.id is null then
    raise exception 'Code de classe inconnu ou expiré.' using errcode = '22023';
  end if;
  if v_classe.referentiel_id <> v_eleve.referentiel_id or v_classe.niveau_id <> v_eleve.niveau_id
     or (v_classe.serie_id is not null and v_classe.serie_id is distinct from v_eleve.serie_id) then
    raise exception 'Ce code correspond à une autre classe que la tienne.' using errcode = '22023';
  end if;
  if v_eleve.classe_id is distinct from v_classe.id and v_classe.capacite is not null
     and (select count(*) from eleves e where e.classe_id = v_classe.id) >= v_classe.capacite then
    v_resume := format('Classe « %s » (%s) complète : un élève a essayé de la rejoindre (capacité %s). '
                       'Donner un nouveau code de classe ou revoir la capacité.',
                       v_classe.nom, v_classe.etablissement, v_classe.capacite);
    if not exists (select 1 from signalements where source = 'plateforme' and resume = v_resume
                   and traite_le is null) then
      insert into signalements (source, motif, priorite, resume) values ('plateforme', 'autre', 2, v_resume);
    end if;
    return null;
  end if;
  update eleves set classe_id = v_classe.id where id = v_eleve.id;
  return v_classe.nom;
end;
$$;

alter table referentiels
  add constraint referentiels_appellation_longueur
    check ((appellation_serie is null or char_length(appellation_serie) between 1 and 40)
       and (appellation_series is null or char_length(appellation_series) between 1 and 40));
