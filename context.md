# Contexto do Projeto: DOM Aluguéis

## 1. Visão Geral
Sistema SaaS/Web voltado para proprietários de imóveis (Landlords) gerenciarem de forma autônoma seus aluguéis, inquilinos, contratos e o fluxo de caixa (receitas e despesas).

## 2. Stack Tecnológica
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS.
- **Backend / BaaS**: Supabase (PostgreSQL para Banco de Dados, Auth para Autenticação).
- **Gerenciamento de Estado/Data Fetching**: A definir no setup (ex: React Query ou o próprio App Router do Next.js).

## 3. Arquitetura (Package by Feature)
Adotaremos a estrutura **Package by Feature**. Em vez de agrupar por tipo (todos os components juntos, todos os hooks juntos), agruparemos por funcionalidade/domínio da aplicação.

Exemplo de estrutura sugerida dentro de `src/` ou `app/`:
```text
src/
  features/
    properties/
      components/
      hooks/
      services/
    tenants/
    contracts/
    finance/ (monthly_entries e expenses)
    dashboard/
  shared/
    components/ (ui genérica, botões, inputs)
    utils/
    types/
```

## 4. Regras de Negócio Permanentes

### 4.1. Imóveis e Contratos
- **Duplicação Estratégica**: A tabela `properties` possui o valor de "vitrine" (base) do aluguel. A tabela `contracts` possui o valor **efetivamente negociado**. Isso preserva o histórico.
- **Cobrança de Água e Luz (`billing_type`)**:
  - `fixed`: Valor fixo (copiado para a cobrança).
  - `consumption`: O proprietário precisa preencher o consumo mensal no sistema antes de gerar a cobrança.
  - `not_included`: Não gerenciado pelo sistema.

### 4.2. Gestão Financeira Mensal
- O sistema gera os lançamentos (`monthly_entries`) pré-preenchidos replicando a informação do contrato. O proprietário apenas ajusta consumo de água/luz se aplicável.
- **Vencimento e Atrasos**: A tabela `contracts` possui o dia de vencimento (`due_day`) e as taxas de juros/multa. A tabela `monthly_entries` recebe a data exata de vencimento do mês (`due_date`).
- **Cálculo Automático**: Multa e juros são calculados automaticamente pelo sistema caso a data atual ultrapasse o `due_date` e o `is_paid` seja falso.
- **Isenção de multa/juros (`waive_late_fees`)**: o proprietário pode desmarcar a cobrança de multa/juros em um lançamento específico via checkbox no `MonthlyEntryCard` (aparece quando o lançamento está em atraso). Quando `true`, `calcLateFees` é chamado com taxas zeradas — o atraso em dias continua sendo exibido, mas nenhum valor de multa/juros é somado ao total nem exibido no boleto PIX.
- **Data de Pagamento**: Quando o aluguel é pago, registra-se a `payment_date`.
- **`monthly_entries.rent_value`**: coluna armazena o valor do aluguel da entrada (pode ser proporcional). Priorizado sobre `contracts.rent_value` em todos os cálculos de total.

### 4.3. Regras de Rescisão de Contrato
- **Contratos vencidos** (expirados naturalmente): não gerar cobranças após o mês final. Contrato terminando em junho → último lançamento é referente a maio.
- **Contratos rescindidos**: cobrar apenas os dias extras entre o `due_day` e o dia da rescisão no mês da rescisão. Ex: vencimento dia 10, rescisão dia 12 → 2 dias extras.
  - Se `end_date_day <= due_day`: sem cobrança extra.
  - Proporcional = `(dias_extras / dias_no_mês) × rent_value`.
- O `ContractStatusButton` cria o lançamento pro-rata com `rent_value`, `water_amount`, `energy_amount` proporcionais separados.

### 4.4. Cobrança via PIX
- `contracts.pix_key_guarantee` armazena a chave Pix usada para cobrar o inquilino daquele contrato.
- O `MonthlyEntryCard` oferece um botão que abre o `BillingSlipModal`, exibindo o detalhamento da cobrança do mês e um QR Code Pix (padrão BR Code, gerado em `src/features/finance/utils/pixPayload.ts`) para pagamento direto pelo inquilino, com opção de copiar o código "copia e cola" e baixar o comprovante como imagem.

