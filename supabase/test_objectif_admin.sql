-- À exécuter dans Supabase (SQL Editor) APRÈS la migration 0010.
-- Crée un objectif communautaire "sans auteur" (cree_par = null) : la politique
-- "l'auteur supprime" ne peut donc PAS s'appliquer. Si ton compte admin arrive
-- à le supprimer depuis l'Explorer, c'est bien la politique admin qui agit.
--
-- (Exécuter via le SQL Editor contourne la sécurité RLS, ce qui permet de poser
-- cree_par = null pour les besoins du test.)
insert into public.objectifs_communautaires (cree_par, titre, description, emoji, type)
values (null, 'TEST à supprimer (admin)', 'Objectif de test pour la modération.', '🧪', 'quotidien');
