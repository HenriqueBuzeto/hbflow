# Diagnóstico de Arquitetura Ponta a Ponta & Dossiê de Produção: HBFlow

Este documento apresenta uma análise profunda, estruturada de nível de Engenharia Sênior, do estado atual do ecossistema **HBFlow** (WhatsApp CRM & Multiatendimento). Ele detalha a arquitetura atual, mapeia as funcionalidades implementadas por módulo, diagnostica pontos críticos e apresenta um plano de ação para mitigar riscos de produção e preparar o sistema para escala corporativa.

---

## 💻 1. Arquitetura e Stack Tecnológica Geral

O **HBFlow** é uma plataforma multitenant projetada para atuar como centralizadora de atendimento omnichannel integrada a WhatsApp (via **Evolution API**) e automatizada por uma força de trabalho de **15 Agentes Inteligentes de IA**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT WEB                                │
│                   (Next.js App Router + Zustand)                       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / WSS
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          HBFLOW SERVER LAYER                           │
│                      (Next.js Serverless / API)                        │
└─────┬────────────────────────────┬───────────────────────────────┬─────┘
      │                            │                               │
      ▼ (Prisma ORM)               ▼ (In-Memory / Redis)           ▼ (OpenAI / Anthropic / Local)
┌───────────┐                ┌───────────┐                   ┌───────────┐
│ POSTGRES  │                │ BULLMQ /  │                   │ WORKFORCE │
│ (Neon DB) │                │ REDIS FILA│                   │ AI LAYER  │
└───────────┘                └───────────┘                   └───────────┘
                                   ▲
                                   │ Webhooks (Cloudflare Tunnel)
┌──────────────────────────────────┴─────────────────────────────────────┐
│                             EVOLUTION API                              │
│                    (Instâncias oficiais WhatsApp)                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Módulos da Stack
* **Core Framework**: Next.js v16.2.7 (React v19.2.4).
* **Camada de Estilização**: Tailwind CSS v4.0.0 via `@tailwindcss/postcss`. O sistema está travado no **Modo Claro** (fundo branco/claro `bg-[#F8FAFC]` e fontes escuras) na sua área de visualização do operador para evitar inconsistências visuais e contraste inadequado, enquanto a Sidebar é mantida escura de forma fixa para contraste elegante.
* **Gerenciamento de Estado**: Zustand (`src/store/useStore.ts`) unificando os dados de contatos, conversas, faturas e controle orçamentário.
* **Persistência**: Banco de dados relacional **PostgreSQL** (configurado para Vercel Neon DB com suporte a connection pooler transacional e conexão direta para migrations) mapeado via **Prisma ORM v6.19.3**.
* **Gerenciamento de Filas e Concorrência**: Redis com BullMQ (`src/lib/queue.ts`). Em ambiente local, há um mecanismo de fallback automático em memória caso o Redis não esteja disponível.
* **Comunicação em Tempo Real**: Websockets integrados para controle de presença de atendentes e atualização de conversas, com fallback local em eventos no cliente.

---

## 🗃️ 2. Mapeamento de Banco de Dados e Regras de Negócio (Prisma Schema)

O banco de dados relacional está modelado para suportar **Multi-inquilinato (Multi-Tenant) Estrito**, garantindo o isolamento lógico das contas dos clientes a nível de banco de dados por meio da chave `tenantId` presente em quase todas as entidades.

### 2.1 Principais Módulos do Banco de Dados
1. **Autenticação, RBAC e Assinaturas (`Tenant`, `User`, `Role`, `Permission`, `UserPermission`)**:
   - Isolamento de dados das empresas (`Tenant`).
   - Controle de permissões refinado por papel operacional (ex: `inbox:read`, `settings:write`).
   - O inquilino está vinculado a três categorias de planos oficiais: `starter` (R$ 99,90/mês), `pro` (R$ 189,90/mês) e `enterprise` (Valor a combinar).
2. **Setup do WhatsApp (`WhatsappConnection`)**:
   - Grava instâncias criadas na Evolution API, guardando credenciais, status (conectado, desconectado, aguardando QR Code) e chaves de webhook de eventos.
3. **CRM Comercial (`Contact`, `Tag`, `ContactTag`, `Pipeline`, `PipelineStage`, `Deal`, `DealActivity`)**:
   - Funil Kanban configurável, permitindo arrastar leads entre colunas, registrar valor do negócio, atividades executadas e probabilidade de fechamento.
   - Histórico de leads categorizados por tags com o respectivo nível de temperatura (quente, morno, frio).
4. **Atendimento (`Conversation`, `ConversationParticipant`, `Message`, `MessageAttachment`, `MessageStatus`)**:
   - Registro de SLAs, controle de atribuição de atendentes ou setores, histórico de mensagens enviadas e recebidas com os respectivos status de entrega do WhatsApp (enviada, recebida, lida).
