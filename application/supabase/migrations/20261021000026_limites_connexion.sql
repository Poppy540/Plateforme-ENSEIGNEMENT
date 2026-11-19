-- Jalon 5, étape 0 (revue de sécurité, S9 ; ADR 0043) : limites d'envoi et de vérification des codes de
-- connexion, tenues en base (valables avec plusieurs serveurs). Le fournisseur d'authentification ne voit que
-- l'adresse du serveur : sans ces limites, un script pourrait épuiser le quota de SMS de tout le monde, faire
-- envoyer des SMS coûteux ou deviner un code. Clés pseudonymisées (empreinte salée calculée par le serveur).
create table limites_connexion (
  cle text not null check (char_length(cle) between 16 and 128),
  nature text not null check (nature in ('envoi', 'verification', 'envoi_global')),
  debut timestamptz not null default now(),
  n integer not null default 0,
  primary key (cle, nature)
);
alter table limites_connexion enable row level security;
revoke all on limites_connexion from public, anon, authenticated;

/** Prend une place dans la fenêtre courante ; faux si la limite est atteinte. */
create function limiter_connexion(p_cle text, p_nature text, p_max integer, p_minutes integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  delete from limites_connexion where debut < now() - interval '1 day';
  insert into limites_connexion (cle, nature) values (p_cle, p_nature)
  on conflict (cle, nature) do update
    set debut = case when limites_connexion.debut < now() - make_interval(mins => p_minutes) then now()
                     else limites_connexion.debut end,
        n = case when limites_connexion.debut < now() - make_interval(mins => p_minutes) then 0
                 else limites_connexion.n end;
  update limites_connexion set n = n + 1
  where cle = p_cle and nature = p_nature and n < p_max
  returning n into v_n;
  return v_n is not null;
end;
$$;
/** Code juste : l'essai est rendu (seuls les essais faux comptent). La clé exige le sel du serveur. */
create function rendre_essai_connexion(p_cle text) returns void
language sql security definer
set search_path = pg_catalog, public
as $$ update limites_connexion set n = greatest(n - 1, 0) where cle = p_cle and nature = 'verification' $$;

revoke execute on function limiter_connexion(text, text, integer, integer), rendre_essai_connexion(text)
  from public, authenticated;
grant execute on function limiter_connexion(text, text, integer, integer), rendre_essai_connexion(text) to anon;
