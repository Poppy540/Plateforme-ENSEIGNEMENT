-- Classes du pilote créées et gérées depuis l'administration (Jalon 10, étape 2 ; ADR 0067).
-- Les codes (classe, enseignant) sont tirés par le serveur et montrés une seule fois ; la base ne reçoit que leurs
-- empreintes. Toutes les fonctions sont réservées à l'administration et tracées dans le journal d'audit, sans code.

alter table invitations_enseignants add column cree_le timestamptz not null default now();
alter table invitations_enseignants add column annulee_le timestamptz;

create function verifier_administrateur() returns void
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Réservé à l''administration.' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function verifier_administrateur() from public, anon;
grant execute on function verifier_administrateur() to authenticated;

create function verifier_empreinte(p_empreinte text) returns void
language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    raise exception 'Empreinte de code invalide.' using errcode = '22023';
  end if;
end;
$$;

create function verifier_jours(p_jours integer, p_max integer) returns void
language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  if p_jours is null or p_jours not between 1 and p_max then
    raise exception 'La durée de validité doit être comprise entre 1 et % jours.', p_max using errcode = '22023';
  end if;
end;
$$;

/** Référentiels, niveaux et séries proposés dans le formulaire de création d'une classe. */
create function options_classe() returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'referentiel', r.code,
      'niveaux', (select coalesce(jsonb_agg(jsonb_build_object('code', n.code, 'libelle', n.libelle) order by n.ordre), '[]')
                  from niveaux n where n.referentiel_id = r.id),
      'series', (select coalesce(jsonb_agg(jsonb_build_object('code', s.code, 'libelle', s.libelle) order by s.code), '[]')
                 from series s where s.referentiel_id = r.id)
    ) order by r.code)
    from referentiels r), '[]');
end;
$$;
revoke execute on function options_classe() from public, anon;
grant execute on function options_classe() to authenticated;

create function creer_classe(
  p_referentiel text, p_niveau text, p_serie text, p_nom text, p_etablissement text,
  p_empreinte_classe text, p_empreinte_enseignant text, p_jours_code integer, p_jours_invitation integer,
  p_acteur_empreinte text
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_referentiel uuid;
  v_niveau uuid;
  v_serie uuid;
  v_id uuid;
begin
  perform verifier_administrateur();
  select id into v_referentiel from referentiels where code = p_referentiel;
  select id into v_niveau from niveaux where referentiel_id = v_referentiel and code = p_niveau;
  if v_niveau is null then
    raise exception 'Référentiel ou niveau inconnu.' using errcode = '22023';
  end if;
  if coalesce(p_serie, '') <> '' then
    select id into v_serie from series where referentiel_id = v_referentiel and code = p_serie;
    if v_serie is null then
      raise exception 'Série inconnue pour ce référentiel.' using errcode = '22023';
    end if;
  end if;
  if char_length(trim(coalesce(p_nom, ''))) not between 1 and 60 then
    raise exception 'Nom de la classe : 1 à 60 caractères.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_etablissement, ''))) not between 1 and 120 then
    raise exception 'Établissement : 1 à 120 caractères.' using errcode = '22023';
  end if;
  perform verifier_empreinte(p_empreinte_classe);
  perform verifier_empreinte(p_empreinte_enseignant);
  perform verifier_jours(p_jours_code, 365);
  perform verifier_jours(p_jours_invitation, 60);
  insert into classes (referentiel_id, niveau_id, serie_id, nom, etablissement, empreinte_code, code_expire_le)
  values (v_referentiel, v_niveau, v_serie, trim(p_nom), trim(p_etablissement), p_empreinte_classe,
          now() + make_interval(days => p_jours_code))
  returning id into v_id;
  insert into invitations_enseignants (empreinte_code, classe_id, expire_le)
  values (p_empreinte_enseignant, v_id, now() + make_interval(days => p_jours_invitation));
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'creation_classe', 'classe', v_id,
          jsonb_build_object('referentiel', p_referentiel, 'niveau', p_niveau, 'serie', nullif(p_serie, ''),
                             'jours_code', p_jours_code, 'jours_invitation', p_jours_invitation));
  return v_id;