### 4.6. Leitura de Energia (kWh)
- Energia é solar; o inquilino paga ao proprietário **apenas o consumo** (sem taxa mínima), com **uma tarifa única** (R$/kWh) para todos os imóveis, salva em `profiles.energy_kwh_rate`.
- Cada apartamento tem relógio próprio. A tabela `energy_readings` guarda o histórico do valor acumulado do relógio **por imóvel** (não por contrato — sobrevive à troca de inquilino).
- Fluxo: página `/dashboard/finance/energy` (`EnergyReadingList`; acessível pelo menu "Energia" e pelo botão "Leituras de energia" em Mensalidades) lista, uma linha por apartamento, os contratos com `energy_billing_type = 'consumption'` do mês, com filtro pendentes/lançadas e busca; informa-se a leitura atual e o sistema calcula `(atual − anterior) × tarifa` e grava em `monthly_entries.energy_amount`.
- Uma leitura por mês de referência (sem separar meses): a leitura feita hoje fatura todo o consumo desde a leitura anterior. Apartamento sem leitura anterior mostra um campo "Inicial" editável que começa em 0 — ao salvar, o sistema cria automaticamente a leitura inicial (datada no 1º dia do mês de referência) e não exige passo separado.
- Troca de relógio é registrada à parte (valor + data), no painel expandido de cada linha, e não gera cobrança. O botão de excluir leitura inicial/troca usa confirmação inline (o navegador do app bloqueia `window.confirm`).
- O botão "Salvar leituras" fica habilitado só com a tarifa preenchida e ao menos uma leitura atual digitada; a dica ao lado do botão informa o que falta.
- A energia é uma **cobrança separada, com PIX e valor próprios** (só o consumo), distinta do boleto de aluguel+água. O `MonthlyEntryCard` tem dois botões: QR Code (boleto aluguel+água, sem energia) e Zap (conta de energia). O `BillingSlipModal` é reaproveitado com `title`/`docType`; na conta de energia inclui o demonstrativo (leituras, período, kWh, tarifa, histórico de 6 meses e emitente). Ambos usam a mesma chave PIX do contrato (`pix_key_guarantee`). Obs.: `monthly_entries.is_paid` ainda marca o lançamento inteiro — não há controle de pagamento separado por conta (energia vs aluguel) ainda.
- `monthly_entries.energy_prev_reading / energy_curr_reading / energy_kwh / energy_kwh_rate` são um **snapshot** do que foi faturado (mudar a tarifa depois não altera cobranças antigas). Se o valor de energia for alterado à mão no card, o snapshot é limpo.
- `energy_readings.kind`: `regular` (faturada, ligada a `monthly_entry_id`), `initial` (primeira leitura do imóvel, sem cobrança), `meter_reset` (troca de relógio — nova base, sem cobrança).
- Leitura atual menor que a anterior é bloqueada. Na rescisão, basta lançar a leitura final na mensalidade proporcional do mês — consumo exato, sem pró-rata.

### 4.5. Despesas Agendadas
- Despesas com `due_date` e `is_settled = false` são "agendadas" (pendentes).
- Despesas normais têm `is_settled = true` (default).
- Somente despesas `is_settled = true` entram nos totais do dashboard e no gráfico de categorias.
- Ao confirmar pagamento (`settleExpense`): `is_settled = true`, `date = hoje`.
- Ao desfazer (`unsettleExpense`): `is_settled = false`.
- **TODO**: notificação por e-mail na data de vencimento (Supabase Edge Function + pg_cron).

### 4.3. Categorias de Despesas (`expenses`)
As categorias permitidas para despesas do proprietário são:
- Manutenção elétrica, Manutenção hidráulica, Reformas e pintura, Estrutura e telhado, Limpeza e jardinagem, IPTU, Condomínio, Seguro imobiliário, Taxas cartorárias, Água e esgoto, Energia elétrica, Internet e TV, Gás, Marketing e anúncios, Softwares e assinaturas, Material de escritório, Serviços profissionais, Outros.
