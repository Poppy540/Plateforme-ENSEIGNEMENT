-- Décision D10 du propriétaire (revue du Jalon 16, S2 ; ADR 0093) : capacité de chaque classe du pilote.
--   - Saisie à la création (et modifiable) : l'effectif annoncé. Vide = sans limite (classes déjà créées).
--   - Classe pleine : le code est refusé et l'administration est alertée une fois dans la file humaine, sans
--     désigner l'élève qui a essayé (aucun élève dans l'alerte).

alter table classes add column capacite integer check (capacite is null or capacite between 1 and 200);

/** Fixe (ou retire, avec null) la capacité d'une classe. Tracé. */
create function definir_capacite_classe(p_classe uuid, p_capacite integer, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_capacite is not null and p_capacite not between 1 and 200 then
    raise exception 'Capacité : de 1 à 200 élèves.' using errcode = '22023';
  end if;
  update classes set capacite = p_capacite where id = p_classe;
  if not found then
    raise exception 'Classe inconnue.' using errcode = '22023';
  end if;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
  values ('administrateur', p_acteur_empreinte, 'capacite_classe', 'classe', p_classe,
          jsonb_build_object('capacite', p_capacite));
end;
$$;
revoke execute on function definir_capacite_classe(uuid, integer, text) from public, anon;
grant execute on function definir_capacite_classe(uuid, integer, text) to authenticated;

/**
 * Rejoindre sa classe (ADR 0063), avec la capacité (D10) : classe pleine = null (rien n'est fait) et une alerte
 * dans la file humaine, une seule tant qu'elle n'est pas traitée. Sinon, le nom de la classe.
 */
create or replace function rejoindre_classe(p_code text) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_eleve eleves%rowtype;
  v_classe classes%rowtype;
  v_resume text;
begin
  select * into v_eleve from eleves where id = auth.uid();
  if v_eleve.id is null then
    raise exception 'Réservé aux élèves inscrits.' using errcode = '42501';
  end if;
  select * into v_classe from classes
  where empreinte_code = empreinte_code_saisi(p_code) and code_expire_le > now();
  if v_classe.id is null then
    raise exception 'Code de classe inconnu ou expiré.' using errcode = '22023';
  end if;
  if v_classe.referentiel_id <> v_eleve.referentiel_id or v_classe.niveau_id <> v_eleve.niveau_id
     or (v_classe.serie_id is not null and v_classe.serie_id is distinct from v_eleve.serie_id) then
    raise exception 'Ce code correspond à une autre classe que la tienne.' using errcode = '22023';
  end if;
  if v_eleve.classe_id is distinct from v_classe.id and v_classe.capacite is not null
     and (select count(*) from eleves e where e.classe_id = v_classe.id) >= v_classe.capacite then
    v_resume := format('Classe « %s » (%s) complète : un élève a essayé de la rejoindre (capacité %s). '
                       'Donner un nouveau code de classe ou revoir la capacité.',
                       v_classe.nom, v_classe.etablissement, v_classe.capacite);
    if not exists (select 1 from signalements where source = 'plateforme' and resume = v_resume
                   and traite_le is null) then
      insert into signalements (source, motif, priorite, resume) values ('plateforme', 'autre', 2, v_resume);
    end if;
    return null;
  end if;
  update eleves set classe_id = v_classe.id where id = v_eleve.id;
  return v_classe.nom;
end;
$$;

drop function classes_admin();
create function classes_admin() returns table (
  id uuid, referentiel text, niveau text, serie text, nom text, etablissement text, eleves integer,
  code_expire_le timestamptz, code_valide boolean, enseignants text[], invitation_en_attente boolean,
  capacite integer
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
                   and i.utilisee_le is null and i.expire_le > now()),
           c.capacite
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
