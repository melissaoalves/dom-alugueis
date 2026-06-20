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

## Fase 5: Dashboard e Métricas (Sprint 5) - [PRÓXIMA AÇÃO]
- **Painel Principal (Home/Dashboard)**:
  - Cards de **Total a Receber vs. Já Recebido** do mês.
  - Cálculo de **Lucro Líquido** (Recebimentos - Despesas).
  - Alerta de **Inadimplência** (cobranças em atraso).
  - Métricas de **Ocupação e Vacância** (imóveis com/sem contrato ativo).
  - Lembretes de **Próximos Vencimentos** (contratos terminando em 30/60 dias).

## Fase 6: Polimento e Funcionalidades Extras (Sprint 6 - Futuro)
- Geração automática de contratos em PDF.
- Exportação de relatórios (CSV/PDF).
- Histórico de pagamentos por inquilino.
- **Renovação rápida de contrato**:
  - Quando um contrato estiver vencendo (alerta já existe no dashboard), exibir botão "Renovar Contrato".
  - Abre o formulário de novo contrato pré-preenchido com todos os dados do contrato atual (imóvel, inquilino, valores, billing types, cláusulas).
  - Proprietário ajusta apenas o que mudou (valor, prazo, caução, etc.) e confirma.
  - Cria um contrato novo do zero — o antigo permanece no histórico como vencido/encerrado.
  - O novo contrato já vem com `is_renewal: true` marcado automaticamente (sem cobrança de caução duplicada no dashboard).
  - Implementar na página de edição do contrato vencido e/ou no alerta do dashboard.
