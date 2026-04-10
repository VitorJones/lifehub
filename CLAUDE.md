# LifeForge - Sistema de Gestão de Vida Pessoal

## Visão Geral

App web pessoal de gestão de vida inspirado no **Sistema Forja** (produtividade gamificada), mas expandido para cobrir todas as áreas: financeiro, hábitos, metas, agenda e tarefas. O objetivo é ter um hub único onde o usuário abre e tem o panorama completo da vida.

> **Importante:** Quando o usuário enviar screenshots do Sistema Forja ou de outros apps como referência visual, use-os como base para decisões de layout, espaçamento, paleta e estilo de componentes.

---

## Stack Técnica

- **Framework:** Next.js 14+ (App Router)
- **Banco de dados:**
  - **Desenvolvimento:** SQLite via Prisma ORM (local, zero config)
  - **Produção:** Turso (SQLite na nuvem) via `@prisma/adapter-libsql`
- **Estilização:** Tailwind CSS + shadcn/ui
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Estado:** React hooks (useState, useReducer, useContext)
- **Datas:** date-fns com locale pt-BR
- **Deploy:** Vercel + Turso

---

## Diretrizes de Design

### Referências Visuais

- **Sistema Forja**: produtividade gamificada, cards com progresso visual, barras de XP, visual dark elegante
- **Linear**: sidebar escura minimalista, tipografia limpa, transições suaves
- **Vercel Dashboard**: gráficos minimalistas, espaçamento generoso, dados bem hierarquizados
- **Notion**: organização modular, blocos de conteúdo flexíveis

### Paleta de Cores (Dark Mode)

```css
:root {
  /* Fundos */
  --bg-primary: #0a0a0b;       /* Fundo principal */
  --bg-secondary: #111113;     /* Cards e superfícies */
  --bg-tertiary: #1a1a1f;      /* Hover e elevações */
  --bg-elevated: #222228;      /* Elementos destacados */

  /* Acentos */
  --accent-primary: #f97316;   /* Laranja — ações principais */
  --accent-secondary: #ef4444; /* Vermelho — alertas, deadlines */
  --accent-success: #22c55e;   /* Verde — concluído, positivo */
  --accent-info: #3b82f6;      /* Azul — informativo */
  --accent-warning: #eab308;   /* Amarelo — atenção */
  --accent-purple: #a855f7;    /* Roxo — metas, conquistas */

  /* Texto */
  --text-primary: #f5f5f5;
  --text-secondary: #a1a1aa;
  --text-muted: #52525b;

  /* Bordas */
  --border-default: #27272a;
  --border-hover: #3f3f46;
}
```

### Tipografia

- **Headings:** `Sora` (Google Fonts) — geométrica, moderna, tech-friendly
- **Body:** `DM Sans` (Google Fonts) — limpa e legível
- **Monospace / Dados:** `JetBrains Mono` — valores financeiros, contadores

### Princípios de UI

- **Dark mode only** (sem toggle light/dark)
- Cards com `border: 1px solid var(--border-default)` e `border-radius: 12px`
- Glassmorphism sutil em cards destacados (`backdrop-blur + bg-opacity`)
- Barras de progresso com gradientes suaves (laranja → vermelho)
- Transições com `transition-all duration-200 ease-out`
- Espaçamento generoso — nunca amontoar informação
- Micro-interações em hover (scale sutil, brilho de borda)
- Ícones Lucide em 20px para itens de menu, 16px inline

### Elementos de Gamificação (inspirados no Forja)

- **Streaks visuais**: contador de dias consecutivos com ícone de fogo
- **Barras de progresso**: porcentagem de hábitos completados no dia/semana
- **Indicadores de tendência**: setas ↑↓ com cores (verde/vermelho) comparando com período anterior
- **Completude visual**: checkmarks animados, cards que mudam de estado visual ao completar

---

## Estrutura de Navegação

Sidebar fixa à esquerda com 6 abas:

| Ordem | Aba | Ícone (Lucide) | Rota |
|-------|-----|-----------------|------|
| 1 | Dashboard | `LayoutDashboard` | `/` |
| 2 | Financeiro | `Wallet` | `/financeiro` |
| 3 | Hábitos & Metas | `Target` | `/habitos` |
| 4 | Agenda | `Calendar` | `/agenda` |
| 5 | Tarefas | `CheckSquare` | `/tarefas` |
| 6 | Amigos | `Users` | `/amigos` |

### Sidebar

- Fixa, colapsável (ícones only em mobile)
- Logo/nome do app no topo
- Indicador visual da aba ativa (highlight laranja na borda esquerda)
- Rodapé da sidebar: configurações (engrenagem)

---

## Schema do Banco de Dados (Prisma)

