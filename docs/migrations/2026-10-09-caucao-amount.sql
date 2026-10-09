-- Valor do aluguel+água quitado com o caução (permite cobertura parcial:
-- quando o caução é menor que o aluguel+água, cobre só até o limite e o resto
-- fica a receber do inquilino). Substitui o booleano settled_by_caucao.
-- Rodar no Supabase SQL Editor. Idempotente.

alter table monthly_entries
  add column if not exists caucao_amount numeric(12, 2) not null default 0;

-- Migra o booleano antigo: quem estava settled_by_caucao=true passa a ter o valor
-- (aproximado pelo rent_value + water fixo do contrato) em caucao_amount.
update monthly_entries me
set caucao_amount = coalesce(me.rent_value, c.rent_value, 0)
  + case when c.water_billing_type = 'fixed' then coalesce(me.water_amount, c.water_value, 0)
         when c.water_billing_type = 'consumption' then coalesce(me.water_amount, 0)
         else 0 end
  + coalesce(me.extra_amount, 0)
from contracts c
where me.contract_id = c.id
  and me.settled_by_caucao = true
  and me.caucao_amount = 0;
