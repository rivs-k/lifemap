-- Suppression du système de niveaux/XP.
-- À exécuter dans Supabase → SQL Editor.
--
-- L'XP et le niveau n'étaient plus lus : ils étaient recalculés à la volée
-- depuis `completions` côté front, jamais depuis ces colonnes. On les retire
-- donc pour de bon. Le déclencheur `creer_profil` (migration 0001) n'insère
-- que (id, pseudo), il n'est pas affecté.

alter table public.profiles
  drop column if exists niveau,
  drop column if exists xp;