```prisma
// ==========================================
// FINANCEIRO
// ==========================================

// --- Contas bancárias ---
model Conta {
  id          String   @id @default(cuid())
  nome        String   // "Nubank", "C6", "Itaú"
  tipo        String   // "bank" | "carteira" | "corretora"
  saldoInicial Float   @default(0)
  cor         String   @default("#22c55e")
  icone       String   @default("Building2") // Lucide icon
  ativo       Boolean  @default(true)
  transacoes  Transacao[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// --- Categorias de gastos/receitas ---
model Categoria {
  id         String   @id @default(cuid())
  nome       String   // "Academia", "Alimentação", "Salário"
  tipo       String   // "receita" | "despesa"
  cor        String   // hex color
  icone      String   // nome do ícone Lucide
  transacoes Transacao[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// --- Transações (entradas e saídas) ---
model Transacao {
  id            String    @id @default(cuid())
  descricao     String
  valor         Float
  tipo          String    // "receita" | "despesa"
  data          DateTime
  categoriaId   String
  categoria     Categoria @relation(fields: [categoriaId], references: [id])
  contaId       String
  conta         Conta     @relation(fields: [contaId], references: [id])
  cartaoId      String?   // se foi no cartão de crédito
  cartao        Cartao?   @relation(fields: [cartaoId], references: [id])
  faturaId      String?   // se pertence a uma fatura
  fatura        Fatura?   @relation(fields: [faturaId], references: [id])
  parcelamentoId String?
  parcelamento  Parcelamento? @relation(fields: [parcelamentoId], references: [id])
  recorrenteId  String?
  recorrente    Recorrente?   @relation(fields: [recorrenteId], references: [id])
  observacao    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// --- Cartões de crédito ---
model Cartao {
  id           String   @id @default(cuid())
  nome         String   // "Nu", "C6"
  bandeira     String   // "visa" | "mastercard" | "elo"
  limite       Float
  diaFechamento Int     // dia do mês (1-31)
  diaVencimento Int     // dia do mês (1-31)
  cor          String   @default("#a855f7") // cor do card visual
  transacoes   Transacao[]
  faturas      Fatura[]
  parcelamentos Parcelamento[]
  ativo        Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// --- Faturas de cartão ---
model Fatura {
  id          String   @id @default(cuid())
  cartaoId    String
  cartao      Cartao   @relation(fields: [cartaoId], references: [id])
  mesReferencia String // "2026-04" (YYYY-MM)
  status      String   @default("aberta") // "aberta" | "fechada" | "paga"
  totalFatura Float    @default(0)
  transacoes  Transacao[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([cartaoId, mesReferencia])
}

// --- Parcelamentos ---
model Parcelamento {
  id            String   @id @default(cuid())
  descricao     String
  valorTotal    Float
  numParcelas   Int
  parcelaAtual  Int      @default(1)
  valorParcela  Float
  cartaoId      String?
  cartao        Cartao?  @relation(fields: [cartaoId], references: [id])
  categoriaId   String?
  dataInicio    DateTime
  ativo         Boolean  @default(true)
  transacoes    Transacao[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// --- Transações recorrentes (salário, aluguel, assinaturas) ---
model Recorrente {
  id          String   @id @default(cuid())
  descricao   String
  valor       Float
  tipo        String   // "receita" | "despesa"
  categoriaId String?
  contaId     String?
  diaExecucao Int      // dia do mês para processar
  frequencia  String   @default("mensal") // "mensal" | "semanal" | "anual"
  ativo       Boolean  @default(true)
  transacoes  Transacao[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// --- Alocação de renda (orçamento por categoria) ---
model Alocacao {
  id          String   @id @default(cuid())
  nome        String   // "Essenciais", "Lazer", "Investimentos"
  percentual  Float?   // % da renda (ex: 50)
  valorFixo   Float?   // ou valor fixo em R$
  cor         String   @default("#3b82f6")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// --- Investimentos + Caixinhas (metas de economia) ---
model Investimento {
  id              String   @id @default(cuid())
  nome            String   // "Tesouro Selic", "CDB Nubank", "Caixinha Viagem"
  tipo            String   // "renda_fixa" | "renda_variavel" | "caixinha"
  instituicao     String?  // "Nubank", "XP", "Rico"
  valorInvestido  Float    @default(0)
  rendimentoAnual Float?   // % ao ano (ex: 13.25 para Selic)
  tipoRendimento  String?  // "cdi" | "prefixado" | "ipca+" | "selic" | "outro"
  dataInicio      DateTime
  dataVencimento  DateTime?
  valorAtual      Float    @default(0) // valor estimado atual
  // Campos para caixinha (meta de economia)
  ehCaixinha      Boolean  @default(false)
  metaValor       Float?   // valor alvo da caixinha
  aportes         Aporte[]
  ativo           Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Aporte {
  id              String   @id @default(cuid())
  investimentoId  String
  investimento    Investimento @relation(fields: [investimentoId], references: [id], onDelete: Cascade)
  valor           Float
  tipo            String   @default("deposito") // "deposito" | "resgate"
  data            DateTime
  createdAt       DateTime @default(now())
}

// ==========================================
// HÁBITOS & METAS
// ==========================================

model Habito {
  id          String   @id @default(cuid())
  nome        String
  descricao   String?
  icone       String   // emoji ou nome do ícone Lucide
  cor         String   // hex color
  diasSemana  String   // JSON array: [0,1,2,3,4,5,6] (0=dom, 1=seg, ..., 6=sab)
  ordem       Int      @default(0) // para reordenação (setas ↑↓)
  registros   RegistroHabito[]
  metas       Meta[]   // metas vinculadas a este hábito
  ativo       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model RegistroHabito {
  id        String   @id @default(cuid())
  habitoId  String
  habito    Habito   @relation(fields: [habitoId], references: [id], onDelete: Cascade)
  data      DateTime // apenas a data (sem hora), para marcar dia concluído
  concluido Boolean  @default(true)
  createdAt DateTime @default(now())

  @@unique([habitoId, data])
}

model Meta {
  id          String   @id @default(cuid())
  titulo      String
  descricao   String?
  categoria   String   // "pessoal" | "saude" | "financeiro" | "carreira" | "educacao" | "espiritual"
  valorAlvo   Float?   // para metas quantitativas (ex: 12)
  valorAtual  Float    @default(0) // progresso atual
  unidade     String?  // "livros", "km", "kg", etc.
  prazo       DateTime?
  status      String   @default("ativa") // "ativa" | "pausada" | "concluida"
  // Vínculo com hábito (progresso automático)
  habitoId    String?
  habito      Habito?  @relation(fields: [habitoId], references: [id])
  vinculoTipo String   @default("nenhum") // "nenhum" | "manual" | "habito"
  // Checkpoints / Sub-tarefas
  checkpoints Checkpoint[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Checkpoint {
  id        String   @id @default(cuid())
  metaId    String
  meta      Meta     @relation(fields: [metaId], references: [id], onDelete: Cascade)
  titulo    String   // ex: "Livro 1 - O Senhor dos Anéis"
  concluido Boolean  @default(false)
  ordem     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ==========================================
// AGENDA
// ==========================================

model Compromisso {
  id            String   @id @default(cuid())
  titulo        String
  descricao     String?
  data          DateTime // data do compromisso
  horaInicio    String?  // "14:00" (null se diaInteiro)
  horaFim       String?  // "15:30" (null se diaInteiro)
  duracaoMin    Int?     // duração em minutos (calculada ou informada)
  diaInteiro    Boolean  @default(false)
  local         String?
  cor           String   @default("#3b82f6") // cor/etiqueta do compromisso
  // Recorrência
  recorrencia   String   @default("nenhuma") // "nenhuma" | "diario" | "semanal" | "quinzenal" | "mensal" | "anual" | "personalizado"
  recorrenciaConfig String? // JSON para personalizado: { "intervalo": 2, "unidade": "semanas", "diasSemana": [1,3,5], "dataFim": "2026-12-31" }
  // Lembrete
  lembreteMin   Int?     // minutos antes (0=no horário, 5, 15, 30, 60, 1440=1dia)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Aniversario {
  id            String   @id @default(cuid())
  nome          String   // nome da pessoa
  dia           Int      // dia do mês (1-31)
  mes           Int      // mês (1-12)
  anoNascimento Int?     // ano (opcional, para calcular idade)
  relacao       String?  // "familia" | "amigo" | "trabalho" | "igreja" | "outro"
  lembreteMin   Int      @default(1440) // minutos antes (padrão: 1 dia = 1440min)
  notas         String?  // ex: "gosta de chocolate"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ==========================================
// TAREFAS
// ==========================================

model Tarefa {
  id           String   @id @default(cuid())
  titulo       String
  descricao    String?
  status       String   @default("pendente") // "pendente" | "concluida"
  prioridade   String   @default("media")    // "baixa" | "media" | "alta" | "urgente"
  dataLimite   DateTime? // prazo (data + hora opcional)
  dataConclusao DateTime?
  cor          String   @default("#3b82f6") // cor da tarefa
  categoria    String?  // "trabalho" | "pessoal" | "igreja" | "estudos" | "saude" | "outro"
  tags         String?  // JSON array: ["urgente", "reunião", "compras"]
  // Recorrência
  recorrente   Boolean  @default(false)
  recorrenciaConfig String? // JSON: { "diasSemana": [1,3,5] } para repetir em dias específicos
  // Sub-tarefas
  subTarefas   SubTarefa[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SubTarefa {
  id        String   @id @default(cuid())
  tarefaId  String
  tarefa    Tarefa   @relation(fields: [tarefaId], references: [id], onDelete: Cascade)
  titulo    String
  concluida Boolean  @default(false)
  ordem     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ==========================================
// AMIGOS
// ==========================================

model Amigo {
  id              String   @id @default(cuid())
  nome            String
  dataNascimento  DateTime? // data completa (dia/mês/ano) para cálculo de idade
  notas           String?   // campo livre — textarea para qualquer anotação
  aniversarioId   String?   // vínculo com Aniversario da Agenda (criado automaticamente)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## Módulos — Detalhamento

### 1. Dashboard (`/`)

O dashboard é o hub central do app — agrega dados de **todos os módulos** em uma única página. O objetivo é abrir o app e ter o panorama completo do dia/semana/mês.

**Layout (grid responsivo, de cima pra baixo):**

```
┌─────────────────────────────────────────────────────────────┐
│  Saudação + data de hoje + dia da semana                    │
├───────────┬───────────┬───────────┬───────────┬─────────────┤
│  Card:    │  Card:    │  Card:    │  Card:    │  Card:      │
│  Saldo    │  Hábitos  │  Tarefas  │  Metas    │  Próx.      │
│  do mês   │  de hoje  │  do dia   │  ativas   │  Aniversário│
├───────────┴───────────┴───────────┼───────────┴─────────────┤
│                                   │                         │
│  Widget: Tracker de Água          │  Próximos Compromissos  │
│  (meta diária + progresso)        │  (lista dos próx. 7d)   │
│                                   │                         │
├───────────────────────────────────┴─────────────────────────┤
│  Gráfico: Receitas vs Despesas (últimos 6 meses)            │
├─────────────────────────────┬───────────────────────────────┤
│  Hábitos — Progresso da     │  Metas em progresso           │
│  semana (mini grade)        │  (barras de progresso)        │
├─────────────────────────────┼───────────────────────────────┤
│  Tarefas atrasadas          │  Aniversários próximos        │
│  (lista com alerta)         │  (countdown)                  │
└─────────────────────────────┴───────────────────────────────┘
```

---

#### Seção 1 — Saudação

- "Bom dia / Boa tarde / Boa noite" (baseado no horário)
- Data completa: "Quarta-feira, 8 de Abril de 2026"
- Tom acolhedor e motivacional

---

#### Seção 2 — Cards de Resumo (5 cards em row)

| Card | Ícone | Cor do valor | Dados |
|------|-------|-------------|-------|
| **Saldo do Mês** | `Wallet` | Verde/vermelho | Receitas - Despesas, indicador ↑↓ vs mês anterior |
| **Hábitos de Hoje** | `CheckSquare` | Laranja | X de Y completados, mini barra de progresso |
| **Tarefas do Dia** | `ListTodo` | Azul | X pendentes, Y concluídas |
| **Metas Ativas** | `Target` | Roxo | X metas em andamento, % médio de progresso |
| **Próx. Aniversário** | `Cake` | Rosa | Nome + "em X dias" (o mais próximo) |

---

#### Seção 3 — Tracker de Água + Próximos Compromissos (lado a lado)

##### Widget: Tracker de Água (inspirado no Sistema Forja)

Card escuro com visual clean:
- **Header:** ícone 💧 + "Água" + progresso "Xml / 2L" + engrenagem para configurar meta
- **Lado esquerdo:** barras horizontais dos últimos 7 dias (Qui, Sex, Sáb, Dom, Seg, Ter, Qua)
  - Cada barra mostra proporcionalmente quanto bebeu no dia
  - Dia atual destacado (cor azul/ciano)
- **Lado direito:** botão circular grande "+ 250ml" para adicionar água
  - Círculo de progresso ao redor (0% a 100%)
  - Porcentagem embaixo
- **Configurações (engrenagem):**
  - Meta diária em ml (padrão: 2000ml)
  - Incremento do botão (250ml, 300ml, 500ml)

**Schema adicional (Prisma):**
```prisma
model AguaRegistro {
  id        String   @id @default(cuid())
  data      DateTime // apenas data (sem hora)
  quantidade Int     // ml consumidos no dia
  meta      Int      @default(2000) // meta diária em ml
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([data])
}
```

**API:**
- `GET /api/agua?dias=7` — retorna registros dos últimos X dias
- `POST /api/agua/adicionar` — adiciona ml ao dia atual (cria registro se não existir, soma se existir)
- `PUT /api/agua/meta` — atualiza meta diária

##### Próximos Compromissos

- Lista dos próximos compromissos (7 dias)
- Cada item: barra de cor + horário + título + local (se houver)
- Se não houver: "Nenhum compromisso nos próximos 7 dias"
- Link "Ver agenda completa →" no rodapé

---

#### Seção 4 — Gráfico Financeiro

- **Gráfico de barras:** Receitas vs Despesas dos últimos 6 meses
- Barras verdes (receitas) e vermelhas (despesas) lado a lado
- Eixo X: nomes dos meses, Eixo Y: valores em R$
- Hover mostra tooltip com valores exatos
- Link "Ver financeiro completo →" no rodapé

---

#### Seção 5 — Hábitos da Semana + Metas (lado a lado)

##### Hábitos — Progresso da Semana

- Mini grade resumida: hábitos (linhas) × dias da semana atual (colunas)
- Bolinhas: verde = concluído, vermelho = pendente, cinza = não programado
- "X% de conclusão esta semana"
- Link "Ver hábitos →"

##### Metas em Progresso

- Top 3-4 metas ativas, cada uma com:
  - Título + categoria (badge)
  - Barra de progresso (valor atual / valor alvo)
  - Prazo: "X dias restantes"
- Link "Ver todas as metas →"

---

#### Seção 6 — Tarefas Atrasadas + Aniversários (lado a lado)

##### Tarefas Atrasadas

- Lista das tarefas com prazo vencido (máx. 5)
- Cada item: título + "X dias de atraso" (vermelho) + prioridade (badge)
- Se nenhuma: "Nenhuma tarefa atrasada 🎉"
- Link "Ver tarefas →"

##### Aniversários Próximos

- Próximos 3-4 aniversários com:
  - Nome + ícone 🎂
  - Data + "em X dias"
  - Idade que vai completar (se ano informado)
  - Se amigo cadastrado, link para o card do amigo
- Link "Ver todos os aniversários →"

### 2. Financeiro (`/financeiro`)

O módulo financeiro é o mais robusto do app. Usa **sub-abas internas** (tab bar horizontal no topo da página, estilo Forja) para organizar diferentes visões. A sub-aba ativa tem destaque com fundo colorido (vermelho/laranja) e as inativas são texto com ícone.

**Sub-abas (11 total):**

| Sub-aba | Ícone (Lucide) | Rota |
|---------|----------------|------|
| Visão Geral | `BarChart3` | `/financeiro` |
| Transações | `Receipt` | `/financeiro/transacoes` |
| Mensal | `CalendarDays` | `/financeiro/mensal` |
| Parcelamentos | `CreditCard` | `/financeiro/parcelamentos` |
| Contas | `Building2` | `/financeiro/contas` |
| Categorias | `Tags` | `/financeiro/categorias` |
| Cartões | `CreditCard` | `/financeiro/cartoes` |
| Faturas | `FileText` | `/financeiro/faturas` |
| Recorrentes | `RefreshCw` | `/financeiro/recorrentes` |
| Alocação | `PiggyBank` | `/financeiro/alocacao` |
| Investimentos | `TrendingUp` | `/financeiro/investimentos` |

**Botão flutuante "+" (FAB):** canto inferior direito, vermelho, abre modal para adicionar transação rápida. Presente em todas as sub-abas.

---

#### 2.1 Visão Geral (`/financeiro`)

**Seção 1 — Header do mês:**
- Título "Abril 2026" com navegação ← → entre meses
- 4 cards em grid: Renda (verde), Gastos (vermelho), Saldo Mês (azul), Investido (roxo)
- Cada card: ícone + label + valor em R$ com cor semântica

**Seção 2 — Saldo Geral das Contas:**
- Card largo: soma de todas as contas bancárias
- Texto: "Soma de todas as suas contas"

**Seção 3 — Gráficos lado a lado:**
- Esquerda: "Gastos por Categoria" — gráfico donut/pizza com legenda
- Direita: "Evolução Mensal" — gráfico de barras (últimos 6 meses, receita vs despesa)

**Seção 4 — Fluxo Anual:**
- Gráfico de área/linha: Receitas vs Gastos mês a mês no ano inteiro (Jan-Dez)
- Saldo do ano no canto superior direito
- Legenda: bolinha verde = Receitas, bolinha vermelha = Gastos

**Seção 5 — Cards de contagem:**
- 4 cards em grid: Contas (qtd), Cartões (qtd), Categorias (qtd), Transações (qtd)

**Seção 6 — Transações Recentes:**
- Lista das últimas 5-10 transações com empty state "Nenhuma transação registrada ainda."

---

#### 2.2 Transações (`/financeiro/transacoes`)

**Topo — 3 cards resumo:**
- Entradas (verde), Saídas (vermelho), Balanço (azul/ciano)

**Barra de filtros:**
- Input de busca "Buscar transações..."
- Dropdown: Tipo (Todos / Receita / Despesa)
- Dropdown: Categoria (Todas categorias)
- Dropdown: Conta (Todas contas)

**Tabela/Lista de transações:**
- Cada item: data, descrição, categoria (badge), conta, valor (verde/vermelho)
- Empty state: "Nenhuma transação encontrada"
- Ordenação por data (mais recente primeiro)

---

#### 2.3 Mensal (`/financeiro/mensal`)

**Topo — Seletor de ano:**
- "2026" com setas ← → para navegar anos

**Gráfico — Saldo por Mês:**
- Gráfico de linha: saldo de cada mês ao longo do ano

**Grid de meses (4 colunas):**
- 12 cards (Jan-Dez), cada um com:
  - Nome do mês + badge "Atual" no mês corrente
  - Ícone de editar (lápis)
  - Renda: R$ X (verde)
  - Gastos: R$ X (vermelho)
  - Saldo: R$ X (amarelo)
  - Quantidade de transações

---

#### 2.4 Parcelamentos (`/financeiro/parcelamentos`)

**Header:** "Parcelamentos" + subtítulo "Controle suas compras parceladas"
**Botão:** "+ Novo Parcelamento" (vermelho)

**Lista de parcelamentos ativos:**
- Cada card: descrição, valor da parcela, parcela atual/total (ex: "3/12"), cartão associado, próximo vencimento
- Barra de progresso mostrando quantas parcelas já foram pagas
- Empty state: "Nenhum parcelamento ativo."

**Modal de novo parcelamento:**
- Descrição, valor total, nº de parcelas, cartão, categoria, data início

---

#### 2.5 Contas (`/financeiro/contas`)

**Header:** "Suas Contas" + botão "+ Nova Conta" (vermelho)

**Grid de cards (2-3 colunas):**
- Cada conta: ícone banco + nome + tipo (Bank/Carteira) + botão lixeira
- Saldo Atual em destaque (verde)
- "Este mês": entradas (verde ↗) e saídas (vermelho ↘)

**Modal de nova conta:**
- Nome, tipo (banco/carteira/corretora), saldo inicial, cor, ícone

---

#### 2.6 Categorias (`/financeiro/categorias`)

**Header:** "Categorias de Gastos" + botão "+ Nova Categoria" (vermelho)

**Grid de cards (3 colunas):**
- Cada categoria: ícone colorido + nome + botões editar/excluir
- "Gasto este mês: R$ X"
- "Total histórico: R$ X"

**Categorias padrão (seed):**
- Academia, Jogos, Alimentação, Gasolina, Lazer, Carro, Viagem, Diversos

---

#### 2.7 Cartões (`/financeiro/cartoes`)

**Header:** "Cartões de Crédito" + botão "+ Novo Cartão" (vermelho)

**Grid de cards (2 colunas):**
- **Card visual do cartão** (estilo cartão real):
  - Cor de fundo do cartão (gradiente, ex: roxo Nubank, cinza C6)
  - Nome do cartão, chip visual, **** **** **** ****
  - Titular + bandeira (Visa/Mastercard)
  - "VENCE dia X"
  - Botão lixeira
- **Card de info abaixo do cartão:**
  - Usado este mês: R$ X (vermelho)
  - Disponível: R$ X (verde)
  - Limite total: R$ X
  - Fecha dia: X

**Modal de novo cartão:**
- Nome, bandeira, limite, dia fechamento, dia vencimento, cor

---

#### 2.8 Faturas (`/financeiro/faturas`)

**Header:** "Faturas" + botão "+ Nova Fatura" (vermelho)

**Lista de faturas (por cartão):**
- Cada fatura: ícone do cartão + nome + mês referência
- Badge de status: "Aberta" (amarelo), "Fechada" (azul), "Paga" (verde)
- Total da Fatura: R$ X (vermelho)
- 3 botões de ação: "Importar" | "Fechar" | "Pagar" (verde)

---

#### 2.9 Recorrentes (`/financeiro/recorrentes`)

**Header:** "Transações Recorrentes" + botões "Processar" + "+ Nova Recorrente" (vermelho)

**Funcionalidade:**
- Cadastro de transações automáticas (salário, aluguel, Netflix, Spotify, etc.)
- Botão "Processar" gera as transações do mês na conta correta
- Descrição auxiliar: "Crie transações automáticas para salário, aluguel, assinaturas..."

**Lista de recorrentes:**
- Cada item: descrição, valor, tipo (receita/despesa), frequência, dia de execução, ativo/inativo
- Empty state: "Nenhuma transação recorrente configurada"

---

#### 2.10 Alocação (`/financeiro/alocacao`)

**Header:** "Alocação de Renda" + subtítulo "Planeje para onde vai seu dinheiro" + botão "+ Nova Alocação" (vermelho)

**4 cards resumo no topo:**
- Renda do Mês (verde), Total Alocado (amarelo), Restante (vermelho/verde), % Alocado (roxo)

**Seção dividida em 2 colunas:**
- Esquerda: "Suas Alocações" — lista de categorias de orçamento com valor/percentual
- Direita: "Distribuição da Renda" — gráfico donut/pizza mostrando proporção

---

#### 2.11 Investimentos (`/financeiro/investimentos`) — **NOVA**

**Header:** "Investimentos & Caixinhas" + subtítulo "Acompanhe seu patrimônio investido" + botão "+ Novo Investimento"

**3 cards resumo no topo:**
- Total Investido (verde), Rendimento Estimado (azul), Total em Caixinhas (roxo)

**Seção: Investimentos (renda fixa/variável)**
- Grid de cards, cada investimento:
  - Nome + instituição + tipo (badge: "CDB", "Tesouro", "LCI")
  - Valor investido + rendimento anual (% a.a.)
  - Tipo de rendimento (CDI, Prefixado, IPCA+, Selic)
  - Data de vencimento (se aplicável)
  - Valor atual estimado (calculado: valor × (1 + taxa)^tempo)
  - Botões: editar, registrar aporte, excluir

**Seção: Caixinhas (metas de economia)**
- Cards com barra de progresso (valor atual / meta)
- Nome da caixinha (ex: "Viagem Curitiba", "Reserva Emergência")
- Total guardado + nº de aportes
- Botão "Guardar" para novo aporte

**Seção: Histórico de Aportes**
- Lista cronológica de todos os aportes/resgates
- Filtro por investimento/caixinha

**Modal de novo investimento:**
- Nome, tipo (renda fixa / renda variável / caixinha)
- Se renda fixa: instituição, rendimento % a.a., tipo rendimento, vencimento
- Se caixinha: valor meta
- Valor inicial, data início

### 3. Hábitos & Metas (`/habitos`)

O módulo usa **sub-abas** (tab bar horizontal no topo, mesmo estilo do financeiro):

| Sub-aba | Ícone (Lucide) | Rota |
|---------|----------------|------|
| Hábitos | `CheckSquare` | `/habitos` |
| Metas | `Target` | `/habitos/metas` |

---

#### 3.1 Hábitos (`/habitos`)

Dentro de Hábitos há **3 visualizações** via toggle no topo (estilo Forja):

| Toggle | Ícone | Descrição |
|--------|-------|-----------|
| Hoje | `Calendar` | Lista de hábitos do dia com checkbox |
| Mês | `Calendar` | Grade mensal hábitos × dias (para marcar retroativamente) |
| Dashboards | `LayoutGrid` | Gráficos e estatísticas de progresso |

**Botão:** "+ Novo Hábito" (vermelho, canto superior direito)

---

##### 3.1.1 Visualização "Hoje"

**Card do dia no topo:**
- Dia da semana (ex: "QUINTA-FEIRA")
- Número grande (ex: "2")
- Mês e ano (ex: "abril de 2026")
- Barra de progresso do dia: "Progresso do dia — 0/9"

**Lista de hábitos do dia:**
- Cada hábito é uma row com:
  - Setas ↑↓ para reordenar
  - Checkbox circular para marcar como concluído
  - Ícone/emoji do hábito
  - Nome do hábito + subtítulo opcional (ex: "Plano Bíblico")
  - Menu ⋮ (editar, excluir, pausar)
- Apenas hábitos programados para o dia da semana atual aparecem
- Ao marcar, checkbox fica preenchido com animação

---

##### 3.1.2 Visualização "Mês"

**Header:** "Abril 2026" com setas ← → para navegar meses

**3 cards de estatísticas no topo:**
- Maior streak
- Hábitos ativos (total)
- Total feitos (no mês)

**Grade mensal (a funcionalidade mais importante):**
- **Eixo Y (linhas):** cada hábito com ícone + nome + % de conclusão no mês
- **Eixo X (colunas):** dias do mês agrupados por semana (Semana 1, Semana 2, etc.)
  - Cabeçalho: D S T Q Q S S com número do dia abaixo
- **Células:** checkbox circular em cada interseção hábito × dia
  - Círculo vermelho com borda = dia programado mas não concluído
  - Círculo preenchido = concluído
  - Ícone cadeado/cinza = dia não programado para aquele hábito
  - **Pode clicar em qualquer dia passado para marcar retroativamente**
- Dia atual destacado com borda/fundo diferente (vermelho)

> **Essa grade é essencial** — permite ver todos os hábitos de uma vez e completar dias esquecidos.

---

##### 3.1.3 Visualização "Dashboards"

**Card: Meta da Semana**
- Baseada no histórico do usuário
- Progresso circular (%) + contagem (ex: "0/8")
- Meta % e Média % do período
- Badge: "Acessível" / "Desafiador" / "Difícil"
- Texto: "Faltam X hábitos para sua meta"

**Gráfico: Evolução Mensal de Hábitos**
- Gráfico de barras ou área: % de conclusão por dia do mês
- Eixo Y: 0% a 100%
- Eixo X: dias 1 a 30/31
- Navegação ← → entre meses
- Subtítulo: "Abril De 2026" (com cor de destaque)

---

##### Modal: Novo Hábito

**Campos:**
- Nome do hábito *
- Descrição (opcional)
- Ícone/emoji
- Cor
- Dias da semana (multi-select: D S T Q Q S S) — checkboxes visuais para cada dia
- Horário sugerido (opcional)

---

#### 3.2 Metas (`/habitos/metas`)

**Header:** "Metas" + subtítulo "X ativas · Y concluídas" + botão "+ Nova Meta" (vermelho)

**Filtros por status (toggle pills):**
- Ativas (vermelho quando selecionado)
- Concluídas
- Pausadas

**Lista de metas (cards):**
- Cada meta card:
  - Ícone da categoria + título da meta
  - Categoria (badge)
  - Barra de progresso (valor atual / valor alvo + unidade)
  - Prazo com countdown ("faltam X dias")
  - Status badge (ativa/pausada/concluída)
  - Lista de checkpoints/sub-tarefas com checkboxes
  - Botões: editar, pausar, excluir

**Empty state:** ícone alvo + "Nenhuma meta ativa" + botão "Criar meta"

---

##### Modal: Nova Meta (Wizard de 4 etapas com barra de progresso)

**Etapa 1 de 4 — Objetivo:**
- "Qual é a sua meta?" * (input texto, placeholder: "Ex: Ler 12 livros este ano")
- "Descrição (opcional)" (textarea, placeholder: "Descreva sua meta com mais detalhes...")
- Botões: Cancelar | Continuar >

**Etapa 2 de 4 — Categoria:**
- "Escolha a categoria" — lista de opções com ícone/emoji, seleção única com checkmark:
  - 🧑 Pessoal
  - 💪 Saúde
  - 💰 Financeiro
  - 💼 Carreira
  - 📚 Educação
  - ✝️ Espiritual (adicional ao Forja)
- Botões: < Voltar | Continuar >

**Etapa 3 de 4 — Métricas:**
- "Defina as métricas (opcional)"
- Valor alvo (input numérico, placeholder: "Ex: 12")
- Unidade (input texto, placeholder: "Ex: livros, km")
- Prazo (date picker: "Selecione um prazo")
- Botões: < Voltar | Continuar >

**Etapa 4 de 4 — Detalhes:**
- "Vincular a um hábito (opcional)"
  - Explicação: "Cada vez que o hábito for concluído, o progresso da meta será incrementado automaticamente."
  - Lista de hábitos existentes para selecionar (radio): Nenhum, Manual, [hábitos cadastrados]
- "Checkpoints / Sub-tarefas (opcional)"
  - Input para adicionar sub-tarefas (ex: nome do livro 1, livro 2, etc.)
  - Botão "+ Adicionar checkpoint"
- Botões: < Voltar | ✨ Criar Meta

---

##### Vínculo Hábito ↔ Meta

Quando uma meta é vinculada a um hábito:
- Cada vez que o hábito é marcado como concluído, o `valorAtual` da meta incrementa automaticamente (+1)
- O card da meta mostra de qual hábito vem o progresso
- Metas sem vínculo têm progresso atualizado manualmente

### 4. Agenda (`/agenda`)

O módulo de agenda segue o mesmo visual dark do app, com sub-abas para diferentes visões.

**Sub-abas:**

| Sub-aba | Ícone (Lucide) | Rota |
|---------|----------------|------|
| Calendário | `Calendar` | `/agenda` |
| Compromissos | `Clock` | `/agenda/compromissos` |
| Aniversários | `Cake` | `/agenda/aniversarios` |

---

#### 4.1 Calendário (`/agenda`)

**Topo — Toggle de visualização:**
- Mês (padrão) | Semana | Dia
- Navegação ← → entre períodos + botão "Hoje" pra voltar ao dia atual
- Título: "Abril 2026" / "Semana 14 — Abril 2026" / "Quarta, 8 de Abril"

**Visualização Mês:**
- Grid 7 colunas (D S T Q Q S S) × semanas do mês
- Cada célula do dia mostra:
  - Número do dia
  - Até 3 mini-pills de compromissos (cor do compromisso + nome truncado)
  - Badge de aniversário (ícone bolo 🎂) se houver
  - "+X mais" se houver mais de 3 compromissos
- Dia atual com destaque (borda vermelha/laranja)
- Click no dia → abre painel lateral com detalhes + botão "Novo Compromisso"
- Click na pill → abre modal de detalhe/edição do compromisso

**Visualização Semana:**
- Grid horizontal: 7 colunas (dias) × faixas horárias verticais (6h-23h)
- Compromissos como blocos coloridos posicionados no horário correto
- Altura do bloco proporcional à duração
- Compromissos de dia inteiro no topo (all-day row)
- Aniversários aparecem como banner no topo do dia

**Visualização Dia:**
- Timeline vertical com faixas horárias (6h-23h)
- Compromissos como cards na posição do horário
- Sidebar direita: lista dos compromissos do dia + aniversários

**Botão "+" (FAB):** canto inferior direito, abre modal de novo compromisso

---

#### 4.2 Compromissos (`/agenda/compromissos`)

**Header:** "Compromissos" + botão "+ Novo Compromisso" (vermelho)

**Filtros:**
- Período: Hoje | Esta semana | Este mês | Todos
- Cor/Etiqueta (dropdown com as cores cadastradas)
- Busca por nome

**Lista de compromissos (cronológica):**
- Agrupados por data (ex: "Hoje — Quarta, 8 de Abril")
- Cada compromisso:
  - Barra lateral com a cor do compromisso
  - Horário (ex: "14:00 - 15:30")
  - Nome do compromisso
  - Local (se houver, com ícone MapPin)
  - Badge de recorrência (se recorrente: ícone RefreshCw + tipo)
  - Duração (ex: "1h30")
  - Botões: editar, excluir

**Empty state:** "Nenhum compromisso agendado"

---

##### Modal: Novo Compromisso

**Campos:**
- Nome do compromisso * (input texto)
- Data * (date picker)
- Horário início * (time picker)
- Horário fim / Duração (time picker ou input "1h30")
- Dia inteiro (toggle — se ativado, esconde horários)
- Local (input texto, opcional)
- Descrição / Notas (textarea, opcional)
- Cor / Etiqueta (seletor de cor com opções pré-definidas):
  - 🔴 Vermelho — Urgente/Importante
  - 🟠 Laranja — Trabalho
  - 🔵 Azul — Pessoal
  - 🟢 Verde — Saúde/Exercício
  - 🟣 Roxo — Igreja/Espiritual
  - 🟡 Amarelo — Social/Lazer
  - ⚪ Cinza — Outros
  - (cores customizáveis)
- Recorrência (select):
  - Sem recorrência (padrão)
  - Diário
  - Semanal (mesmo dia da semana)
  - Quinzenal
  - Mensal (mesmo dia do mês)
  - Anual
  - Personalizado → abre opções extras:
    - Repetir a cada X dias/semanas/meses
    - Dias da semana específicos (multi-select: D S T Q Q S S)
    - Até: data final ou "para sempre"
- Lembrete (select):
  - Sem lembrete
  - No horário
  - 5 min antes
  - 15 min antes
  - 30 min antes
  - 1 hora antes
  - 1 dia antes

---

#### 4.3 Aniversários (`/agenda/aniversarios`)

**Header:** "Aniversários" + subtítulo "Nunca esqueça uma data importante" + botão "+ Novo Aniversário" (vermelho)

**Seção: Próximos Aniversários**
- Cards dos próximos aniversários (ordenados por data mais próxima)
- Cada card:
  - Ícone 🎂 + Nome da pessoa
  - Data (ex: "15 de Maio")
  - Countdown: "em X dias" (verde se < 7 dias, amarelo se < 30, cinza se > 30)
  - Idade que vai completar (se ano de nascimento informado)
  - Botões: editar, excluir

**Seção: Todos os Aniversários**
- Lista completa ordenada por mês/dia (Jan → Dez)
- Agrupados por mês com header (ex: "Janeiro", "Fevereiro"...)

**Como aparece no calendário:**
- Aniversários aparecem automaticamente como eventos especiais no calendário
- Visual diferenciado: ícone 🎂 + pill rosa/magenta
- Aniversários são sempre "dia inteiro" e recorrentes anualmente (automático)

---

##### Modal: Novo Aniversário

**Campos:**
- Nome da pessoa * (input texto)
- Data de nascimento * (date picker — dia e mês obrigatórios, ano opcional)
- Relação (select opcional): Família, Amigo, Colega de trabalho, Igreja, Outro
- Lembrete (select):
  - No dia
  - 1 dia antes
  - 3 dias antes
  - 1 semana antes
- Notas (textarea, opcional — ex: "gosta de chocolate")

### 5. Tarefas (`/tarefas`)

**Header:** "Tarefas" + subtítulo "X/Y concluídas" + botão "+ Nova Tarefa" (vermelho)

O módulo usa **4 visualizações** via toggle no topo (estilo Forja, tab bar):

| Toggle | Ícone (Lucide) | Descrição |
|--------|----------------|-----------|
| Hoje | `Calendar` | Lista de tarefas do dia |
| Semana | `Calendar` | Grid semanal com cards por dia (drag-and-drop) |
| Mês | `Calendar` | Grid mensal com cards por dia |
| Atrasadas | `AlertTriangle` | Tarefas com prazo vencido |

---

#### 5.1 Visualização "Hoje"

**Lista de tarefas do dia:**
- Cada tarefa é um card com:
  - Barra lateral com a **cor da tarefa**
  - Checkbox para marcar como concluída
  - Título da tarefa
  - Badges: prioridade (cor), categoria, tags
  - Prazo/horário (se houver)
  - Indicador de sub-tarefas: "2/5 sub-tarefas"
  - Menu ⋮ (editar, excluir, mover para outro dia)
- Tarefas concluídas ficam riscadas com opacidade reduzida
- Ordenação: urgentes primeiro, depois por prioridade

**Empty state:** ícone calendário + "Nenhuma tarefa para hoje" + "Crie uma nova tarefa ou aproveite o dia livre" + botão "Criar tarefa"

---

#### 5.2 Visualização "Semana"

**Header:** "Semana 15 · Abril" com navegação ← →

**Barra de dias da semana no topo:**
- DOMINGO | SEGUNDA | TERÇA | QUARTA | QUINTA | SEXTA | SÁBADO
- Número do dia abaixo de cada nome
- Dia atual destacado com fundo vermelho/borda

**Grid de cards (4 colunas em 2 rows, ou 7 colunas se tela grande):**
- Cada dia é um card/coluna com:
  - Header: número + dia da semana + botão "+" para adicionar tarefa rápida
  - Lista de tarefas do dia (mini-cards)
  - Placeholder: "Arraste tarefas para cá"
- **Drag-and-drop** entre dias para reagendar tarefas
- Tarefas sem data aparecem numa seção "Sem data" separada (opcional)

---

#### 5.3 Visualização "Mês"

**Header:** "Abril De 2026" com navegação ← →

**Grid mensal (4 colunas × ~8 rows):**
- Cada dia é um card com:
  - Número + dia da semana (ex: "1 Quarta-Feira")
  - Botão "+" no canto
  - Lista de tarefas do dia (nomes truncados)
  - Placeholder: "Arraste tarefas para cá"
- **Drag-and-drop** entre dias
- Dia atual com destaque visual

---

#### 5.4 Visualização "Atrasadas"

**Lista de tarefas com prazo vencido:**
- Ordenadas por mais atrasada primeiro
- Cada tarefa mostra: título, prazo original, "X dias de atraso" (vermelho)
- Ações rápidas: concluir, reagendar (move para hoje ou outro dia), excluir

**Empty state:** ícone ⚠️ + "Nenhuma tarefa atrasada" + "Parabéns! Você está em dia com suas tarefas 🎉"

---

##### Modal: Nova Tarefa

**Campos:**
- Título * (input texto, placeholder: "O que precisa ser feito?")
- Descrição (textarea, placeholder: "Detalhes adicionais...")
- Tarefa Recorrente (toggle com ícone RefreshCw):
  - Se ativado: "Repetir em dias específicos"
  - Multi-select de dias da semana: D S T Q Q S S
- Prioridade (select com bolinha de cor):
  - 🟡 Média (padrão)
  - 🟢 Baixa
  - 🟠 Alta
  - 🔴 Urgente
- Prazo (date+time picker: dd/mm/aaaa --:--)
- Cor da tarefa (seletor de cor — mesmas opções da agenda):
  - 🔴 Vermelho, 🟠 Laranja, 🔵 Azul, 🟢 Verde, 🟣 Roxo, 🟡 Amarelo, ⚪ Cinza
- Categoria (select):
  - Trabalho, Pessoal, Igreja, Estudos, Saúde, Outro
- Tags (input com chips — digita e pressiona Enter para adicionar):
  - Tags ficam como badges coloridos no card da tarefa
- Sub-tarefas / Checklist:
  - Input para adicionar sub-tarefas
  - Botão "+ Adicionar sub-tarefa"
  - Lista com checkbox + título + botão excluir
  - Reordenação por drag ou setas
- Botões: Cancelar | "Criar Tarefa" (vermelho)

---

##### Detalhes de implementação

**Prioridades — cores visuais:**
- Baixa: cinza/verde (`#6b7280` / `#22c55e`)
- Média: amarelo (`#eab308`)
- Alta: laranja (`#f97316`)
- Urgente: vermelho (`#ef4444`)

