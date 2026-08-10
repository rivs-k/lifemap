-- Life Map : listes (colonnes), objectifs (items) et completions (validations).
-- Tracker d'habitudes avec séries. À exécuter dans Supabase → SQL Editor,
-- après 0001_profiles.sql.

-- ─────────────────────────────────────────────────────────────
-- 1. LISTES  (colonnes de la Life Map, libres, créées par l'utilisateur)
-- ─────────────────────────────────────────────────────────────
create table public.listes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null,
  couleur text not null default '#0d9488',
  position integer not null default 0, -- ordre des listes (glisser-déposer)
  cree_le timestamptz not null default now()
);

alter table public.listes enable row level security;

create policy "Listes : lecture" on public.listes
  for select using (auth.uid() = user_id);
create policy "Listes : insertion" on public.listes
  for insert with check (auth.uid() = user_id);
create policy "Listes : modification" on public.listes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Listes : suppression" on public.listes
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. OBJECTIFS  (items ; changer liste_id = déplacer d'une liste à l'autre)
--    Pas de booléen "termine" : l'état "fait" est porté par la table
--    completions ci-dessous, période par période.
-- ─────────────────────────────────────────────────────────────
create table public.objectifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  liste_id uuid references public.listes (id) on delete set null,
  nom text not null,
  emoji text,
  type text not null default 'unique'
    check (type in ('quotidien', 'hebdomadaire', 'mensuel', 'unique')),
  archive boolean not null default false, -- sorti du tableau, visible dans l'archive du profil
  position integer not null default 0,    -- ordre dans la liste (glisser-déposer)
  cree_le timestamptz not null default now()
);

alter table public.objectifs enable row level security;

create policy "Objectifs : lecture" on public.objectifs
  for select using (auth.uid() = user_id);
create policy "Objectifs : insertion" on public.objectifs
  for insert with check (auth.uid() = user_id);
create policy "Objectifs : modification" on public.objectifs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Objectifs : suppression" on public.objectifs
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. COMPLETIONS  (validations période par période)
--    Une ligne = « cet objectif a été validé pour cette période ».
--    - quotidien  : periode = le jour (2026-07-21)
--    - hebdomadaire : periode = le lundi qui ouvre la semaine
--    - mensuel    : periode = le 1er du mois
--    - unique     : periode = le jour de validation (pas de série)
--    « Fait pour la période courante ? » = existe-t-il une ligne pour cette
--    période. Le reset (minuit / dimanche / 1er) est automatique : quand la
--    période courante change, l'ancienne ligne ne correspond plus. Pas de cron.
--    La série = nombre de périodes consécutives validées (calculé côté app).
-- ─────────────────────────────────────────────────────────────
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  objectif_id uuid not null references public.objectifs (id) on delete cascade,
  periode date not null,
  cree_le timestamptz not null default now(),
  unique (objectif_id, periode)
);

alter table public.completions enable row level security;

create policy "Completions : lecture" on public.completions
  for select using (auth.uid() = user_id);
create policy "Completions : insertion" on public.completions
  for insert with check (auth.uid() = user_id);
create policy "Completions : suppression" on public.completions
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Supprimer une liste ARCHIVE ses objectifs (ne les détruit pas).
--    Ils partent dans l'archive du profil ; leur historique de completions
--    est conservé. L'utilisateur peut les supprimer définitivement depuis l'archive.
-- ─────────────────────────────────────────────────────────────
create function public.archiver_objectifs_liste()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.objectifs
    set archive = true, liste_id = null
    where liste_id = old.id;
  return old;
end;
$$;

create trigger avant_suppression_liste
  before delete on public.listes
  for each row execute function public.archiver_objectifs_liste();
