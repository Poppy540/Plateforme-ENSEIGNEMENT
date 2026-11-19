-- Chapitres du pilote et accueil du premier référent (Jalon 11, étape 1 ; ADR 0070).
--   - Le propriétaire désigne, dans l'administration, les chapitres du pilote (jamais écrits dans le code).
--   - Le référent les voit en tête de son espace, avec l'état de chaque contenu ; il voit aussi une page d'accueil
--     à sa première connexion.

create table chapitres_pilote (
  chapitre_id uuid primary key references chapitres (id) on delete cascade,
  ajoute_le timestamptz not null default now()
);
alter table chapitres_pilote enable row level security;
revoke all on chapitres_pilote from public, anon, authenticated;

alter table profils add column accueil_vu_le timestamptz;

/** Unités proposées dans l'administration (code et libellés), pour choisir les chapitres du pilote. */
create function unites_pour_pilote() returns table (unite text, niveau text, matiere text, pilote integer)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select u.code, n.libelle, m.libelle,
           (select count(*)::integer from chapitres_pilote cp join chapitres c on c.id = cp.chapitre_id
            where c.unite_id = u.id)
    from unites u join niveaux n on n.id = u.niveau_id join matieres m on m.id = u.matiere_id
    order by n.ordre, m.libelle, u.code;
end;
$$;
revoke execute on function unites_pour_pilote() from public, anon;
grant execute on function unites_pour_pilote() to authenticated;

/** Chapitres d'une unité, avec leur appartenance au pilote. */
create function chapitres_unite_pilote(p_unite text) returns table (code text, titre text, ordre integer, pilote boolean)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select c.code, c.titre, c.ordre, exists (select 1 from chapitres_pilote cp where cp.chapitre_id = c.id)
    from chapitres c join unites u on u.id = c.unite_id
    where u.code = p_unite
    order by c.ordre;
end;
$$;
revoke execute on function chapitres_unite_pilote(text) from public, anon;
grant execute on function chapitres_unite_pilote(text) to authenticated;

/** Remplace les chapitres du pilote d'une unité (codes de chapitres ; 10 au plus par unité). Tracé. */
create function definir_chapitres_pilote(p_unite text, p_chapitres text[], p_acteur_empreinte text) returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_unite uuid;
  v_inconnus text[];
  v_n integer;
begin
  perform verifier_administrateur();
  select id into v_unite from unites where code = p_unite;
  if v_unite is null then
    raise exception 'Unité inconnue.' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_chapitres), 0) > 10 then
    raise exception 'Dix chapitres au plus par unité pour le pilote.' using errcode = '22023';
  end if;
  select array_agg(x) into v_inconnus from unnest(coalesce(p_chapitres, '{}')) x
  where not exists (select 1 from chapitres c where c.unite_id = v_unite and c.code = x);
  if v_inconnus is not null then
    raise exception 'Chapitre inconnu dans cette unité : %.', array_to_string(v_inconnus, ', ') using errcode = '22023';
  end if;
  delete from chapitres_pilote where chapitre_id in (select id from chapitres where unite_id = v_unite);
  insert into chapitres_pilote (chapitre_id)
  select c.id from chapitres c where c.unite_id = v_unite and c.code = any(coalesce(p_chapitres, '{}'));
  get diagnostics v_n = row_count;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'chapitres_pilote', 'unite', v_unite,
          jsonb_build_object('unite', p_unite, 'chapitres', coalesce(p_chapitres, '{}')));
  return v_n;
end;
$$;
revoke execute on function definir_chapitres_pilote(text, text[], text) from public, anon;
grant execute on function definir_chapitres_pilote(text, text[], text) to authenticated;

/**
 * Chapitres du pilote des familles du référent connecté, avec l'état de chaque contenu (dernière version) :
 * chapitre, liens de prérequis à décider, script, quiz, vidéo. La prochaine action est déduite par le serveur.
 */
create function etat_chapitres_pilote() returns table (
  chapitre_id uuid, unite text, titre text, ordre integer, statut_chapitre text, liens_a_decider integer,
  script_id uuid, statut_script text, quiz_id uuid, statut_quiz text, video_id uuid, statut_video text
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if not est_referent() then
    raise exception 'Réservé aux enseignants-référents.' using errcode = '42501';
  end if;
  return query
    select c.id, u.code, c.titre, c.ordre, c.statut::text,
           (select count(*)::integer from prerequis_chapitres p
            where (p.chapitre_id = c.id or p.prerequis_id = c.id) and p.statut = 'a_valider'),
           s.id, s.statut::text, q.id, q.statut::text, v.id, v.statut::text
    from chapitres_pilote cp
    join chapitres c on c.id = cp.chapitre_id
    join unites u on u.id = c.unite_id
    join matieres m on m.id = u.matiere_id
    left join lateral (select sc.id, sc.statut from scripts sc where sc.chapitre_id = c.id order by sc.version desc limit 1) s on true
    left join lateral (select qz.id, qz.statut from quiz qz where qz.chapitre_id = c.id order by qz.version desc limit 1) q on true
    left join lateral (select vi.id, vi.statut from videos vi where vi.script_id = s.id order by vi.cree_le desc limit 1) v on true
    where exists (select 1 from referents_familles rf
                  where rf.referent_id = auth.uid() and rf.referentiel_id = u.referentiel_id and rf.famille = m.famille)
    order by u.code, c.ordre;
end;
$$;
revoke execute on function etat_chapitres_pilote() from public, anon;
grant execute on function etat_chapitres_pilote() to authenticated;

create function marquer_accueil_vu() returns void
language sql security definer
set search_path = pg_catalog, public
as $$ update profils set accueil_vu_le = coalesce(accueil_vu_le, now()) where id = auth.uid() $$;
revoke execute on function marquer_accueil_vu() from public, anon;
grant execute on function marquer_accueil_vu() to authenticated;
