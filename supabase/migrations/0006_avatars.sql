-- Photos de profil : colonne avatar_url + bucket de stockage.
-- À exécuter dans Supabase → SQL Editor, après 0005.

alter table public.profiles
  add column if not exists avatar_url text;

-- ─────────────────────────────────────────────────────────────
-- Bucket de stockage des avatars.
-- public = true : les images sont lisibles par URL directe (une photo de
-- profil est destinée à être vue). L'écriture reste protégée ci-dessous.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Chaque utilisateur n'écrit que dans SON dossier : le chemin des fichiers
-- est `<user_id>/avatar.<ext>`, et on compare le premier segment à auth.uid().
-- Sans ça, n'importe qui pourrait écraser la photo d'un autre.

drop policy if exists "Avatars : lecture publique" on storage.objects;
create policy "Avatars : lecture publique"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Avatars : dépôt dans son dossier" on storage.objects;
create policy "Avatars : dépôt dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatars : mise à jour de son dossier" on storage.objects;
create policy "Avatars : mise à jour de son dossier"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatars : suppression de son dossier" on storage.objects;
create policy "Avatars : suppression de son dossier"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
