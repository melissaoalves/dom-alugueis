# DOM Aluguéis - Product Requirements Document (PRD)

## 1. Visão Geral do Produto
O **DOM Aluguéis** é um sistema SaaS/Web voltado para proprietários de imóveis (Landlords) que desejam gerenciar seus aluguéis, inquilinos, contratos e despesas de forma centralizada e eficiente.

A aplicação baseia-se em um backend utilizando **Supabase** (PostgreSQL) e uma interface moderna e responsiva.

## 2. Abordagem de Documentação Dinâmica (Agentes)
Conforme solicitado, este projeto será guiado por arquivos de documentação presentes no repositório (na pasta `docs/`). O objetivo é que, ao abrir novas janelas, a IA sempre consulte esses documentos para ter o contexto exato do que está sendo construído, padrões adotados e fase atual do projeto.

*Arquitetura de Documentação Proposta:*
- `docs/01-PRD.md`: Regras de negócio, escopo e requisitos (Este arquivo).
- `docs/02-ARCHITECTURE.md`: Decisões técnicas, stack e estrutura de pastas.
- `docs/03-SPRINTS.md`: Fases do projeto e tarefas.

---

## 3. Regras de Negócio e Banco de Dados (Supabase)

### 3.1. Perfis e Inquilinos
- **profiles**: Dados do proprietário (`first_name`, `last_name`, `document_id`, `phone`).
- **tenants**: Cadastro de inquilinos, vinculados a um `owner_id`. Contém dados pessoais, endereço e o campo `veaco` (indicador de histórico de inadimplência/mau pagador).
  - *Visão Futura*: Estes dados serão base para a funcionalidade de geração automática de contratos.

### 3.2. Imóveis (Properties)
- Cadastro de imóveis contendo valores base: `rent_value`, `condo_fee`, `water_value`, `energy_value`.
- **Regra de Cobrança (Água e Luz)**: Controlado via `billing_type` (`fixed`, `consumption`, `not_included`).
  - Se for valor fixo (`fixed`), usa os valores definidos na própria tabela.
  - Se for por consumo (`consumption`), o valor é lançado mensalmente.
  - Se não incluso (`not_included`), a responsabilidade é externa e não entra no sistema.

### 3.3. Contratos (Contracts)
- Vincula um Imóvel a um Inquilino.
- Possui valores próprios: `rent_value`, `water_value`, `energy_value`, `guarantee_amount`.
- **Análise sobre duplicação de campos**: A duplicação entre `properties` e `contracts` **é uma boa prática e deve ser mantida**.
  - *Motivo*: A tabela `properties` guarda o valor de "vitrine" ou o padrão atual. A tabela `contracts` guarda o valor **negociado e vigente** para aquele inquilino específico durante a validade do contrato. Se o valor do imóvel subir ano que vem, o contrato atual não é afetado até o reajuste.

### 3.4. Gestão Financeira (Lançamentos Mensais e Despesas)
- **monthly_entries**: Registra o pagamento do mês para um contrato/imóvel.
  - Guarda variáveis de consumo: `water_amount`, `energy_amount`.
  - Permite extras: `extra_amount` e `extra_description` (ex: multa por atraso, taxa extra de condomínio).
  - Controle de pagamento: `is_paid`.
- **expenses**: Despesas do proprietário.
  - Podem estar vinculadas a um imóvel (`property_id`) ou ser gerais (nulo).
  - Contém `amount`, `date` e `category`.

---

## 4. Questões para Brainstorm e Definição de Escopo

Para fecharmos este PRD antes de dividi-lo em fases/sprints, por favor, me ajude a esclarecer os seguintes pontos:

1. **Lançamentos Mensais (`monthly_entries`)**:
   - Como o sistema vai gerar esses lançamentos? O proprietário cria manualmente todo mês, ou o sistema deve gerar automaticamente um "rascunho" com o valor do aluguel e ele só preenche o consumo de água/luz antes de enviar a cobrança?
   - Quando `is_paid` é marcado como true, não precisaríamos de um `payment_date` para saber exatamente *quando* o inquilino pagou?

2. **Categorias de Despesas (`expenses`)**:
   - Quais categorias iniciais de gastos fazem sentido pra você? (Ex: Manutenção, Impostos/IPTU, Taxa Condominial, Reforma, Serviços).

3. **Multa e Juros**:
   - O sistema vai calcular multa e juros automaticamente caso passe da data de vencimento, ou o proprietário preencherá isso manualmente no campo `extra_amount`?
   - A propósito, não temos um campo `due_date` (data de vencimento) na tabela `monthly_entries`. Devemos adicionar?

4. **Dashboard Inicial**:
   - O que o proprietário mais quer ver ao abrir o app? (Ex: Inquilinos inadimplentes, lucro líquido do mês, despesas recentes).

---

## 5. Próximos Passos (Workflow)
1. Discutir e responder as questões acima.
2. Ajustar este PRD com as respostas.
3. Criar o documento `docs/03-SPRINTS.md` fatiando essas funcionalidades.
4. Iniciar o setup técnico.
