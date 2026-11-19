-- Jalon 2, étape 4 : agent Évaluateur (ADR 0024).
-- Une seule tentative notée par élève et par quiz ; contestations tracées ; signalements de l'Évaluateur ;
-- statistiques d'erreurs anonymisées et agrégées pour le référent (jamais de résultat individuel).

-- Notes du quiz pour le référent (composante visée, questions signalées, points à valider) : figées comme le
-- reste du quiz par le déclencheur des contenus versionnés.
alter table quiz add column notes jsonb not null default '{}'::jsonb;
grant insert (notes) on quiz to agent_evaluateur;

-- Le score est écrit une seule fois : une tentative par élève et par quiz.
alter table tentatives_quiz add constraint tentatives_quiz_unique unique (quiz_id, eleve_id);

-- Contestation d'une correction par l'élève (réexamen par l'Évaluateur, puis humain si besoin).
create table contestations_quiz (
  id uuid primary key default gen_random_uuid(),
  tentative_id uuid not null references tentatives_quiz (id) on delete cascade,
  question smallint not null check (question >= 0),
  message text not null check (char_length(message) between 1 and 1000),
  reexamen jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);
create index on contestations_quiz (tentative_id, question);
alter table contestations_quiz enable row level security;
revoke all on contestations_quiz from anon, authenticated, agent_professeur, agent_scenariste,
  agent_production_video, agent_evaluateur;

grant select, insert (tentative_id, question, message, reexamen) on contestations_quiz to agent_evaluateur;
create policy contestations_evaluateur on contestations_quiz for select to agent_evaluateur
  using (exists (select 1 from tentatives_quiz t where t.id = tentative_id and t.eleve_id = contexte_agent('eleve_id')));
create policy contestations_evaluateur_insertion on contestations_quiz for insert to agent_evaluateur
  with check (exists (select 1 from tentatives_quiz t where t.id = tentative_id and t.eleve_id = contexte_agent('eleve_id')));
grant select on contestations_quiz to authenticated;
create policy contestations_personnelles on contestations_quiz for select to authenticated
  using (exists (select 1 from tentatives_quiz t where t.id = tentative_id and t.eleve_id = auth.uid()));

-- Signalements de l'Évaluateur (question ambiguë, erreur possible du quiz, détresse), pour l'élève du contexte.
grant insert on signalements to agent_evaluateur;
create policy signalements_evaluateur on signalements for insert to agent_evaluateur
  with check (
    source = 'agent_evaluateur' and traite_le is null
    and (eleve_id is null or eleve_id = contexte_agent('eleve_id'))
    and (chapitre_id is null or chapitre_de_l_unite_agent(chapitre_id))
  );

/**
 * Statistiques d'erreurs d'un quiz, anonymisées et agrégées, pour un référent de la famille :
 * par question, nombre de tentatives, taux de réussite et répartition des réponses choisies.
 * Rien n'est renvoyé par question tant qu'il y a moins de p_minimum tentatives (pas de déduction individuelle).
 */
create function statistiques_quiz(p_quiz uuid, p_minimum integer default 5)
returns table (question integer, tentatives integer, taux_reussite numeric, repartition jsonb)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_chapitre uuid := (select chapitre_id from quiz where id = p_quiz);
  v_total integer;
begin
  if v_chapitre is null or auth.uid() is null or not est_referent_du_chapitre(v_chapitre) then
    raise exception 'Statistiques réservées aux référents de la famille.' using errcode = '42501';
  end if;
  v_total := (select count(*) from tentatives_quiz where quiz_id = p_quiz);
  if v_total < greatest(p_minimum, 5) then
    return;
  end if;
  return query
  with reponses as (
    select (r ->> 'question')::int as question, r ->> 'choix' as choix, (r ->> 'points')::numeric as points
    from tentatives_quiz t, jsonb_array_elements(t.reponses) r
    where t.quiz_id = p_quiz
  )
  select x.question, count(*)::int, round(avg(x.points) * 100, 0),
    (select coalesce(jsonb_object_agg(coalesce(y.choix, 'texte'), y.n), '{}'::jsonb)
     from (select choix, count(*) as n from reponses z where z.question = x.question group by choix) y)
  from reponses x
  group by x.question
  order by x.question;
end;
$$;
revoke execute on function statistiques_quiz(uuid, integer) from public, anon;
grant execute on function statistiques_quiz(uuid, integer) to authenticated;
