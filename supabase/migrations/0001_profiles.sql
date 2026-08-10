-- Table des profils : une ligne par compte, liée à auth.users.
-- À exécuter dans Supabase → SQL Editor.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text,
  niveau integer not null default 1,
  xp integer not null default 0,
  cree_le timestamptz not null default now()
);

-- Row Level Security : chaque utilisateur ne voit et ne modifie que SON profil.
alter table public.profiles enable row level security;

create policy "Lecture de son propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Mise a jour de son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Déclencheur : crée automatiquement un profil à chaque inscription.
-- security definer + search_path vide = pratique recommandée par Supabase :
-- la fonction s'exécute avec les droits du propriétaire (contourne la RLS pour
-- l'insertion) et ne dépend pas du search_path de l'appelant.
create function public.creer_profil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, new.raw_user_meta_data ->> 'pseudo');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Backfill : crée les profils manquants pour les comptes déjà inscrits
-- (dont celui créé pendant les tests, avant l'existence du déclencheur).
insert into public.profiles (id, pseudo)
select id, raw_user_meta_data ->> 'pseudo'
from auth.users
on conflict (id) do nothing;