**Categorias padrão (seed):**
- Trabalho, Pessoal, Igreja, Estudos, Saúde, Outro

**Drag-and-drop:**
- Nas visões Semana e Mês, tarefas podem ser arrastadas entre dias
- Ao soltar em outro dia, atualiza o `dataLimite` da tarefa automaticamente

**Tarefas recorrentes:**
- Quando uma tarefa recorrente é concluída, gera automaticamente a próxima ocorrência no próximo dia programado

### 6. Amigos (`/amigos`)

Um "CRM pessoal" para guardar informações sobre amigos e pessoas importantes.

**Header:** "Amigos" + subtítulo "X amigos cadastrados" + botão "+ Novo Amigo" (vermelho)

**Barra de busca:**
- Input "Buscar amigo..." para filtrar por nome

**Grid de cards (3 colunas, responsivo):**
- Cada card de amigo:
  - Avatar com iniciais do nome (círculo colorido gerado a partir do nome)
  - Nome em destaque
  - Idade calculada automaticamente (ex: "24 anos") — se data de nascimento informada
  - Data de nascimento (ex: "15 de Maio de 2001")
  - Ícone 🎂 com countdown do próximo aniversário (ex: "Aniversário em 38 dias")
  - Preview das notas (primeiras 2-3 linhas, truncado)
  - Botões: ver detalhes, editar, excluir

