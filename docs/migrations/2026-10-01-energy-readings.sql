-- Leituras de energia (kWh) por imóvel + detalhamento na mensalidade.
-- Rodar no Supabase SQL Editor. Idempotente.

-- 1. Tarifa padrão (R$/kWh) do proprietário
alter table profiles
  add column if not exists energy_kwh_rate numeric(10, 4);

-- 2. Detalhamento da leitura gravado na mensalidade (snapshot — não muda se a tarifa mudar depois)
alter table monthly_entries
  add column if not exists energy_prev_reading numeric(12, 2),
  add column if not exists energy_curr_reading numeric(12, 2),
  add column if not exists energy_kwh numeric(12, 2),
  add column if not exists energy_kwh_rate numeric(10, 4);

-- 3. Histórico de leituras do relógio de cada imóvel
create table if not exists energy_readings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references profiles (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  -- mensalidade faturada por esta leitura (null para leitura inicial / troca de relógio)
  monthly_entry_id uuid unique references monthly_entries (id) on delete set null,
  reading_date date not null,
  reading_kwh numeric(12, 2) not null check (reading_kwh >= 0),
  kind text not null default 'regular' check (kind in ('regular', 'initial', 'meter_reset'))
);

create index if not exists energy_readings_property_date_idx
  on energy_readings (property_id, reading_date desc, created_at desc);
create index if not exists energy_readings_owner_idx
  on energy_readings (owner_id);

alter table energy_readings enable row level security;

drop policy if exists "energy_readings_owner_all" on energy_readings;
create policy "energy_readings_owner_all" on energy_readings
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