5. **Automação de Diálogo (`QuickReply`, `MessageTemplate`, `Flow`, `FlowNode`, `FlowEdge`, `FlowSession`)**:
   - Atalhos de mensagens do atendente (ex: `/pix`) e templates oficiais do WhatsApp.
   - O **Flow Builder** guarda a lógica de nós (mensagem, coletar dados, transição de fila) e as conexões que definem a navegação automática do cliente.
6. **Força de Trabalho IA (Workforce AI) (`AgentConfig`, `AgentMemory`, `AgentExecutionLog`, `TenantAICost`)**:
   - Guarda o status ativo/inativo, prompts do sistema e temperatura para cada um dos 15 agentes de IA por tenant.
   - `AgentMemory` armazena memórias semânticas persistentes de clientes em pares de chave-valor.
   - `TenantAICost` monitora os tokens gastos por tenant para fins de faturamento e prevenção de estouro orçamentário.

---

## 🧠 3. Camada de IA (AI Workforce)

A inteligência artificial do HBFlow opera de forma hierárquica baseada no plano comercial contratado pelo Tenant:

* **Plano Starter**:
  - `triage-agent`: Analisa as mensagens de entrada e decide qual a intenção e o departamento apropriado.
  - `faq-agent`: Responde a perguntas frequentes consultando uma base de conhecimento.
  - `summary-agent`: Redige resumos inteligentes das conversas de atendimento para histórico.
* **Plano Pro**:
  - Agrega agentes comerciais e de faturamento: `sdr-agent` (qualificação de leads), `sales-agent` (técnicas de fechamento de vendas), `followup-agent` (reengajamento programado) e `billing-agent` (cobranças e segundas vias).
  - `sentiment-agent`: Analisa as conversas para avaliar a irritação ou satisfação do cliente, prevenindo cancelamentos (churn).
* **Plano Enterprise**:
  - Agrega agentes gerenciais avançados: `supervisor-agent` (monitoramento de SLA de atendentes), `attendant-copilot-agent` (sugere respostas em tempo real para atendentes humanos) e `commercial-manager-agent`/`sales-coach-agent` (análise de conversas e coaching de operadores).

### 3.1 Orquestração e Simulação Local
O processamento da IA conta com o **Workforce Orchestrator** que ordena as execuções de acordo com a prioridade dos agentes. 
Para desenvolvimento local e economia de créditos, o sistema utiliza o **Simulated AI Provider** (`src/agents/services/ai-provider.service.ts`), que emula perfeitamente as respostas JSON esperadas em menos de 250ms quando chaves de API reais da OpenAI/Anthropic não são especificadas nas variáveis de ambiente.

---

## 🚨 4. Diagnóstico de Pontos Críticos e Riscos de Produção

Abaixo estão listados os principais gargalos e riscos técnicos diagnosticados a nível arquitetural e operacional no sistema:

### 🚨 4.1 Fila de Mensagens Sem Persistência em Ambientes Serverless (Risco Alto)
* **Status Atual**: O arquivo `src/lib/queue.ts` ativa o **In-Memory Fallback** caso não encontre uma instância de Redis ou o pacote `bullmq` não esteja instalado no ambiente de desenvolvimento.
* **Impacto**: Em produção na Vercel (servidores serverless), as funções de API são executadas em contêineres stateless que nascem e morrem sob demanda. Filas em memória são totalmente reiniciadas a cada desligamento de contêiner. Mensagens em lote, campanhas agendadas ou disparos em fila serão perdidos.
* **Mitigation**: É fundamental configurar um servidor Redis persistente (como Redis Upstash, Aiven ou ElastiCache) em produção e garantir que a variável de ambiente correspondente esteja preenchida.

### ⚠️ 4.2 Dependência Crítica (Dynamic Require) no Webpack (Risco Médio)
* **Status Atual**: O build do Next.js emite a seguinte advertência:
  ```text
  ./src/lib/queue.ts
  Critical dependency: the request of a dependency is an expression
  ```
* **Impacto**: Isso é gerado por requisições e importações condicionais e dinâmicas da biblioteca `bullmq` dentro de `src/lib/queue.ts`. Embora o build seja concluído com sucesso, existe o risco do Webpack remover partes da biblioteca no bundle final de produção ou quebrar sob versões específicas do Node.js.
* **Mitigation**: Substituir os `require` dinâmicos por imports dinâmicos assíncronos (`import()`) declarados estaticamente no fluxo ou separar os módulos de filas de produção e desenvolvimento em arquivos de implementações separadas.

### ⚠️ 4.3 Violação do Padrão do SDK do Sentry no Next.js (Risco Baixo/Médio)
* **Status Atual**: O compilador emite avisos sobre os arquivos `sentry.server.config.ts` e `sentry.edge.config.ts`:
  ```text
  Please ensure to put this file's content into the register() function of a Next.js instrumentation hook instead.
  ```
* **Impacto**: A inicialização do Sentry fora de `instrumentation.ts` é uma convenção depreciada. Em versões futuras do Next.js ou do próprio Sentry, o monitoramento de erros de renderização do servidor ou de rotas de borda (Edge) pode falhar em registrar erros críticos.
* **Mitigation**: Migrar as configurações de inicialização para o hook `register()` em `instrumentation.ts`, removendo os arquivos legados.

