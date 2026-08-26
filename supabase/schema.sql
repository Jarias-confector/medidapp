-- Macros MX — schema base
create extension if not exists "uuid-ossp";

-- Cache de alimentos. source: 'usda' | 'off' | 'mx' | 'custom'
create table foods (
  id          uuid primary key default uuid_generate_v4(),
  source      text not null,
  source_id   text,                    -- fdc_id o barcode
  name        text not null,
  brand       text,
  kcal        numeric not null,        -- todo por 100 g
  protein     numeric not null,
  carbs       numeric not null,
  fat         numeric not null,
  fiber       numeric,
  serving_g   numeric,                 -- porcion sugerida
  owner_id    uuid references auth.users(id) on delete cascade, -- null = publico
  created_at  timestamptz default now(),
  unique (source, source_id)
);
create index foods_name_idx on foods using gin (to_tsvector('spanish', name));

create table entries (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  food_id    uuid not null references foods(id),
  grams      numeric not null check (grams > 0),
  meal       text not null default 'comida',  -- desayuno|comida|cena|snack
  eaten_at   timestamptz not null default now(),
  photo_path text,
  created_at timestamptz default now()
);
create index entries_user_date_idx on entries (user_id, eaten_at desc);

create table goals (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  kcal     numeric not null default 2000,
  protein  numeric not null default 150,
  carbs    numeric not null default 200,
  fat      numeric not null default 65
);

-- RLS
alter table foods   enable row level security;
alter table entries enable row level security;
alter table goals   enable row level security;

create policy foods_read on foods for select
  using (owner_id is null or owner_id = auth.uid());
create policy foods_write on foods for insert
  with check (owner_id is null or owner_id = auth.uid());
-- cacheFood hace upsert: el on conflict do update necesita policy de update,
-- no basta con la de insert.
create policy foods_update on foods for update
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());

create policy entries_own on entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_own on goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Totales del dia
create or replace function day_totals(d date)
returns table (kcal numeric, protein numeric, carbs numeric, fat numeric)
language sql stable as $$
  select
    coalesce(sum(f.kcal    * e.grams / 100), 0),
    coalesce(sum(f.protein * e.grams / 100), 0),
    coalesce(sum(f.carbs   * e.grams / 100), 0),
    coalesce(sum(f.fat     * e.grams / 100), 0)
  from entries e join foods f on f.id = e.food_id
  where e.user_id = auth.uid() and e.eaten_at::date = d;
$$;

-- Semilla MX (USDA no cubre esto)
insert into foods (source, source_id, name, kcal, protein, carbs, fat, serving_g) values
  ('mx','tortilla-maiz','Tortilla de maíz',218,5.7,44.6,2.3,30),
  ('mx','frijol-refrito','Frijoles refritos',135,6.5,17.0,4.5,120),
  ('mx','arroz-rojo','Arroz rojo',150,2.9,28.0,3.0,150),
  ('mx','tinga-pollo','Tinga de pollo',145,15.0,5.0,7.0,120),
  ('mx','salsa-verde','Salsa verde',36,1.2,6.0,0.8,30),
  ('mx','queso-fresco','Queso fresco',290,18.0,3.0,23.0,30),
  ('mx','aguacate','Aguacate',160,2.0,8.5,14.7,50),
  ('mx','huevo-entero','Huevo entero',143,12.6,0.7,9.5,50),
  ('mx','nopal-cocido','Nopal cocido',15,1.3,3.3,0.1,100),
  ('mx','pechuga-pollo','Pechuga de pollo cocida',165,31.0,0.0,3.6,120);
