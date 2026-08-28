# NETPROJECT — Plataforma de PMO Estratégico

> **NETPROJECT — Da ideia à decisão. Da decisão à entrega.**

Plataforma multi-tenant de gestão estratégica de projetos, portfólios, programas, demandas, ideias, governança (riscos, problemas, mudanças, custos/EVM), previsão e inteligência artificial de apoio à decisão — para setor público e iniciativa privada. Interface 100% em PT-BR, datas no padrão brasileiro e moeda padrão BRL.

## Arquitetura

- **Frontend (este repositório):** React 18 + TypeScript + Vite + Tailwind CSS v4. Módulos de domínio em `src/lib` (types, engine, store) e páginas em `src/pages`.
- **Backend de referência (produção):** Node.js + TypeScript, Clean Architecture, repositórios, serviços separados de controllers, validação centralizada. Módulos sugeridos: `auth/ organizations/ users/ strategy/ ideas/ demands/ portfolios/ programs/ projects/ tasks/ risks/ costs/ resources/ documents/ meetings/ intelligence/ reports/ integrations/ audit/`.
- **Banco:** PostgreSQL normalizado (entidades: organizations, users, roles, permissions, strategic_plans/objectives, ideas, idea_analyses, scenarios, demands, portfolios, programs, projects, project_charters, wbs_items, tasks, milestones, risks, issues, change_requests, budgets, cost_entries, stakeholders, raci_items, meetings, decisions, documents, benefits, lessons_learned, health_scores, ai_analyses, ai_recommendations, ai_forecasts, alerts, notifications, audit_logs, integration_events — com `created_at`, `updated_at`, `created_by`).
- **IA:** abstração de provedor (`AI_PROVIDER`). O motor determinístico embutido garante operação offline e explicabilidade total; em produção delega ao provedor configurado.

Nesta demonstração, a camada de persistência é um banco em memória versionado com **localStorage** (chave `netproject.db.v3`), mantendo o mesmo contrato de entidades do backend.

## Instalação

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção
```

## Conta padrão (SOMENTE DESENVOLVIMENTO)

- **Login:** `admin@systenex.local`
- **Senha:** `123456` (troca obrigatória no primeiro acesso)
- Outros perfis de demonstração estão listados na tela de login (PMO, Executiva, Gerente de Projetos, Auditor…).

⚠️ Nunca utilize esta credencial em produção.

## Variáveis de ambiente

Veja `.env.example`. Nunca versionar `.env` com segredos reais.

## Integrações NEX

Camada genérica de eventos (`integration_events`) pronta para NEXUNITAS, NEXFROTA, NEXOBRAS, NEXATIVOS e NEXSERVICE. Tipos de evento: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELAYED`, `TASK_OVERDUE`, `RISK_CREATED`, `RISK_CRITICAL`, `DEMAND_CREATED`, `DEMAND_APPROVED`, `IDEA_APPROVED`, `MILESTONE_DELAYED`, `PROJECT_COMPLETED`.

## Regra de ouro da IA (human-in-the-loop)

A IA **analisa, sugere, prevê, recomenda e resume**. Nunca aprova, exclui, altera prazos, orçamentos, baselines, contratos ou atribui pessoas sem confirmação explícita do usuário. Toda análise exibe dados utilizados, confiança, premissas e limitações.

## Segurança & LGPD

Hash de senha, JWT + refresh tokens, RBAC granular com matriz de permissões, isolamento multi-tenant, proteção SQLi/XSS, rate limiting, auditoria imutável, expiração de sessão, política de senhas, preparação para MFA. LGPD: finalidade, minimização, transparência, desativação com preservação de histórico, exportação de dados e classificação de confidencialidade.
