-- Mesures pour le bilan du pilote (Jalon 6, étape 5 ; ADR 0052). Rien n'y identifie un élève ni un parent.
--   1. Compteur de visionnage agrégé : par chapitre et par jour (vidéos démarrées, vidéos vues jusqu'au bout,
--      leçons écrites ouvertes). Aucun identifiant ; quota par élève et par jour contre le gonflement.
--   2. Questionnaire anonyme : questions du pack ; réponses sans compte, datées à la semaine ; « déjà répondu »
--      gardé à part sous forme d'empreinte, sans lien avec les réponses.

-- ---------------------------------------------------------------------------
-- 1. Compteur de visionnage
-- ---------------------------------------------------------------------------
create table visionnages_jour (
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  jour date not null default current_date,
  videos_demarrees integer not null default 0,
  videos_terminees integer not null default 0,
  lecons_ouvertes integer not null default 0,
  primary key (chapitre_id, jour)
);
alter table visionnages_jour enable row level security;
revoke all on visionnages_jour from public, anon, authenticated;

alter table quotas_eleves drop constraint quotas_eleves_nature_check;
alter table quotas_eleves add constraint quotas_eleves_nature_check
  check (nature in ('plan_tuteur', 'correction_quiz', 'contestation_quiz', 'question_parent', 'visionnage'));

/** Un événement de lecture d'un chapitre validé, par un élève connecté (quota par jour). */
create function noter_visionnage(p_chapitre uuid, p_evenement text, p_max integer) returns boolean
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

/** Administration : totaux par chapitre sur une période (le masquage sous 5 est fait à l'affichage et à l'export). */
create function visionnages_par_chapitre(p_jours integer)
returns table (unite text, chapitre text, titre text, videos_demarrees bigint, videos_terminees bigint, lecons_ouvertes bigint)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Administration requise.' using errcode = '42501';
  end if;
  return query
  select u.code, c.code, c.titre, sum(v.videos_demarrees), sum(v.videos_terminees), sum(v.lecons_ouvertes)
  from visionnages_jour v join chapitres c on c.id = v.chapitre_id join unites u on u.id = c.unite_id
  where v.jour > current_date - least(greatest(p_jours, 1), 366)
  group by u.code, c.code, c.titre, c.ordre
  order by u.code, c.ordre;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Questionnaire anonyme
-- ---------------------------------------------------------------------------
create table questionnaires (
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 40),
  statut text not null check (statut in ('a_valider', 'valide')),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  primary key (referentiel_id, version)
);
alter table questionnaires enable row level security;
revoke all on questionnaires from public, anon, authenticated;

-- Réponses : ni compte, ni contact, ni heure ; la semaine seulement.
create table reponses_questionnaire (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null,
  version text not null,
  public text not null check (public in ('eleve', 'parent')),
  semaine date not null default date_trunc('week', now())::date,
  reponses jsonb not null check (jsonb_typeof(reponses) = 'object'),
  foreign key (referentiel_id, version) references questionnaires (referentiel_id, version) on delete cascade
);
alter table reponses_questionnaire enable row level security;
revoke all on reponses_questionnaire from public, anon, authenticated;

-- « Déjà répondu » : empreinte (public, personne ou accord, version), sans lien avec la réponse.
create table questionnaires_remplis (empreinte text primary key);
alter table questionnaires_remplis enable row level security;
revoke all on questionnaires_remplis from public, anon, authenticated;

/** Une version déjà répondue ne change plus : une nouvelle version du questionnaire s'impose. */
create function questionnaires_figes() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.questions is distinct from old.questions
     and exists (select 1 from reponses_questionnaire r where r.referentiel_id = old.referentiel_id and r.version = old.version) then
    raise exception 'Questionnaire déjà répondu : créez une nouvelle version.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger questionnaires_figes before update on questionnaires
  for each row execute function questionnaires_figes();

/** Questions validées pour ce public dans ce référentiel (dernière version validée), avec l'empreinte « rempli ». */
create function questionnaire_ouvert(p_referentiel uuid, p_public text)
returns table (version text, questions jsonb)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select q.version, coalesce((select jsonb_agg(x) from jsonb_array_elements(q.questions) x where x ->> 'public' = p_public), '[]')
  from questionnaires q
  where q.referentiel_id = p_referentiel and q.statut = 'valide'
  order by q.version desc limit 1
$$;

/** Les réponses correspondent aux questions de ce public (chaque question, une option permise, rien d'autre). */
create function reponses_valides(p_questions jsonb, p_reponses jsonb) returns boolean
language sql immutable
set search_path = pg_catalog, public
as $$
  select jsonb_typeof(p_reponses) = 'object'
    and jsonb_array_length(p_questions) > 0
    and (select count(*) from jsonb_object_keys(p_reponses)) = jsonb_array_length(p_questions)
    and not exists (
      select 1 from jsonb_array_elements(p_questions) q
      where not (p_reponses ? (q ->> 'id'))
         or jsonb_typeof(p_reponses -> (q ->> 'id')) <> 'string'
         or not ((q -> 'options') ? (p_reponses ->> (q ->> 'id')))
    )
$$;

create function enregistrer_reponses(p_referentiel uuid, p_public text, p_cle text, p_reponses jsonb) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_version text; v_questions jsonb;
begin
  select version, questions into v_version, v_questions from questionnaire_ouvert(p_referentiel, p_public);
  if v_version is null then return false; end if;
  if not reponses_valides(v_questions, p_reponses) then
    raise exception 'Réponses incomplètes ou invalides.' using errcode = '22023';
  end if;
  insert into questionnaires_remplis (empreinte)
  values (encode(sha256(convert_to(p_public || ':' || p_cle || ':' || p_referentiel || ':' || v_version, 'UTF8')), 'hex'))
  on conflict do nothing;
  if not found then return false; end if;
  insert into reponses_questionnaire (referentiel_id, version, public, reponses)
  values (p_referentiel, v_version, p_public, p_reponses);
  return true;
