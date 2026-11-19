-- Tableau des 12 conditions du pilote (Jalon 12, étape 4 ; ADR 0078).
--   - Les conditions vérifiables en base (référent, contenus, classe) sont calculées, jamais cochées à la main.
--   - Les autres sont cochées par le propriétaire avec une preuve courte et datée, tracée dans le journal d'audit.
--   - La configuration du serveur (fournisseurs, clé, plafond) est contrôlée par l'application, sans valeur.

create table conditions_pilote (
  numero integer primary key check (numero between 1 and 12 and numero not in (3, 4)),
  preuve text not null check (char_length(preuve) between 3 and 300),
  date_preuve date not null,
  cochee_le timestamptz not null default now(),
  cochee_par text not null
);
alter table conditions_pilote enable row level security;
revoke all on conditions_pilote from public, anon, authenticated;

/** Conditions cochées par le propriétaire (preuve et date). */
create function conditions_pilote_cochees() returns table (numero integer, preuve text, date_preuve date, cochee_le timestamptz)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select c.numero, c.preuve, c.date_preuve, c.cochee_le from conditions_pilote c order by c.numero;
end;
$$;
revoke execute on function conditions_pilote_cochees() from public, anon;
grant execute on function conditions_pilote_cochees() to authenticated;

/**
 * Faits vérifiables en base, en nombres seulement : chapitres du pilote et leur état (dernière version du script
 * et du quiz validée, vidéo publiée), familles de ces chapitres sans référent, classes et enseignants activés.
 */
create function faits_conditions_pilote() returns table (
  chapitres_pilote integer, chapitres_prets integer, chapitres_avec_video integer,
  familles_pilote integer, familles_sans_referent integer, classes integer, classes_avec_enseignant integer
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    with etat as (
      select c.id, c.statut as statut_chapitre, u.referentiel_id, m.famille, s.statut as statut_script,
             q.statut as statut_quiz, v.statut as statut_video
      from chapitres_pilote cp
      join chapitres c on c.id = cp.chapitre_id
      join unites u on u.id = c.unite_id
      join matieres m on m.id = u.matiere_id
      left join lateral (select sc.id, sc.statut from scripts sc where sc.chapitre_id = c.id order by sc.version desc limit 1) s on true
      left join lateral (select qz.statut from quiz qz where qz.chapitre_id = c.id order by qz.version desc limit 1) q on true
      left join lateral (select vi.statut from videos vi where vi.script_id = s.id order by vi.cree_le desc limit 1) v on true
    ), familles as (
      select distinct e.referentiel_id, e.famille from etat e
    )
    select (select count(*)::integer from etat),
           (select count(*)::integer from etat
            where statut_chapitre = 'valide' and statut_script = 'valide' and statut_quiz = 'valide'),
           (select count(*)::integer from etat where statut_video = 'publiee'),
           (select count(*)::integer from familles),
           (select count(*)::integer from familles f
            where not exists (select 1 from referents_familles rf join profils p on p.id = rf.referent_id
                              where rf.referentiel_id = f.referentiel_id and rf.famille = f.famille
                                and p.role = 'referent')),
           (select count(*)::integer from classes),
           (select count(*)::integer from classes cl
            where exists (select 1 from enseignants_classes ec where ec.classe_id = cl.id));
end;
$$;
revoke execute on function faits_conditions_pilote() from public, anon;
grant execute on function faits_conditions_pilote() to authenticated;

/** Coche (ou met à jour) une condition, avec sa preuve. Les conditions 3 et 4 se vérifient seules. Tracé. */
create function cocher_condition_pilote(p_numero integer, p_preuve text, p_date date, p_acteur_empreinte text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_numero is null or p_numero not between 1 and 12 then
    raise exception 'Condition inconnue.' using errcode = '22023';
  end if;
  if p_numero in (3, 4) then
    raise exception 'Cette condition est vérifiée automatiquement : elle ne se coche pas.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_preuve, ''))) not between 3 and 300 then
    raise exception 'Preuve de 3 à 300 caractères.' using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date + 1 then
    raise exception 'Date de la preuve manquante ou dans le futur.' using errcode = '22023';
  end if;
  insert into conditions_pilote (numero, preuve, date_preuve, cochee_par)
  values (p_numero, btrim(p_preuve), p_date, coalesce(p_acteur_empreinte, ''))
  on conflict (numero) do update
    set preuve = excluded.preuve, date_preuve = excluded.date_preuve, cochee_le = now(), cochee_par = excluded.cochee_par;
  insert into journal_audit (acteur, acteur_empreinte, action, details)
  values ('administrateur', p_acteur_empreinte, 'condition_pilote_cochee',
          jsonb_build_object('condition', p_numero, 'date_preuve', p_date));
end;
$$;
revoke execute on function cocher_condition_pilote(integer, text, date, text) from public, anon;
grant execute on function cocher_condition_pilote(integer, text, date, text) to authenticated;

/** Retire la coche d'une condition (preuve retirée ou périmée), avec un motif. Tracé. */
create function decocher_condition_pilote(p_numero integer, p_motif text, p_acteur_empreinte text) returns boolean
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
  delete from conditions_pilote where numero = p_numero;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into journal_audit (acteur, acteur_empreinte, action, details)
    values ('administrateur', p_acteur_empreinte, 'condition_pilote_decochee',
            jsonb_build_object('condition', p_numero, 'motif', btrim(p_motif)));
  end if;
  return v_n > 0;
end;
$$;
revoke execute on function decocher_condition_pilote(integer, text, text) from public, anon;
grant execute on function decocher_condition_pilote(integer, text, text) to authenticated;