**Click no card → Página/Modal de detalhe:**
- Nome completo + idade
- Data de nascimento + próximo aniversário
- **Notas** — textarea grande, campo livre para escrever qualquer coisa:
  - Lugar que gosta de ir
  - Possível presente
  - Cor favorita
  - Comida preferida
  - Qualquer anotação pessoal
  - Suporte a markdown básico (negrito, listas) para organizar
- Botão "Salvar notas" (auto-save opcional com debounce)
- Data de criação do cadastro ("Amigo desde: Abril 2026")

---

##### Modal: Novo Amigo

**Campos:**
- Nome * (input texto)
- Data de nascimento (date picker — opcional, mas recomendado)
- Notas (textarea grande, placeholder: "Escreva o que quiser sobre essa pessoa... Lugar favorito, possível presente, cor preferida, etc.")
- Botões: Cancelar | "Adicionar Amigo" (vermelho)

**Integração com Aniversários:**
- Ao criar um amigo com data de nascimento, o sistema **cria automaticamente** um registro na tabela `Aniversario` da Agenda
- O aniversário aparece no calendário com ícone 🎂
- Se o amigo for editado (data alterada), o aniversário é atualizado
- Se o amigo for excluído, o aniversário vinculado também é removido (cascade)
- O `aniversarioId` no model `Amigo` mantém o vínculo

