-- Déplace le comptage des votes côté base : `stats_communautaires` renvoie
-- désormais aussi le nombre de votes par objectif et si l'appelant a voté.
-- Le composant Explorer n'a donc plus besoin de charger toutes les lignes de
-- votes ni de les compter dans le navigateur.
-- À exécuter dans Supabase → SQL Editor, après 0010.
--
-- On change la signature (deux colonnes en plus) : PostgreSQL refuse un simple
-- `create or replace` dans ce cas, il faut d'abord supprimer l'ancienne.
drop function if exists public.stats_communautaires();

create or replace function public.stats_communautaires()
returns table (
  objectif_id uuid,
  participants bigint,
  termine_total bigint,
  termine_periode bigint,
  meilleure_serie integer,
  nb_votes bigint,
  a_vote boolean
)
language sql
security definer
set search_path = ''
as $$
  with base as (
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
    select oc, count(distinct user_id) as n
    from base
    where periode = case type
      when 'quotidien' then current_date
      when 'hebdomadaire' then date_trunc('week', current_date)::date
      when 'mensuel' then date_trunc('month', current_date)::date
      else periode
    end
    group by oc
  ),
  -- Nombre total de votes par objectif.
  votes_total as (
    select objectif_communautaire_id as oc, count(*) as n
    from public.votes_communautaires group by objectif_communautaire_id
  ),
  -- Les objectifs que l'appelant a votés (auth.uid() = l'utilisateur connecté).
  mes_votes as (
    select objectif_communautaire_id as oc
    from public.votes_communautaires where user_id = auth.uid()
  )
  select
    o.id,
    coalesce(p.n, 0),
    coalesce(t.n, 0),
    coalesce(pe.n, 0),
    coalesce(s.meilleure, 0)::integer,
    coalesce(v.n, 0),
    (mv.oc is not null)
  from public.objectifs_communautaires o
  left join nb_participants p on p.oc = o.id
  left join nb_total t on t.oc = o.id
  left join nb_periode pe on pe.oc = o.id
  left join series s on s.oc = o.id
  left join votes_total v on v.oc = o.id
  left join mes_votes mv on mv.oc = o.id;
$$;

grant execute on function public.stats_communautaires() to authenticated;
