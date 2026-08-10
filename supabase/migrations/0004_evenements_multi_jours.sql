-- Événements s'étalant sur plusieurs jours (ou semaines).
-- À exécuter dans Supabase → SQL Editor, après 0003_evenements.sql.
--
-- `jour` reste le jour de début. `jour_fin` est optionnel :
--   NULL  → événement sur une seule journée (comportement actuel inchangé)
--   date  → l'événement couvre jour → jour_fin inclus
--
-- Script idempotent : on peut le relancer sans erreur s'il a déjà été
-- exécuté, même partiellement.

alter table public.evenements
  add column if not exists jour_fin date;

-- Un événement ne peut pas se terminer avant d'avoir commencé.
alter table public.evenements
  drop constraint if exists jours_coherents;

alter table public.evenements
  add constraint jours_coherents
  check (jour_fin is null or jour_fin >= jour);

-- L'ancienne contrainte d'horaires supposait un événement tenant sur une seule
-- journée. Sur plusieurs jours, commencer à 18:00 et finir à 09:00 est normal :
-- on ne l'applique donc plus qu'aux événements d'une seule journée.
alter table public.evenements
  drop constraint if exists horaires_coherents;

alter table public.evenements
  add constraint horaires_coherents
  check (
    heure_debut is null
    or heure_fin is null
    or (jour_fin is not null and jour_fin > jour)
    or heure_fin >= heure_debut
  );
