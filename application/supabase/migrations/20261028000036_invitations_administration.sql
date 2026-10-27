-- Invitations de référents créées depuis l'administration (Jalon 10, étape 1 ; ADR 0066).
-- Le code est tiré par le serveur et montré une seule fois au propriétaire ; la base ne reçoit que son empreinte
-- SHA-256 (même calcul que activer_referent). Création, lecture et annulation : administration seulement, tracées
-- dans le journal d'audit sans le code.

alter table invitations_referents add column annulee_le timestamptz;

create function familles_du_referentiel(p_referentiel uuid) returns text[]
language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(array_agg(distinct famille order by famille), '{}') from matieres where referentiel_id = p_referentiel $$;
revoke execute on function familles_du_referentiel(uuid) from public, anon, authenticated;

/** Référentiels et familles de matières proposés dans le formulaire d'invitation. */
create function options_invitation_referent() returns table (referentiel text, pays text, familles text[])
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Réservé à l''administration.' using errcode = '42501';
  end if;
  return query
    select r.code, r.pays_code, familles_du_referentiel(r.id) from referentiels r
    join pays p on p.code = r.pays_code
    order by r.code;
end;
$$;
revoke execute on function options_invitation_referent() from public, anon;
grant execute on function options_invitation_referent() to authenticated;

create function creer_invitation_referent(
  p_referentiel text, p_familles text[], p_jours integer, p_empreinte text, p_acteur_empreinte text
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_referentiel uuid;
  v_id uuid;
  v_inconnues text[];
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Réservé à l''administration.' using errcode = '42501';
  end if;
  select id into v_referentiel from referentiels where code = p_referentiel;
  if v_referentiel is null then
    raise exception 'Référentiel inconnu.' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_familles), 0) = 0 then
    raise exception 'Choisissez au moins une famille de matières.' using errcode = '22023';
  end if;
  select array_agg(f) into v_inconnues from unnest(p_familles) f
  where f <> all (familles_du_referentiel(v_referentiel));
  if v_inconnues is not null then
    raise exception 'Famille inconnue pour ce référentiel : %.', array_to_string(v_inconnues, ', ') using errcode = '22023';
  end if;
  if p_jours is null or p_jours not between 1 and 60 then
    raise exception 'La durée de validité doit être comprise entre 1 et 60 jours.' using errcode = '22023';
  end if;
  if p_empreinte !~ '^[0-9a-f]{64}$' then
    raise exception 'Empreinte de code invalide.' using errcode = '22023';
  end if;
  insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
  values (p_empreinte, v_referentiel, (select array_agg(distinct f order by f) from unnest(p_familles) f),
          now() + make_interval(days => p_jours))
  returning id into v_id;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'creation_invitation_referent', 'invitation_referent', v_id,
          jsonb_build_object('referentiel', p_referentiel, 'familles', p_familles, 'jours', p_jours));
  return v_id;
end;
$$;
revoke execute on function creer_invitation_referent(text, text[], integer, text, text) from public, anon;
grant execute on function creer_invitation_referent(text, text[], integer, text, text) to authenticated;

/** Invitations de référents, sans les codes : état, et prénom du référent qui l'a utilisée. */
create function invitations_referents_admin() returns table (
  id uuid, referentiel text, familles text[], cree_le timestamptz, expire_le timestamptz, etat text, referent text
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Réservé à l''administration.' using errcode = '42501';
  end if;
  return query
    select i.id, r.code, i.familles, i.cree_le, i.expire_le,
           case when i.utilisee_le is not null then 'utilisee'
                when i.annulee_le is not null then 'annulee'
                when i.expire_le <= now() then 'expiree'
                else 'en_attente' end,
           p.prenom_ou_pseudo
    from invitations_referents i
    join referentiels r on r.id = i.referentiel_id
    left join profils p on p.id = i.utilisee_par
    order by i.cree_le desc
    limit 200;
end;
$$;
revoke execute on function invitations_referents_admin() from public, anon;
grant execute on function invitations_referents_admin() to authenticated;

/** Annule une invitation encore en attente : son code ne permet plus de s'activer. */
create function annuler_invitation_referent(p_id uuid, p_acteur_empreinte text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if role_courant() is distinct from 'administrateur' then
    raise exception 'Réservé à l''administration.' using errcode = '42501';
  end if;
  update invitations_referents set annulee_le = now(), expire_le = least(expire_le, now())
  where id = p_id and utilisee_le is null and annulee_le is null and expire_le > now();
  if not found then return false; end if;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'annulation_invitation_referent', 'invitation_referent', p_id, '{}');
  return true;
end;
$$;
revoke execute on function annuler_invitation_referent(uuid, text) from public, anon;
grant execute on function annuler_invitation_referent(uuid, text) to authenticated;