---

## Estrutura de Pastas Sugerida

```
src/
├── app/
│   ├── layout.tsx              # Layout raiz com sidebar
│   ├── page.tsx                # Dashboard
│   ├── financeiro/
│   │   ├── layout.tsx          # Layout com sub-abas (tab bar horizontal)
│   │   ├── page.tsx            # Visão Geral (rota padrão)
│   │   ├── transacoes/
│   │   │   └── page.tsx
│   │   ├── mensal/
│   │   │   └── page.tsx
│   │   ├── parcelamentos/
│   │   │   └── page.tsx
│   │   ├── contas/
│   │   │   └── page.tsx
│   │   ├── categorias/
│   │   │   └── page.tsx
│   │   ├── cartoes/
│   │   │   └── page.tsx
│   │   ├── faturas/
│   │   │   └── page.tsx
│   │   ├── recorrentes/
│   │   │   └── page.tsx
│   │   ├── alocacao/
│   │   │   └── page.tsx
│   │   └── investimentos/
│   │       └── page.tsx
│   ├── habitos/
│   │   ├── layout.tsx          # Layout com sub-abas (Hábitos | Metas)
│   │   ├── page.tsx            # Hábitos (com toggle Hoje/Mês/Dashboards)
│   │   └── metas/
│   │       └── page.tsx
│   ├── agenda/
│   │   ├── layout.tsx          # Layout com sub-abas (Calendário | Compromissos | Aniversários)
│   │   ├── page.tsx            # Calendário (mês/semana/dia)
│   │   ├── compromissos/
│   │   │   └── page.tsx
│   │   └── aniversarios/
│   │       └── page.tsx
│   ├── tarefas/
│   │   └── page.tsx
│   ├── amigos/
│   │   └── page.tsx
│   └── api/
│       ├── transacoes/
│       ├── contas/
│       ├── categorias/
│       ├── cartoes/
│       ├── faturas/
│       ├── parcelamentos/
│       ├── recorrentes/
│       ├── alocacoes/
│       ├── investimentos/
│       ├── aportes/
│       ├── habitos/
│       ├── metas/
│       ├── compromissos/
│       ├── aniversarios/
│       ├── agenda/
│       ├── tarefas/
│       ├── amigos/
│       ├── agua/
│       └── dashboard/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── PageHeader.tsx
│   │   └── FinanceiroTabs.tsx  # Tab bar horizontal das sub-abas
│   ├── dashboard/
│   │   ├── ResumoCards.tsx       # 5 cards de resumo (saldo, hábitos, tarefas, metas, aniversário)
│   │   ├── AguaTracker.tsx       # Widget tracker de água (barras + botão circular)
│   │   ├── ProximosCompromissos.tsx
│   │   ├── GraficoFinanceiro.tsx # Barras receitas vs despesas 6 meses
│   │   ├── HabitosSemana.tsx     # Mini grade hábitos × dias da semana
│   │   ├── MetasProgresso.tsx    # Top metas com barras de progresso
│   │   ├── TarefasAtrasadas.tsx  # Lista de tarefas atrasadas
│   │   └── AniversariosProximos.tsx
│   ├── financeiro/
│   │   ├── TransacaoForm.tsx
│   │   ├── TransacaoLista.tsx
│   │   ├── GraficosCategorias.tsx
│   │   ├── FluxoAnualChart.tsx
│   │   ├── ContaCard.tsx
│   │   ├── CartaoCard.tsx       # Card visual estilo cartão real
│   │   ├── FaturaCard.tsx
│   │   ├── ParcelamentoCard.tsx
│   │   ├── RecorrenteCard.tsx
│   │   ├── AlocacaoChart.tsx
│   │   ├── InvestimentoCard.tsx
│   │   ├── CaixinhaCard.tsx     # Card com barra de progresso da meta
│   │   ├── AporteForm.tsx
│   │   └── FABButton.tsx        # Botão flutuante "+"
│   ├── habitos/
│   │   ├── HabitoRow.tsx        # Row do hábito com checkbox, setas ↑↓, menu ⋮
│   │   ├── HabitoGradeMensal.tsx # Grade hábitos × dias do mês (marcação retroativa)
│   │   ├── HabitoDashboard.tsx  # Meta da semana + gráfico evolução mensal
│   │   ├── HabitoForm.tsx       # Modal novo hábito (com dias da semana)
│   │   ├── MetaCard.tsx         # Card da meta com progresso + checkpoints
│   │   ├── MetaWizard.tsx       # Modal wizard 4 etapas (Nova Meta)
│   │   └── CheckpointList.tsx   # Lista de sub-tarefas com checkboxes
│   ├── agenda/
│   │   ├── CalendarioMes.tsx     # Grid mensal com pills coloridas
│   │   ├── CalendarioSemana.tsx  # Grid semanal com blocos horários
│   │   ├── CalendarioDia.tsx     # Timeline vertical do dia
│   │   ├── CompromissoForm.tsx   # Modal novo compromisso (com recorrência)
│   │   ├── CompromissoCard.tsx   # Card do compromisso na lista
│   │   ├── AniversarioCard.tsx   # Card com countdown
│   │   ├── AniversarioForm.tsx   # Modal novo aniversário
│   │   └── DiaDetalhe.tsx        # Painel lateral ao clicar num dia
│   └── tarefas/
│       ├── TarefaCard.tsx        # Card da tarefa com cor, badges, checkbox
│       ├── TarefaForm.tsx        # Modal nova tarefa (com todos os campos)
│       ├── TarefaHoje.tsx        # Lista do dia
│       ├── TarefaSemana.tsx      # Grid semanal com drag-and-drop
│       ├── TarefaMes.tsx         # Grid mensal com drag-and-drop
│       ├── TarefaAtrasadas.tsx   # Lista de tarefas atrasadas
│       ├── SubTarefaList.tsx     # Checklist de sub-tarefas
│       └── TagInput.tsx          # Input de tags com chips
│   ├── amigos/
│   │   ├── AmigoCard.tsx         # Card com avatar, nome, idade, preview notas
│   │   ├── AmigoDetalhe.tsx      # Página/modal de detalhe com notas completas
│   │   └── AmigoForm.tsx         # Modal novo amigo
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── utils.ts                # Helpers gerais
│   └── formatters.ts           # Formatação de moeda, data, etc.
├── hooks/
│   └── use-*.ts                # Custom hooks
└── prisma/
    ├── schema.prisma
    └── seed.ts                 # Dados de exemplo
```