end;
$$;
revoke execute on function creer_classe(text, text, text, text, text, text, text, integer, integer, text) from public, anon;
grant execute on function creer_classe(text, text, text, text, text, text, text, integer, integer, text) to authenticated;

/** Classes, sans les codes : élèves rattachés, validité du code, enseignants, invitation en attente. */
create function classes_admin() returns table (
  id uuid, referentiel text, niveau text, serie text, nom text, etablissement text, eleves integer,
  code_expire_le timestamptz, code_valide boolean, enseignants text[], invitation_en_attente boolean
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select c.id, r.code, n.libelle, s.libelle, c.nom, c.etablissement,
           (select count(*)::integer from eleves e where e.classe_id = c.id),
           c.code_expire_le, c.code_expire_le > now(),
           coalesce((select array_agg(p.prenom_ou_pseudo order by p.prenom_ou_pseudo)
                     from enseignants_classes ec join profils p on p.id = ec.enseignant_id
                     where ec.classe_id = c.id), '{}'),
           exists (select 1 from invitations_enseignants i where i.classe_id = c.id
                   and i.utilisee_le is null and i.expire_le > now())
    from classes c
    join referentiels r on r.id = c.referentiel_id
    join niveaux n on n.id = c.niveau_id
    left join series s on s.id = c.serie_id
    order by c.cree_le desc
    limit 200;
end;
$$;
revoke execute on function classes_admin() from public, anon;
grant execute on function classes_admin() to authenticated;

/** Nouveau code de classe : l'ancien cesse aussitôt de marcher (les élèves déjà rattachés le restent). */
create function nouveau_code_classe(p_classe uuid, p_empreinte text, p_jours integer, p_acteur_empreinte text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  perform verifier_empreinte(p_empreinte);
  perform verifier_jours(p_jours, 365);
  update classes set empreinte_code = p_empreinte, code_expire_le = now() + make_interval(days => p_jours)
  where id = p_classe;
  if not found then return false; end if;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'nouveau_code_classe', 'classe', p_classe,
          jsonb_build_object('jours', p_jours));
  return true;
end;
$$;
revoke execute on function nouveau_code_classe(uuid, text, integer, text) from public, anon;
grant execute on function nouveau_code_classe(uuid, text, integer, text) to authenticated;

/** Nouvelle invitation d'enseignant pour une classe (un autre enseignant, ou un code perdu). */
create function nouvelle_invitation_enseignant(p_classe uuid, p_empreinte text, p_jours integer, p_acteur_empreinte text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  perform verifier_empreinte(p_empreinte);
  perform verifier_jours(p_jours, 60);
  if not exists (select 1 from classes where id = p_classe) then return false; end if;
  insert into invitations_enseignants (empreinte_code, classe_id, expire_le)
  values (p_empreinte, p_classe, now() + make_interval(days => p_jours));
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'invitation_enseignant', 'classe', p_classe,
          jsonb_build_object('jours', p_jours));
  return true;
end;
$$;
revoke execute on function nouvelle_invitation_enseignant(uuid, text, integer, text) from public, anon;
grant execute on function nouvelle_invitation_enseignant(uuid, text, integer, text) to authenticated;

/** Annule les invitations d'enseignant encore en attente pour une classe. Rend leur nombre. */
create function annuler_invitations_enseignant(p_classe uuid, p_acteur_empreinte text) returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  perform verifier_administrateur();
  update invitations_enseignants set annulee_le = now(), expire_le = least(expire_le, now())
  where classe_id = p_classe and utilisee_le is null and expire_le > now();
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
    values ('administrateur', p_acteur_empreinte, 'annulation_invitation_enseignant', 'classe', p_classe,
            jsonb_build_object('nombre', v_n));
  end if;
  return v_n;
end;
$$;
revoke execute on function annuler_invitations_enseignant(uuid, text) from public, anon;
grant execute on function annuler_invitations_enseignant(uuid, text) to authenticated;
