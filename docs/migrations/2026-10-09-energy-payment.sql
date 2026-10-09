-- Pagamento da energia separado do aluguel na mesma mensalidade.
-- is_paid / payment_date passam a representar o pagamento do ALUGUEL + ÁGUA.
-- energy_paid / energy_payment_date representam o pagamento da ENERGIA.
-- Rodar no Supabase SQL Editor. Idempotente.

alter table monthly_entries
  add column if not exists energy_paid boolean not null default false,
  add column if not exists energy_payment_date date;
