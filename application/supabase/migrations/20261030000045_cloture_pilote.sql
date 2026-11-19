-- Clôture du pilote (Jalon 14, étape 2 ; ADR 0085).
--   - Gestes de clôture vérifiés par la plateforme quand la base le permet (période terminée, rapport de fin
--     téléchargé, décision finale notée, mise en veille en cas d'arrêt), sinon cochés avec une preuve datée.
--   - La décision finale (arrêter, prolonger, élargir) est une entrée du journal du pilote.
--   Rien n'est supprimé ici.

alter type type_decision_pilote add value if not exists 'decision_finale';

create table gestes_cloture (
  geste text primary key check (geste in (
    'questionnaires_fin', 'reunion_bilan', 'familles_informees', 'derniere_sauvegarde')),
  preuve text not null check (char_length(preuve) between 3 and 300),
  date_preuve date not null,
  cochee_le timestamptz not null default now(),
  cochee_par text not null
);
alter table gestes_cloture enable row level security;
revoke all on gestes_cloture from public, anon, authenticated;

/** Gestes cochés par le propriétaire (preuve et date). */
create function gestes_cloture_coches() returns table (geste text, preuve text, date_preuve date)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select g.geste, g.preuve, g.date_preuve from gestes_cloture g order by g.geste;
end;
$$;
revoke execute on function gestes_cloture_coches() from public, anon;
grant execute on function gestes_cloture_coches() to authenticated;

/** Coche (ou met à jour) un geste, avec sa preuve. Les gestes vérifiés par la plateforme ne se cochent pas. */
create function cocher_geste_cloture(p_geste text, p_preuve text, p_date date, p_acteur_empreinte text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if char_length(btrim(coalesce(p_preuve, ''))) not between 3 and 300 then
    raise exception 'Preuve de 3 à 300 caractères.' using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date + 1 then
    raise exception 'Date de la preuve manquante ou dans le futur.' using errcode = '22023';
  end if;
  begin
    insert into gestes_cloture (geste, preuve, date_preuve, cochee_par)
    values (p_geste, btrim(p_preuve), p_date, coalesce(p_acteur_empreinte, ''))
    on conflict (geste) do update
      set preuve = excluded.preuve, date_preuve = excluded.date_preuve, cochee_le = now(),
          cochee_par = excluded.cochee_par;
  exception when check_violation then
    raise exception 'Geste inconnu ou vérifié par la plateforme.' using errcode = '22023';
  end;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
  values ('administrateur', p_acteur_empreinte, 'geste_cloture_coche', 'pilote',
          jsonb_build_object('geste', p_geste, 'date_preuve', p_date));
end;
$$;
revoke execute on function cocher_geste_cloture(text, text, date, text) from public, anon;
grant execute on function cocher_geste_cloture(text, text, date, text) to authenticated;

create function decocher_geste_cloture(p_geste text, p_motif text, p_acteur_empreinte text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_n integer;
begin
  perform verifier_administrateur();
  if char_length(btrim(coalesce(p_motif, ''))) not between 3 and 300 then
    raise exception 'Motif de 3 à 300 caractères.' using errcode = '22023';
  end if;
  delete from gestes_cloture where geste = p_geste;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
    values ('administrateur', p_acteur_empreinte, 'geste_cloture_decoche', 'pilote',
            jsonb_build_object('geste', p_geste, 'motif', btrim(p_motif)));
  end if;
  return v_n > 0;
end;
$$;
revoke execute on function decocher_geste_cloture(text, text, text) from public, anon;
grant execute on function decocher_geste_cloture(text, text, text) to authenticated;

/** Décision finale du propriétaire : arrêter, prolonger ou élargir le pilote, avec un motif ; notée au journal. */
create function noter_decision_finale(p_decision text, p_motif text, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_libelle text;
begin
  perform verifier_administrateur();
  v_libelle := case p_decision when 'arreter' then 'Arrêter le pilote' when 'prolonger' then 'Prolonger le pilote'
                                when 'elargir' then 'Élargir le pilote' end;
  if v_libelle is null then
    raise exception 'Décision inconnue : arrêter, prolonger ou élargir.' using errcode = '22023';
  end if;
  perform noter_decision_pilote('decision_finale', null, null,
    v_libelle || ' : ' || controler_texte_pilote(p_motif, 'Motif', 400), null, null, p_acteur_empreinte);
end;
$$;
revoke execute on function noter_decision_finale(text, text, text) from public, anon;
grant execute on function noter_decision_finale(text, text, text) to authenticated;

/** Le téléchargement du rapport de fin est noté (geste de clôture vérifié par la plateforme). */
create function noter_rapport_fin_telecharge(p_version text, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
  values ('administrateur', p_acteur_empreinte, 'rapport_fin_telecharge', 'pilote',
          jsonb_build_object('version', case when p_version = 'etablissement' then 'etablissement' else 'equipe' end));
end;
$$;
revoke execute on function noter_rapport_fin_telecharge(text, text) from public, anon;
grant execute on function noter_rapport_fin_telecharge(text, text) to authenticated;

/**
 * Faits de la clôture : période (fin passée ?), téléchargements du rapport de fin depuis la fin du pilote,
 * dernière décision finale, accès des élèves et agents suspendus (mise en veille en cas d'arrêt).
 */
create function faits_cloture() returns table (
  periode_debut date, periode_fin date, rapports_telecharges integer, decision text, decision_le timestamptz,
  acces_eleves_ouvert boolean, agents_suspendus text[]
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select p.debut, p.fin,
      (select count(*)::int from journal_audit a
       where a.action = 'rapport_fin_telecharge' and p.fin is not null and a.cree_le >= p.fin::timestamptz),
      (select j.texte from journal_pilote j where j.type = 'decision_finale' order by j.cree_le desc, j.id desc limit 1),
      (select j.cree_le from journal_pilote j where j.type = 'decision_finale' order by j.cree_le desc, j.id desc limit 1),
      coalesce((select ouvert from acces_eleves), true),
      coalesce((select array_agg(agent order by agent) from etat_agents where suspendu), '{}')
    from (select true) x left join periode_pilote p on true;
end;
$$;
revoke execute on function faits_cloture() from public, anon;
grant execute on function faits_cloture() to authenticated;
