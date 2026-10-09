-- "Quitado com o caução": a mensalidade (aluguel+água) fica quitada mas NÃO conta
-- como recebido, porque o caução já foi contabilizado como receita no início do contrato.
-- Rodar no Supabase SQL Editor. Idempotente.

alter table monthly_entries
  add column if not exists settled_by_caucao boolean not null default false;
