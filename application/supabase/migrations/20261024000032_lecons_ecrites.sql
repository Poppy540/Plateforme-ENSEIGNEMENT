-- Jalon 6, étape 4 (ADR 0051) : leçon écrite d'un chapitre, tirée du script VALIDÉ, pour les élèves qui ne peuvent
-- pas regarder la vidéo. Les élèves ne lisent toujours pas la table des scripts : cette fonction leur sert seulement
-- le texte destiné aux élèves (titres et texte des sections, glossaire, consignes et sécurité des travaux pratiques),
-- jamais les notes au référent (points à vérifier, exemples à valider, idées de questions, indications visuelles).
-- Garde-fous : chapitre validé ; script au statut validé ; contenu inchangé depuis son empreinte ; dernière
-- approbation « valide » portant sur cette version et cette empreinte. Sinon, rien.

create function lecon_du_chapitre(p_chapitre uuid) returns jsonb
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'version', s.version,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('type', x ->> 'type', 'titre', x ->> 'titre', 'texte', x ->> 'texte_parle')
                       order by n)
      from jsonb_array_elements(s.contenu -> 'sections') with ordinality as t (x, n)
    ), '[]'::jsonb),
    'glossaire', coalesce(s.contenu -> 'glossaire', '[]'::jsonb),
    'consignes', coalesce(s.contenu -> 'travaux_pratiques' -> 'consignes', '[]'::jsonb),
    'securite', coalesce(s.contenu -> 'travaux_pratiques' -> 'securite', '[]'::jsonb)
  )
  from scripts s
  join chapitres c on c.id = s.chapitre_id
  join lateral (
    select version, empreinte from approbations
    where objet_type = 'script' and objet_id = s.id and decision = 'valide'
    order by decide_le desc limit 1
  ) a on true
  where c.id = p_chapitre and c.statut = 'valide' and s.statut = 'valide' and auth.uid() is not null
    and s.empreinte = empreinte_jsonb(s.contenu) and a.version = s.version and a.empreinte = s.empreinte
  order by s.version desc
  limit 1
$$;
revoke execute on function lecon_du_chapitre(uuid) from public, anon;
grant execute on function lecon_du_chapitre(uuid) to authenticated;
