-- Accès des enseignants-référents par invitation à usage unique (ADR 0016).
-- Le propriétaire crée l'invitation après le recrutement ; seule l'empreinte du code est stockée.

create table invitations_referents (
  id uuid primary key default gen_random_uuid(),
  empreinte_code text not null unique,
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  familles text[] not null check (cardinality(familles) > 0),
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null,
  utilisee_le timestamptz,
  utilisee_par uuid references profils (id) on delete set null
);

alter table invitations_referents enable row level security;
revoke all on invitations_referents from anon, authenticated, agent_professeur;

-- Active l'accès référent du compte connecté. Un élève ne peut pas devenir référent avec le même compte.
create function activer_referent(p_code text, p_prenom_ou_pseudo text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_invitation invitations_referents%rowtype;
  v_role role_compte;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;

  select * into v_invitation
  from invitations_referents
  where empreinte_code = encode(sha256(convert_to(upper(trim(coalesce(p_code, ''))), 'UTF8')), 'hex')
    and utilisee_le is null and expire_le > now()
  for update;
  if v_invitation.id is null then
    raise exception 'Code d''invitation invalide, expiré ou déjà utilisé.' using errcode = '22023';
  end if;

  select role into v_role from profils where id = auth.uid();
  if v_role is not null and v_role <> 'referent' then
    raise exception 'Ce compte est déjà utilisé comme compte élève ou parent.' using errcode = '22023';
  end if;
  if v_role is null then
    if coalesce(trim(p_prenom_ou_pseudo), '') = '' then
      raise exception 'Indiquez votre prénom ou un pseudonyme.' using errcode = '22023';
    end if;
    insert into profils (id, role, prenom_ou_pseudo) values (auth.uid(), 'referent', trim(p_prenom_ou_pseudo));
  end if;

  insert into referents_familles (referent_id, referentiel_id, famille)
  select auth.uid(), v_invitation.referentiel_id, f from unnest(v_invitation.familles) f
  on conflict do nothing;

  update invitations_referents set utilisee_le = now(), utilisee_par = auth.uid() where id = v_invitation.id;
end;
$$;

revoke execute on function activer_referent(text, text) from public, anon;
grant execute on function activer_referent(text, text) to authenticated;

-- Les référents lisent le profil (prénom) des valideurs, pour l'historique des validations.
create policy profils_valideurs on profils for select to authenticated
  using (est_referent() and role = 'referent');