end;
$$;

/** Élève actif : questionnaire de son référentiel, une fois par version. */
create function repondre_questionnaire_eleve(p_reponses jsonb) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_referentiel uuid;
begin
  select referentiel_id into v_referentiel from eleves where id = auth.uid() and statut = 'actif';
  if v_referentiel is null then
    raise exception 'Élève actif requis.' using errcode = '42501';
  end if;
  return enregistrer_reponses(v_referentiel, 'eleve', auth.uid()::text, p_reponses);
end;
$$;

/** Élève actif : questionnaire à remplir ? (null si aucun ou déjà rempli). */
create function questionnaire_pour_eleve() returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare v_referentiel uuid; v_version text; v_questions jsonb;
begin
  select referentiel_id into v_referentiel from eleves where id = auth.uid() and statut = 'actif';
  if v_referentiel is null then return null; end if;
  select version, questions into v_version, v_questions from questionnaire_ouvert(v_referentiel, 'eleve');
  if v_version is null or jsonb_array_length(v_questions) = 0 or exists (
    select 1 from questionnaires_remplis where empreinte = encode(sha256(convert_to(
      'eleve:' || auth.uid()::text || ':' || v_referentiel || ':' || v_version, 'UTF8')), 'hex')) then
    return null;
  end if;
  return jsonb_build_object('version', v_version, 'questions', v_questions);
end;
$$;

/** Parent, depuis le lien d'un rapport (accord actif, lien de moins de 60 jours) : une fois par accord et version. */
create function accord_du_jeton_parent(p_jeton text) returns table (consentement uuid, referentiel uuid)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id, e.referentiel_id
  from rapports_parents r join consentements c on c.id = r.consentement_id join eleves e on e.id = r.eleve_id
  where r.empreinte_jeton = empreinte_jeton(p_jeton) and c.accorde_le is not null and c.revoque_le is null
    and coalesce(r.envoye_le, r.cree_le) > now() - interval '60 days'
  limit 1
$$;

create function questionnaire_pour_parent(p_jeton text) returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare a record; v_version text; v_questions jsonb;
begin
  select * into a from accord_du_jeton_parent(p_jeton);
  if a.consentement is null then return null; end if;
  select version, questions into v_version, v_questions from questionnaire_ouvert(a.referentiel, 'parent');
  if v_version is null or jsonb_array_length(v_questions) = 0 or exists (
    select 1 from questionnaires_remplis where empreinte = encode(sha256(convert_to(
      'parent:' || a.consentement::text || ':' || a.referentiel || ':' || v_version, 'UTF8')), 'hex')) then
    return null;
  end if;
  return jsonb_build_object('version', v_version, 'questions', v_questions);
end;
$$;

create function repondre_questionnaire_parent(p_jeton text, p_reponses jsonb) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare a record;
begin
  select * into a from accord_du_jeton_parent(p_jeton);
  if a.consentement is null then
    raise exception 'Lien invalide.' using errcode = '42501';
  end if;
  return enregistrer_reponses(a.referentiel, 'parent', a.consentement::text, p_reponses);
end;
$$;

/** Administration : nombre de réponses par question et par option (masquage sous 5 à l'affichage et à l'export). */
create function resultats_questionnaires()
returns table (referentiel text, version text, public text, question text, texte text, option text, nombre bigint, total bigint)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Administration requise.' using errcode = '42501';
  end if;
  return query
  with totaux as (
    select referentiel_id, r.version, r.public, count(*) as total from reponses_questionnaire r
    group by referentiel_id, r.version, r.public
  )
  select ref.code, r.version, r.public, k.key,
    (select x ->> 'texte' from jsonb_array_elements(qn.questions) x where x ->> 'id' = k.key limit 1),
    k.value, count(*), t.total
  from reponses_questionnaire r
  cross join lateral jsonb_each_text(r.reponses) k
  join totaux t on t.referentiel_id = r.referentiel_id and t.version = r.version and t.public = r.public
  join referentiels ref on ref.id = r.referentiel_id
  join questionnaires qn on qn.referentiel_id = r.referentiel_id and qn.version = r.version
  group by ref.code, r.version, r.public, k.key, qn.questions, k.value, t.total
  order by ref.code, r.version, r.public, k.key, k.value;
end;
$$;

revoke execute on function noter_visionnage(uuid, text, integer), visionnages_par_chapitre(integer),
  questionnaires_figes(), questionnaire_ouvert(uuid, text), reponses_valides(jsonb, jsonb),
  enregistrer_reponses(uuid, text, text, jsonb), repondre_questionnaire_eleve(jsonb), questionnaire_pour_eleve(),
  accord_du_jeton_parent(text), questionnaire_pour_parent(text), repondre_questionnaire_parent(text, jsonb),
  resultats_questionnaires() from public, anon, authenticated;
grant execute on function noter_visionnage(uuid, text, integer), visionnages_par_chapitre(integer),
  repondre_questionnaire_eleve(jsonb), questionnaire_pour_eleve(), resultats_questionnaires() to authenticated;
-- Les parents n'ont pas de compte : leur lien (jeton) suffit, comme pour lire le rapport.
grant execute on function questionnaire_pour_parent(text), repondre_questionnaire_parent(text, jsonb) to anon;