### ⚠️ 4.4 Dimensionamento Dinâmico de Gráficos (Risco Baixo/Estético)
* **Status Atual**: Advertência de gráficos do Recharts no console:
  ```text
  The width(-1) and height(-1) of chart should be greater than 0...
  ```
* **Impacto**: Gráficos analíticos dentro do dashboard podem renderizar com tamanho zerado (invisíveis) em algumas resoluções específicas ou causar flashes visuais no momento em que o layout tenta recalcular as dimensões dinamicamente no carregamento.
* **Mitigation**: Envolver o componente `ResponsiveContainer` em uma div pai que tenha dimensões físicas explícitas (ex: classe `h-80 w-full` ou `min-h-[300px]`).

### ⚠️ 4.5 Ausência de Trava Física de Concorrência (Optimistic Locking) (Risco Médio)
* **Status Atual**: A proteção de concorrência a nível de banco de dados (coluna `version` no Prisma) está temporariamente desativada no modelo de banco local devido a erros de permissão (`EPERM`) no ambiente de desenvolvimento do usuário durante a regeneração automática do Prisma Client. A concorrência atual é mitigada apenas por transações simples e validações de posse.
* **Impacto**: Sob alto fluxo de mensagens simultâneas do mesmo cliente (ex: o cliente envia 3 áudios seguidos), pode haver race conditions onde mensagens duplicadas disparam fluxos concorrentes simultaneamente.
* **Mitigation**: Corrigir a permissão de escrita local, reintroduzir a coluna `version` em `Conversation` no `schema.prisma` e ativar o controle de concorrência com optimistic locking.

### ⚠️ 4.6 Instabilidade e Volatilidade no Webhook do WhatsApp (Risco Médio)
* **Status Atual**: O gateway é local e exposto via túnel temporário (`trycloudflare.com`).
* **Impacto**: O endereço do túnel (ex: `https://seeds-pdf-replacing-class.trycloudflare.com`) expira e muda toda vez que o terminal do desenvolvedor é reiniciado, exigindo que o webhook seja reconfigurado no backend da Evolution API manualmente todas as manhãs.
* **Mitigation**: Em produção, é essencial que a Evolution API e o HBFlow estejam expostos por domínios persistentes com certificados SSL fixos.

### ⚠️ 4.7 Latência no Carregamento de Faturamento (Risco Baixo)
* **Status Atual**: A regra de inadimplência (bloqueio do Tenant) reavalia as faturas vencidas em tempo real diretamente na chamada `/api/v1/billing/invoices/current` do painel.
* **Impacto**: Consultar faturas vencidas no Neon DB toda vez que o painel faz requisições pode sobrecarregar o banco em escala e criar lentidão de carregamento ao operador.
* **Mitigation**: Armazenar o status de inadimplência no próprio modelo do `Tenant` (`isBlocked: true/false`) e usar um Worker/Cron Job executado a cada 12 horas para auditar as faturas e atualizar essa flag de forma assíncrona.

---

## 🚀 5. Roadmap de Refatoração e Próximos Passos (Nível Sênior)

Para preparar o **HBFlow** para lançamento comercial, propomos o seguinte cronograma de refinamento arquitetônico:

| Módulo | Ação Recomendada | Impacto | Prioridade |
| :--- | :--- | :--- | :--- |
| **Infraestrutura** | Provisionar uma instância de **Redis** persistente e configurar a URL de conexão BullMQ no `.env` do servidor de produção. | Evita a perda total de filas e tarefas agendadas em ambientes Serverless. | **Alta** |
| **Arquitetura** | Unificar e migrar as rotas de inicialização do Sentry para o hook `register()` dentro do arquivo `instrumentation.ts`. | Previne quebras futuras de rastreabilidade de erros no Next.js. | **Média** |
| **Filas/Fila** | Refatorar a classe `src/lib/queue.ts` para isolar os imports condicionais de `bullmq` em módulos estáticos separados, sanando o warning de dependência crítica. | Melhora a estabilidade de empacotamento do Webpack. | **Média** |
| **Banco de Dados** | Resolver a permissão do diretório e reinstaurar o `Optimistic Locking` (coluna `version` em `Conversation` e `Contact`). | Protege a aplicação contra concorrência de mensagens concorrentes de alto volume. | **Média** |
| **Faturamento** | Implementar cache e flag persistente no `Tenant` (`isBlocked`) alimentado por um cron job agendado, retirando a consulta pesada de faturas do fluxo de renderização. | Reduz a latência de chamadas HTTP internas da UI em mais de 100ms. | **Baixa** |
| **Camada de IA** | Desenvolver um cache semântico de FAQ baseado no Redis. Se a pergunta do cliente já foi respondida com alta similaridade nos últimos dias, o sistema reaproveita a resposta sem acionar a LLM. | Reduz os custos da API de IA (Cost Center) em até 40% em cenários de suporte. | **Média** |

---

*Dossiê compilado em 15 de Junho de 2026. Preparado pela equipe de Engenharia de Sistemas.*