---

## API Routes (App Router)

Todas as rotas seguem padrão REST:

| Recurso | GET | POST | PUT | DELETE |
|---------|-----|------|-----|--------|
| **Financeiro** | | | | |
| `/api/transacoes` | Lista (com filtros: tipo, categoria, conta, período) | Criar | — | — |
| `/api/transacoes/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/contas` | Lista | Criar | — | — |
| `/api/contas/[id]` | Detalhe + saldo calculado | — | Atualizar | Remover |
| `/api/categorias` | Lista (com totais do mês) | Criar | — | — |
| `/api/categorias/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/cartoes` | Lista (com limite disponível) | Criar | — | — |
| `/api/cartoes/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/faturas` | Lista (por cartão/mês) | Criar | — | — |
| `/api/faturas/[id]` | Detalhe + transações | — | Atualizar (status) | Remover |
| `/api/parcelamentos` | Lista ativos | Criar | — | — |
| `/api/parcelamentos/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/recorrentes` | Lista | Criar | — | — |
| `/api/recorrentes/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/recorrentes/processar` | — | Gerar transações do mês | — | — |
| `/api/alocacoes` | Lista | Criar | — | — |
| `/api/alocacoes/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/investimentos` | Lista | Criar | — | — |
| `/api/investimentos/[id]` | Detalhe + aportes | — | Atualizar | Remover |
| `/api/aportes` | Lista (filtro por investimento) | Criar | — | — |
| `/api/financeiro/resumo` | Resumo mensal/anual agregado | — | — | — |
| **Hábitos & Metas** | | | | |
| `/api/habitos` | Lista (com registros do período) | Criar | — | — |
| `/api/habitos/[id]` | Detalhe + registros + streaks | — | Atualizar | Remover |
| `/api/habitos/[id]/registro` | — | Marcar/desmarcar dia (aceita qualquer data passada) | — | — |
| `/api/habitos/reordenar` | — | Atualizar ordem (array de ids) | — | — |
| `/api/habitos/stats` | Estatísticas: maior streak, total feitos, % conclusão mensal | — | — | — |
| `/api/metas` | Lista (filtro por status: ativa/pausada/concluida) | Criar | — | — |
| `/api/metas/[id]` | Detalhe + checkpoints | — | Atualizar (status, progresso) | Remover |
| `/api/metas/[id]/checkpoints` | Lista checkpoints | Criar checkpoint | — | — |
| `/api/metas/[id]/checkpoints/[cpId]` | — | — | Atualizar (toggle concluido) | Remover |
| **Agenda** | | | | |
| `/api/compromissos` | Lista (filtro por período, cor) | Criar | — | — |
| `/api/compromissos/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/aniversarios` | Lista (ordenados por próximo) | Criar | — | — |
| `/api/aniversarios/[id]` | Detalhe | — | Atualizar | Remover |
| `/api/agenda/dia/[data]` | Compromissos + aniversários de um dia | — | — | — |
| `/api/agenda/mes/[ano]/[mes]` | Todos os eventos do mês (compromissos + aniversários) | — | — | — |
| **Tarefas** | | | | |
| `/api/tarefas` | Lista (filtro por status, período, categoria, prioridade, tag) | Criar | — | — |
| `/api/tarefas/[id]` | Detalhe + sub-tarefas | — | Atualizar (status, data, prioridade) | Remover |
| `/api/tarefas/[id]/subtarefas` | Lista sub-tarefas | Criar sub-tarefa | — | — |
| `/api/tarefas/[id]/subtarefas/[stId]` | — | — | Toggle concluída / atualizar | Remover |
| `/api/tarefas/atrasadas` | Lista tarefas com prazo vencido | — | — | — |
| `/api/tarefas/semana/[ano]/[semana]` | Tarefas agrupadas por dia da semana | — | — | — |
| `/api/tarefas/mes/[ano]/[mes]` | Tarefas agrupadas por dia do mês | — | — | — |
| **Amigos** | | | | |
| `/api/amigos` | Lista (busca por nome) | Criar (+ cria Aniversario automaticamente) | — | — |
| `/api/amigos/[id]` | Detalhe completo com notas | — | Atualizar (+ atualiza Aniversario) | Remover (+ remove Aniversario) |
| `/api/amigos/[id]/notas` | — | — | Atualizar notas (endpoint dedicado p/ auto-save) | — |
| **Água** | | | | |
| `/api/agua` | Registros dos últimos X dias (?dias=7) | — | — | — |
| `/api/agua/adicionar` | — | Adiciona ml ao dia atual | — | — |
| `/api/agua/meta` | — | — | Atualiza meta diária | — |
| **Dashboard** | | | | |
| `/api/dashboard` | Resumo agregado: saldo mês, hábitos hoje, tarefas dia, metas ativas, próx. aniversário, água hoje, compromissos 7d, tarefas atrasadas | — | — | — |

