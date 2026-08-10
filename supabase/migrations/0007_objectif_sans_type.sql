-- Un objectif peut ne pas avoir de type.
--
-- « Sans type » = une tâche simple : on la coche une fois et c'est fini, sans
-- remise à zéro ni série. Exactement le comportement de 'unique', mais sans
-- imposer une étiquette à qui n'en veut pas.
--
-- Seul le NOT NULL saute : la contrainte `check (type in (...))` s'évalue à
-- NULL pour une valeur NULL, ce que Postgres accepte. Rien d'autre à toucher.
--
-- Rejouable sans risque.

alter table public.objectifs
  alter column type drop not null;

-- Le défaut reste 'unique' côté base : c'est l'application qui envoie
-- explicitement NULL quand l'utilisateur ne choisit pas de type. Une insertion
-- qui omet la colonne garde donc l'ancien comportement.
