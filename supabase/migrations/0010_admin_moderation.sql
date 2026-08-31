-- 0010_admin_moderation.sql
-- Modération : le compte admin (email fixe) peut supprimer n'importe quel
-- objectif communautaire, en plus de la politique "l'auteur supprime" (0005).
--
-- Rien d'autre à faire : les votes et participations liés partent déjà en
-- cascade, et les objectifs personnels sont déliés (on delete set null) — voir
-- 0005_explorer.sql.
drop policy if exists "admin_supprime_objectifs_communautaires" on public.objectifs_communautaires;
create policy "admin_supprime_objectifs_communautaires"
on public.objectifs_communautaires
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'rivsdev@outlook.fr');
