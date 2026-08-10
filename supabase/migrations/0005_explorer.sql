-- Explorer : objectifs communautaires, votes, participations.
-- À exécuter dans Supabase → SQL Editor, après 0004.
--
-- Première fonctionnalité à données PARTAGÉES : jusqu'ici chacun ne voyait que
-- ses lignes. Ici la lecture est ouverte à tous les utilisateurs connectés,
-- mais l'écriture reste limitée à ses propres votes/participations.

-- ─────────────────────────────────────────────────────────────
-- 1. OBJECTIFS COMMUNAUTAIRES (créés par n'importe quel utilisateur)
-- ─────────────────────────────────────────────────────────────
create table public.objectifs_communautaires (
  id uuid primary key default gen_random_uuid(),
  -- on delete set null : supprimer un compte ne détruit pas l'objectif
  -- que la communauté utilise.
  cree_par uuid references auth.users (id) on delete set null,
  titre text not null,
  description text,
  emoji text,
  type text not null default 'quotidien'
    check (type in ('quotidien', 'hebdomadaire', 'mensuel', 'unique')),
  cree_le timestamptz not null default now()
);

alter table public.objectifs_communautaires enable row level security;

create policy "Communautaires : lecture par tous les connectés"
  on public.objectifs_communautaires for select to authenticated using (true);
create policy "Communautaires : création"
  on public.objectifs_communautaires for insert to authenticated
  with check (auth.uid() = cree_par);
create policy "Communautaires : l'auteur modifie"
  on public.objectifs_communautaires for update to authenticated
  using (auth.uid() = cree_par) with check (auth.uid() = cree_par);
create policy "Communautaires : l'auteur supprime"
  on public.objectifs_communautaires for delete to authenticated
  using (auth.uid() = cree_par);

-- ─────────────────────────────────────────────────────────────
-- 2. VOTES  (un vote par utilisateur et par objectif)
-- ─────────────────────────────────────────────────────────────
create table public.votes_communautaires (
  objectif_communautaire_id uuid not null
    references public.objectifs_communautaires (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (objectif_communautaire_id, user_id)
);

alter table public.votes_communautaires enable row level security;

create policy "Votes : lecture par tous les connectés"
  on public.votes_communautaires for select to authenticated using (true);
create policy "Votes : chacun vote pour lui"
  on public.votes_communautaires for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Votes : chacun retire son vote"
  on public.votes_communautaires for delete to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. PARTICIPATIONS
--    Table dédiée (plutôt que de compter les objectifs personnels) : la RLS
--    des objectifs empêcherait de compter ceux des autres.
-- ─────────────────────────────────────────────────────────────
create table public.participations (
  objectif_communautaire_id uuid not null
    references public.objectifs_communautaires (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rejoint_le timestamptz not null default now(),
  primary key (objectif_communautaire_id, user_id)
);

alter table public.participations enable row level security;

create policy "Participations : lecture par tous les connectés"
  on public.participations for select to authenticated using (true);
create policy "Participations : chacun rejoint pour lui"
  on public.participations for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Participations : chacun quitte"
  on public.participations for delete to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. LIEN vers l'objectif personnel
--    Rejoindre crée un objectif dans la Life Map, rattaché à l'objectif
--    communautaire : les validations passent par `completions`, comme le reste.
-- ─────────────────────────────────────────────────────────────
alter table public.objectifs
  add column if not exists objectif_communautaire_id uuid
  references public.objectifs_communautaires (id) on delete set null;

create index if not exists objectifs_communautaire_idx
  on public.objectifs (objectif_communautaire_id);

-- ─────────────────────────────────────────────────────────────
-- 5. STATISTIQUES COLLECTIVES
--    security definer : la fonction lit les données de tous les participants
--    (ce que la RLS interdit à l'appelant) mais ne renvoie QUE des agrégats.
--    Aucune donnée individuelle ne sort d'ici.
-- ─────────────────────────────────────────────────────────────
create or replace function public.stats_communautaires()
returns table (
  objectif_id uuid,
  participants bigint,
  termine_total bigint,
  termine_periode bigint,
  meilleure_serie integer
)
language sql
security definer
set search_path = ''
as $$
  with base as (
    -- Toutes les validations rattachées à un objectif communautaire.
    select
      o.objectif_communautaire_id as oc,
      c.user_id,
      c.periode,
      oc.type
    from public.completions c
    join public.objectifs o on o.id = c.objectif_id
    join public.objectifs_communautaires oc on oc.id = o.objectif_communautaire_id
  ),
  numerotees as (
    select
      oc, user_id, periode, type,
      row_number() over (partition by oc, user_id order by periode) as rang
    from base
  ),
  groupes as (
    -- Clé constante tant que les périodes se suivent sans trou :
    -- c'est ce qui isole chaque série consécutive.
    select
      oc, user_id,
      case type
        when 'quotidien' then
          to_char(periode - (rang * interval '1 day'), 'YYYY-MM-DD')
        when 'hebdomadaire' then
          to_char(periode - (rang * interval '7 days'), 'YYYY-MM-DD')
        when 'mensuel' then
          ((date_part('year', periode)::int * 12
            + date_part('month', periode)::int) - rang)::text
        else to_char(periode, 'YYYY-MM-DD')
      end as groupe
    from numerotees
  ),
  series as (
    select oc, max(taille) as meilleure
    from (
      select oc, user_id, groupe, count(*) as taille
      from groupes
      group by oc, user_id, groupe
    ) s
    group by oc
  ),
  nb_participants as (
    select objectif_communautaire_id as oc, count(*) as n
    from public.participations group by objectif_communautaire_id
  ),
  nb_total as (
    select oc, count(*) as n from base group by oc
  ),
  nb_periode as (
    -- Participants ayant validé pour la période EN COURS.
    select oc, count(distinct user_id) as n
    from base
    where periode = case type
      when 'quotidien' then current_date
      when 'hebdomadaire' then date_trunc('week', current_date)::date
      when 'mensuel' then date_trunc('month', current_date)::date
      else periode
    end
    group by oc
  )
  select
    o.id,
    coalesce(p.n, 0),
    coalesce(t.n, 0),
    coalesce(pe.n, 0),
    coalesce(s.meilleure, 0)::integer
  from public.objectifs_communautaires o
  left join nb_participants p on p.oc = o.id
  left join nb_total t on t.oc = o.id
  left join nb_periode pe on pe.oc = o.id
  left join series s on s.oc = o.id;
$$;

grant execute on function public.stats_communautaires() to authenticated;
