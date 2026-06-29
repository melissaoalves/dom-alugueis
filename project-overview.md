# Roadmap e Sprints: DOM Aluguéis

O desenvolvimento do DOM Aluguéis será dividido em fases modulares focadas em entregas de valor incrementais.

---

## Fase 1: Fundação e Setup (Sprint 1) - [CONCLUÍDA]
- Inicialização do projeto Next.js com Tailwind CSS e TypeScript.
- Configuração do Supabase (Client, Environment variables).
- Estruturação de pastas no padrão **Package by Feature** (`src/features`, `src/shared`).
- Criação dos componentes de UI genéricos compartilhados (Botões, Inputs, Cards).
- Redesign minimalista da Landing Page (dark theme, sem emojis).
- Configuração do proxy de proteção de rotas (`proxy.ts`) separando acesso público e privado.

## Fase 2: Cadastros Base (Sprint 2) - [CONCLUÍDA]
- **Módulo de Imóveis (Properties)**:
  - Tabela no Supabase com RLS via `owner_id → profiles.id`.
  - UI de listagem, criação e edição com campos de cobrança de água/energia.
- **Módulo de Inquilinos (Tenants)**:
  - Tabela no Supabase com constraint `UNIQUE` no CPF.
  - UI de listagem, criação e edição com flag `veaco` (histórico de inadimplência).

## Fase 3: Contratos e Vínculos (Sprint 3) - [CONCLUÍDA]
- **Módulo de Contratos (Contracts)**:
  - Tabela com campos de juros (`interest_rate`), multa (`penalty_fee`), dia de vencimento (`due_day`), caução, tipo de cobrança de água/energia (`water_billing_type`, `energy_billing_type`) e status (`status`).
  - Duração calculada automaticamente (6 ou 12 meses) a partir da data de início.
  - Tipo de cobrança por contrato: `fixed` (valor pré-preenchido), `consumption` (proprietário lança mensalmente), `not_included`.
  - Sistema de status: **Ativo** (automático ao criar), **Vencido** (calculado pela `end_date`), **Rescindido** (ação manual com modal de confirmação).
  - Cards com badge de status, ícones compactos de editar (lápis) e rescindir (ban).
  - Ordenação por `start_date` descrescente (contratos mais novos primeiro).

## Fase 4: Gestão Financeira e Mensalidades (Sprint 4) - [CONCLUÍDA]
- **Lançamentos Mensais (`monthly_entries`)**:
  - Tabela com `contract_id`, `property_id`, `owner_id`, `reference_month` (mês morado), `due_date` (vencimento no mês seguinte), valores variáveis e flag `is_paid`.
  - Geração em lote via botão: varre contratos ativos do usuário, filtra por data de início ≤ fim do mês de referência, cria entradas sem duplicar (upsert com constraint `contract_id + reference_month`).
  - Valores fixos (água/energia) pré-preenchidos automaticamente na geração; consumo variável fica em branco para o proprietário preencher.
  - Cards de cobrança com breakdown completo (aluguel + fixos + variáveis + extra + multa/juros).
  - Cálculo de multa/juros usando a **data de pagamento selecionada** (não a data atual).
  - Botão "Marcar como Pago" com seletor de data de pagamento.
  - Resumo do mês: total de cobranças, a receber e recebido (calculados com todos os componentes do total).
- **Despesas (`expenses`)**:
  - Tabela com RLS via `owner_id`.
  - 18 categorias conforme definido no `context.md`.
  - Listagem por mês/ano com total do período.
  - Vinculação opcional a um imóvel específico.
  - Remoção com confirmação.

## Fase 5: Dashboard e Métricas (Sprint 5) - [CONCLUÍDA]
- **Painel Principal (Home/Dashboard)**:
  - Cards de **Total a Receber vs. Já Recebido** do mês.
  - Cálculo de **Lucro Líquido** (Recebimentos - Despesas).
  - Alerta de **Inadimplência** (cobranças em atraso).
  - Métricas de **Ocupação e Vacância** (imóveis com/sem contrato ativo).
  - Lembretes de **Próximos Vencimentos** (contratos terminando em 30/60 dias).

## Fase 6: Polimento e Funcionalidades Extras (Sprint 6) - [EM PROGRESSO]

### Concluído nesta fase
- [x] **Despesas agendadas**: proprietário agenda despesa com `due_date`, recebe lembrete no app (dashboard + tela de despesas). Confirmação de pagamento e desfazer disponíveis. Migration: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date date, ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT true;`
- [x] **Edição de despesas**: página `/dashboard/finance/expenses/[id]/edit`.
- [x] **Dashboard melhorado**: gráfico de categorias de despesas lado a lado com histórico (3 meses), alertas de despesas agendadas pendentes.
- [x] **Cadastro completo do proprietário**: `SignUpForm` agora coleta nacionalidade, estado civil, profissão e endereço completo — todos necessários para geração de contratos PDF.
- [x] **Mobile nav**: Despesas separado de Mensalidades no bottom nav; perfil no topo mesmo no mobile.
- [x] **Bug rescisão corrigido**: `generateMonthEntries` calcula aluguel proporcional para rescindidos (dias extras entre `due_day` e `end_date`). `ContractStatusButton` salva `rent_value` proporcional corretamente.

### Pendente
- [ ] **Notificações por e-mail** para despesas agendadas (Supabase Edge Function + pg_cron).
- [ ] **Geração de Contratos em PDF**.
- [ ] **Renovação rápida de contrato** (pré-preenchimento do formulário com dados do contrato atual).
- [ ] **Exportação de relatórios** (CSV/PDF).
- [ ] Unificar lógica pro-rata do `ContractStatusButton` com a regra do `generateMonthEntries` (contar só dias entre `due_day` e `end_date` no mês da rescisão).

---

## SQL do Trigger `handle_new_user` (versão atual)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, first_name, last_name, phone, document_id,
    nationality, marital_status, occupation,
    logradouro, numero, complemento, bairro, cep, cidade, uf
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'document_id',
    NEW.raw_user_meta_data->>'nationality',
    NEW.raw_user_meta_data->>'marital_status',
    NEW.raw_user_meta_data->>'occupation',
    NEW.raw_user_meta_data->>'logradouro',
    NEW.raw_user_meta_data->>'numero',
    NEW.raw_user_meta_data->>'complemento',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'cep',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'uf'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name     = EXCLUDED.first_name,
    last_name      = EXCLUDED.last_name,
    phone          = EXCLUDED.phone,
    nationality    = EXCLUDED.nationality,
    marital_status = EXCLUDED.marital_status,
    occupation     = EXCLUDED.occupation,
    logradouro     = EXCLUDED.logradouro,
    numero         = EXCLUDED.numero,
    complemento    = EXCLUDED.complemento,
    bairro         = EXCLUDED.bairro,
    cep            = EXCLUDED.cep,
    cidade         = EXCLUDED.cidade,
    uf             = EXCLUDED.uf;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

