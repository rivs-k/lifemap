-- Agenda : événements du calendrier.
-- À exécuter dans Supabase → SQL Editor, après 0002_listes_objectifs.sql.
--
-- Pas de tag/catégorie (choix produit) : un événement = titre + jour + horaires.
-- Horaires optionnels : heure_debut ET heure_fin à NULL = « toute la journée ».

create table public.evenements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titre text not null,
  jour date not null,
  heure_debut time,
  heure_fin time,
  cree_le timestamptz not null default now(),
  -- Une fin ne peut pas précéder un début.
  constraint horaires_coherents
    check (heure_debut is null or heure_fin is null or heure_fin >= heure_debut)
);

-- Le calendrier interroge toujours « mes événements sur une plage de jours ».
create index evenements_user_jour_idx on public.evenements (user_id, jour);

alter table public.evenements enable row level security;

create policy "Evenements : lecture" on public.evenements
  for select using (auth.uid() = user_id);
create policy "Evenements : insertion" on public.evenements
  for insert with check (auth.uid() = user_id);
create policy "Evenements : modification" on public.evenements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Evenements : suppression" on public.evenements
  for delete using (auth.uid() = user_id);