---

## Convenções de Código

- Componentes em PascalCase
- Hooks customizados com prefixo `use`
- Arquivos de API em camelCase
- Prisma models em PascalCase (português sem acentos nas chaves)
- Comentários e UI em **português brasileiro**
- Valores monetários sempre formatados: `R$ 1.234,56`
- Datas formatadas: `dd/MM/yyyy` ou relativo ("há 2 dias")
- Todos os formulários com validação client-side

---

## Ordem de Implementação Sugerida

1. **Setup**: Next.js + Prisma + Tailwind + shadcn/ui + layout com sidebar
2. **Financeiro — Base**: Schema completo + layout com tab bar de sub-abas + Visão Geral + Transações + Categorias + Contas
3. **Financeiro — Cartões**: Cartões (card visual) + Faturas + Parcelamentos
4. **Financeiro — Automação**: Recorrentes (com botão Processar) + Alocação de renda
5. **Financeiro — Investimentos**: Investimentos + Caixinhas + Aportes + Mensal (visão anual)
6. **Hábitos & Metas**: Schema + tracking diário + streaks + barras de progresso
7. **Agenda**: Schema + calendário visual + CRUD de compromissos + aniversários
8. **Tarefas**: Schema + visualizações (Hoje/Semana/Mês/Atrasadas) + drag-and-drop
9. **Amigos**: Schema + grid de cards + detalhe com notas + integração automática com Aniversários da Agenda
10. **Dashboard**: Agregação de dados de todos os módulos + gráficos + tracker de água
11. **Deploy**: Migrar banco para Turso + deploy na Vercel
12. **Polish**: Animações, micro-interações, responsividade, seed com dados de exemplo

