-- Suppression de compte en self-service (sans Edge Function).
-- À exécuter dans Supabase → SQL Editor, après 0008.
--
-- security definer : la fonction s'exécute avec les droits du propriétaire et
-- peut donc supprimer dans auth.users — ce qu'un client ne peut pas faire.
-- Elle ne touche QUE la ligne de l'appelant (auth.uid()). Les `on delete
-- cascade` déjà en place effacent en chaîne profil, listes, objectifs,
-- completions, votes et participations.
create function public.supprimer_mon_compte()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.supprimer_mon_compte() from public;
grant execute on function public.supprimer_mon_compte() to authenticated;
