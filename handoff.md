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
- `LoginForm`, `SignUpForm` (com formatação de CPF/telefone)
- `AuthProvider` (context para estado de autenticação)
- `useAuth` hook
- Server actions: `signUp`, `signIn`, `signOut`
- Trigger no Supabase: `handle_new_user` popula `profiles` com `first_name`, `last_name`, `phone`, `document_id`

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
- `ExpenseList` + `ExpenseForm` com 18 categorias
- **Correção Matemática**: Ajustado `entryTotal` para priorizar `entry.rent_value` em vez do valor cheio do contrato, garantindo a exibição correta dos totais de valores proporcionais de rescisões na listagem.

### `src/features/dashboard`
- Painel principal (`app/dashboard/page.tsx`) integrado com Supabase.
- Total a Receber, Recebido, Despesas e Lucro Líquido reais do mês selecionado.
- Gráfico de histórico de 6 meses (Receitas vs Despesas) com suporte a caução.
- Alertas dinâmicos de inadimplência (dias de atraso) e contratos terminando nos próximos 60 dias.
- **Correção Matemática**: Ajustado `calcTotal` para priorizar `entry.rent_value` em vez do aluguel padrão do contrato, garantindo consistência com a tela de mensalidades.

---

## Próximo Passo: Fase 6 — Polimento e Funcionalidades Extras

A Fase 6 deve implementar polimentos e recursos avançados conforme o planejado:
1. **Geração de Contratos em PDF**: Exportação automatizada de contratos.
2. **Renovação Rápida de Contrato**: A partir da tela de edição do contrato ou alertas do dashboard.
3. **Refinamento da Rescisão**: Integração das regras de rescisão flexível (multas, devolução/saldo de caução e geração automática de cobrança proporcional de fechamento).

