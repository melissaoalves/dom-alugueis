# Handoff - Estado do Projeto

Este arquivo serve como um "ponto de save" do projeto. Ao iniciar uma nova sessão ou trocar de agente, este documento informará exatamente onde paramos e qual é a próxima ação esperada.

---

## Status Atual
**Fase 5 Concluída. Pronto para iniciar a Fase 6.**

---

## Decisões de Arquitetura Tomadas

### Banco de Dados
- `profiles.id = auth.users.id` (trigger cria o perfil com o mesmo UUID do auth)
- `properties.owner_id → profiles.id`
- `monthly_entries.owner_id → profiles.id` (RLS direto: `owner_id = auth.uid()`)
- `expenses.owner_id → profiles.id` (RLS direto)
- Tipos de cobrança (`water_billing_type`, `energy_billing_type`) ficam no **contrato**, não no imóvel
- `reference_month` em `monthly_entries` é sempre o **primeiro dia do mês** (ex: `2026-06-01`) — mês que foi morado
- `due_date` cai no **mês seguinte** ao `reference_month`, no dia `due_day` do contrato

### Cuidados Importantes no Código
- **Timezone**: nunca usar `new Date('YYYY-MM-DD').getMonth()` para calcular datas — usar `split('-')` e trabalhar com números inteiros para evitar drift de UTC
- **Fallback de valores fixos**: usar `||` (não `??`) ao buscar `water_amount`/`energy_amount` pois o banco pode retornar `0` como default em vez de `null`
- **RLS de `monthly_entries`**: usa `owner_id = auth.uid()` (não via subquery de properties — testado, não funcionou bem com o browser client)
- **Supabase browser client**: usado nos serviços de finance (`monthlyEntriesService`, `expensesService`) — requer usuário autenticado

---

## Módulos Concluídos

### `src/features/auth`
- `LoginForm`, `SignUpForm` (formatação de CPF/telefone/CEP + todos os campos do perfil: nacionalidade, estado civil, profissão, endereço completo)
- `AuthProvider` (context para estado de autenticação)
- `useAuth` hook
- Server actions: `signUp` (salva todos os campos extras via upsert em `profiles` + metadata), `signIn`, `signOut`
- Trigger no Supabase `handle_new_user`: **ATUALIZADO** — agora copia nationality, marital_status, occupation e todos os campos de endereço do `raw_user_meta_data`. SQL do trigger disponível no `project-overview.md`.

### `src/features/properties`
- `PropertyList` (server component), `PropertyForm` (client)
- Service com `getProperties`, `getProperty`, `createProperty`, `updateProperty`, `deleteProperty`

### `src/features/tenants`
- `TenantList` (server component), `TenantForm` (client)
- Constraint UNIQUE em `cpf` — erro tratado com mensagem amigável em PT-BR

### `src/features/contracts`
- `ContractList` (server component) com status calculado dinamicamente
- `ContractForm` (client) com seletor de duração (6/12 meses), tipos de cobrança e valores
- `ContractStatusButton` (client) — rescisão com modal de confirmação
- Status: `ativo` (automático), `vencido` (calculado via `end_date`), `rescindido` (manual)

### `src/features/finance`
- `MonthlyEntryList` + `MonthlyEntryCard` (client components)
- Geração de cobranças por mês com pré-preenchimento de valores fixos
- Cálculo de multa/juros pela data de pagamento selecionada
- **Bug corrigido — rescindidos**: `generateMonthEntries` agora calcula aluguel proporcional para contratos rescindidos (dias extras entre `due_day` e dia da rescisão em `end_date`). Se `endDay <= due_day`, nenhum lançamento é gerado.
- **Bug corrigido — ContractStatusButton**: pro-rata salvo corretamente em `rent_value`, `water_amount`, `energy_amount` separados (antes ficava tudo null). `calcProRata` chamado por componente.
- **`MonthlyEntry` type**: campo `rent_value?: number` adicionado em `database.ts`.
- **Despesas agendadas** (`expenses`):
  - Migração necessária: `ALTER TABLE expenses ADD COLUMN due_date date, ADD COLUMN is_settled boolean NOT NULL DEFAULT true;`
  - `ExpenseForm`: toggle "Agendar despesa" — alterna entre campo `date` (normal) e `due_date` (agendada).
  - `ExpenseList`: seção "Agendadas" no topo com badges de status (atrasada/vence hoje/vence em Xd), botão confirmar pagamento (✓) e editar (lápis).
  - Service: `getPendingScheduled()`, `settleExpense()`, `unsettleExpense()`, `updateExpense()`, `getExpenseById()`.
  - Edição de despesas: página `/dashboard/finance/expenses/[id]/edit` — formulário pré-preenchido, botão "Desfazer pagamento" aparece para despesas agendadas já pagas.
  - `getExpenses()` filtra apenas `is_settled = true` (agendadas pendentes não entram no histórico nem nos totais do dashboard).

### `src/features/dashboard`
- Painel principal (`app/dashboard/page.tsx`) integrado com Supabase.
- Total a Receber, Recebido, Despesas e Lucro Líquido reais do mês selecionado.
- Despesas filtradas por `is_settled = true` (agendadas não entram no total).
- Gráfico de histórico de **3 meses** (Receitas vs Despesas) lado a lado com `ExpenseCategoryChart`.
- `ExpenseCategoryChart` (donut PieChart) movido para o dashboard — mostra categorias do mês selecionado com `monthLabel`. Largura `w-1/2` ao lado do gráfico de histórico.
- Alertas: inadimplência, contratos terminando em 60 dias, **despesas agendadas pendentes** (novo — mostra vencidas/hoje/próximas).
- **MobileNav** atualizado: "Finanças" dividido em "Mensalidades" e "Despesas" (ícone `Receipt`). "Perfil" removido do bottom nav e exibido no topo direito em mobile também.
- Cards de resumo de mensalidades: responsivos (`text-xs` mobile / `text-xl` desktop, `min-w-0`, `gap-2` mobile).
- **Correção Matemática**: Ajustado `calcTotal` para priorizar `entry.rent_value` em vez do aluguel padrão do contrato.

---

## Próximos Passos

### Pendências técnicas
- Rodar no Supabase SQL Editor:
  1. `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date date, ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT true;`
  2. Atualizar trigger `handle_new_user` (SQL completo em `project-overview.md`)
- Bug de rescisão no `ContractStatusButton`: o cálculo pro-rata ainda usa `calcProRata` que depende de `lastPaidRefMonth`. Se esse valor for null, usa `contractStartDate` como início — pode cobrar meses a mais. **Regra correta**: contar apenas os dias extras entre `due_day` e `end_date` no mês da rescisão (igual ao que foi feito em `generateMonthEntries`). Pendente de unificar a lógica.

### Fase 6 — Funcionalidades planejadas
1. **Geração de Contratos em PDF** — exportação automatizada.
2. **Renovação Rápida de Contrato** — pré-preenche novo contrato com dados do atual.
3. **Notificações por e-mail** — despesas agendadas vencendo (requer Supabase Edge Function + pg_cron). TODO registrado na sessão anterior.
4. **Exportação de relatórios** (CSV/PDF).

