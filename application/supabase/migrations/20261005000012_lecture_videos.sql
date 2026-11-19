-- Jalon 2, étape 6 : lecture des vidéos publiées par les élèves (ADR 0026).
-- Les élèves ne lisent ni les scripts ni les rapports de production : une fonction leur sert seulement ce qu'il
-- faut pour regarder la vidéo publiée d'un chapitre validé (référence, durée, versions, sous-titres).

create function videos_publiees_du_chapitre(p_chapitre uuid)
returns table (id uuid, reference text, duree_secondes integer, versions jsonb, sous_titres text, publiee_le timestamptz)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select v.id, v.reference_hebergement, v.duree_secondes,
    coalesce(v.rapport -> 'fichiers' -> 'versions', '[]'::jsonb),
    v.rapport ->> 'sousTitresVtt',
    a.decide_le
  from videos v
  join scripts s on s.id = v.script_id
  join chapitres c on c.id = s.chapitre_id
  join approbations a on a.objet_type = 'publication_video' and a.objet_id = v.id
  where c.id = p_chapitre and c.statut = 'valide' and v.statut = 'publiee' and auth.uid() is not null
  order by a.decide_le desc
$$;
revoke execute on function videos_publiees_du_chapitre(uuid) from public, anon;
grant execute on function videos_publiees_du_chapitre(uuid) to authenticated;
