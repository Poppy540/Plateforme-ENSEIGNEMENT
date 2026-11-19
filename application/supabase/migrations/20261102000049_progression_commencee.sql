-- Chapitre « commencé » (décision D15 a, ADR 0103) : la plateforme note elle-même qu'un élève a commencé un
-- chapitre dès qu'il ouvre la leçon (ou démarre la vidéo) ou passe le quiz. Avant, seul le Professeur IA écrivait
-- la progression, quand l'élève lui posait une question : la vue de l'enseignant affichait « Commencé : 0 » pour
-- une classe qui avait pourtant lu et fait le quiz. Un chapitre terminé ne redevient jamais « en cours ».

/** Interne : « en cours » si rien n'est encore noté (ou « à voir ») ; jamais de retour en arrière. */
create function marquer_chapitre_commence(p_eleve uuid, p_chapitre uuid) returns void
language sql security definer
set search_path = pg_catalog, public
as $$
  insert into progression (eleve_id, chapitre_id, statut)
  values (p_eleve, p_chapitre, 'en_cours')
  on conflict (eleve_id, chapitre_id) do update set statut = 'en_cours', maj_le = now()
  where progression.statut = 'a_voir';
$$;
revoke all on function marquer_chapitre_commence(uuid, uuid) from public, anon, authenticated;

-- Leçon ouverte ou vidéo démarrée : même règles qu'avant (élève actif, chapitre validé, quota), puis « commencé ».
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
  if not exists (select 1 from chapitres where id = p_chapitre and statut = 'valide') then
    return false;
  end if;
  if p_evenement in ('lecon_ouverte', 'video_demarree') then
    perform marquer_chapitre_commence(auth.uid(), p_chapitre);
  end if;
  if not prendre_quota(auth.uid(), 'visionnage', greatest(p_max, 1)) then
    return false;
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

-- Quiz passé : le chapitre du quiz est « commencé » (déclencheur de la plateforme, pas un droit de l'agent).
create function tentatives_quiz_commence() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform marquer_chapitre_commence(new.eleve_id, (select chapitre_id from quiz where id = new.quiz_id));
  return new;
end;
$$;
revoke all on function tentatives_quiz_commence() from public, anon, authenticated;
create trigger tentatives_quiz_commence after insert on tentatives_quiz
  for each row execute function tentatives_quiz_commence();
