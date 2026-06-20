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
- **Data de Pagamento**: Quando o aluguel é pago, registra-se a `payment_date`.

### 4.3. Categorias de Despesas (`expenses`)
As categorias permitidas para despesas do proprietário são:
- Manutenção elétrica, Manutenção hidráulica, Reformas e pintura, Estrutura e telhado, Limpeza e jardinagem, IPTU, Condomínio, Seguro imobiliário, Taxas cartorárias, Água e esgoto, Energia elétrica, Internet e TV, Gás, Marketing e anúncios, Softwares e assinaturas, Material de escritório, Serviços profissionais, Outros.