---

## Notas Importantes

- O app é **pessoal** (single-user), sem necessidade de autenticação
- Desenvolvimento local usa SQLite (arquivo local, zero config)
- Produção usa Turso (SQLite na nuvem, plano free)
- Priorizar **funcionalidade primeiro**, polish visual depois
- Cada módulo deve funcionar independentemente antes de integrar no dashboard
- Seed com dados realistas para testar os gráficos e visualizações
- Responsivo: sidebar colapsa em mobile, grids adaptam

---

## Deploy — Vercel + Turso

### Visão geral

O app roda em **Vercel** (frontend + API routes) com banco de dados no **Turso** (SQLite distribuído na nuvem). A migração é mínima porque Turso usa o protocolo libSQL, compatível com SQLite.

### Passo 1 — Criar conta e banco no Turso

```bash
# Instalar CLI do Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Criar banco de dados
turso db create lifeforge

# Pegar a URL e token
turso db show lifeforge --url
turso db tokens create lifeforge
```

### Passo 2 — Configurar Prisma para Turso

```bash
# Instalar dependências
npm install @prisma/adapter-libsql @libsql/client
```

Atualizar `schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db" // local dev
  // Em produção, o adapter do Turso é usado via env
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

Atualizar `lib/prisma.ts` para usar Turso em produção:
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL) {
    // Produção: Turso
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }
  // Dev: SQLite local
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Passo 3 — Variáveis de ambiente

`.env.local` (dev):
```env
# Nada necessário — usa SQLite local automaticamente
```

Vercel (produção) — adicionar nas Environment Variables:
```
TURSO_DATABASE_URL=libsql://lifeforge-USUARIO.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

### Passo 4 — Push do schema para Turso

```bash
# Gerar migrations e aplicar no Turso
TURSO_DATABASE_URL=libsql://lifeforge-USUARIO.turso.io \
TURSO_AUTH_TOKEN=eyJ... \
npx prisma db push
```

### Passo 5 — Deploy na Vercel

```bash
# Conectar repo ao Vercel (se ainda não está)
npx vercel link

# Deploy
npx vercel --prod

# Ou simplesmente push para o GitHub — Vercel faz deploy automático
git push origin main
```

### Resultado

- **Dev:** `npm run dev` → localhost:3000, SQLite local
- **Produção:** `lifeforge.vercel.app` → acessível de qualquer dispositivo (PC, celular, tablet)
- **Dados:** persistidos no Turso, acessíveis de qualquer lugar
