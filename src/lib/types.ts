// ============================================================
// NETPROJECT — Domain model (multi-tenant strategic PMO platform)
// Backend-ready entity contracts (PostgreSQL mapping documented
// in README.md). All user-facing labels live in PT-BR.
// ============================================================

export type ID = string;

export type OrgType =
  | 'Orgão Público' | 'Empresa Privada' | 'Autarquia' | 'Fundação'
  | 'Empresa Pública' | 'Escritório' | 'Organização Sem Fins Lucrativos';

export interface Organization {
  id: ID; name: string; legalName: string; taxId: string; type: OrgType;
  initials: string; mainColor: string; secondaryColor: string;
  timezone: string; currency: string; fiscalYearStart: number; // month 1-12
  workingDays: string; workingHours: string;
  sector: 'public' | 'private';
  governance: { approvalLevels: number; requiresCharter: boolean; evmEnabled: boolean; publicTerms: boolean };
}

export interface OrgUnit { id: ID; orgId: ID; name: string; kind: string; head?: ID; }

export type RoleKey =
  | 'master' | 'org_admin' | 'director' | 'secretary' | 'executive'
  | 'portfolio_mgr' | 'program_mgr' | 'project_mgr' | 'pmo' | 'team_lead'
  | 'analyst' | 'member' | 'requester' | 'auditor' | 'viewer';

export interface Role { key: RoleKey; name: string; description: string; }

export interface User {
  id: ID; orgId: ID; name: string; email: string; role: RoleKey;
  position: string; unitId?: ID; active: boolean; initials: string;
  skills: string[]; capacityH: number; // weekly hours capacity
  mustChangePassword?: boolean; isDevAccount?: boolean;
}

export type Page =
  | 'painel' | 'estrategia' | 'ideias' | 'demandas' | 'portfolios' | 'programas'
  | 'projetos' | 'projeto' | 'atividades' | 'tarefas' | 'cronograma' | 'equipes'
  | 'recursos' | 'riscos' | 'problemas' | 'mudancas' | 'custos' | 'relatorios'
  | 'inteligencia' | 'documentos' | 'reunioes' | 'licoes' | 'decisoes' | 'admin';

export interface Route { page: Page; id?: ID; tab?: string; }

// ---------------- Strategy ----------------
export interface StrategicPlan { id: ID; orgId: ID; name: string; horizon: string; pillars: Pillar[]; }
export interface Pillar { id: ID; name: string; color: string; }
export interface StrategicObjective {
  id: ID; orgId: ID; planId: ID; pillarId: ID; code: string; name: string;
  description: string; target?: string; indicator?: string; current?: number; goal?: number; unit?: string;
}

// ---------------- Ideas ----------------
export type IdeaStatus = 'Registrada' | 'Em Análise' | 'Em Estudo' | 'Priorizada' | 'Rejeitada' | 'Aprovada' | 'Convertida em Demanda' | 'Convertida em Projeto';
export interface Idea {
  id: ID; orgId: ID; code: string; title: string; description: string; problem: string;
  benefit: string; area: string; audience: string; urgency: 'Baixa' | 'Média' | 'Alta';
  authorId: ID; status: IdeaStatus; createdAt: string; attachments: number;
  analysis?: IdeaAnalysis;
}
export interface IdeaAnalysis {
  id: ID; ideaId: ID; generatedAt: string; engine: string;
  summary: string; problem: string; objective: string; justification: string;
  stakeholders: string[]; areas: string[]; resources: string[];
  timeEstimate: string; costEstimate: string; complexity: 'Baixa' | 'Média' | 'Alta';
  dependencies: string[]; risks: string[]; benefits: string[]; indicators: string[];
  scenarios: Scenario[]; recommendation: string;
  confirmed: string[]; estimates: string[]; hypotheses: string[]; assumptions: string[];
  score: number;
  components: { label: string; value: number; weight: number }[];
  confidence: number; limitations: string[]; dataUsed: string[];
}
export interface Scenario {
  name: 'Conservador' | 'Equilibrado' | 'Agressivo'; cost: number; durationMonths: number;
  team: string; risk: 'Baixo' | 'Médio' | 'Alto'; impact: string; dependencies: string; tradeoffs: string; benefits: string;
}

// ---------------- Demands ----------------
export type DemandStatus = 'Nova' | 'Triagem' | 'Em Análise' | 'Aguardando Informação' | 'Priorizada' | 'Aprovada' | 'Rejeitada' | 'Em Planejamento' | 'Convertida em Projeto' | 'Concluída';
export interface Demand {
  id: ID; orgId: ID; code: string; title: string; description: string;
  requesterId: ID; unitId: ID; category: string; type: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  urgency: 'Baixa' | 'Média' | 'Alta'; impact: 'Baixo' | 'Médio' | 'Alto';
  effort: 'P' | 'M' | 'G' | 'GG'; requestedAt: string; desiredDate?: string;
  analystId?: ID; status: DemandStatus; origin: string; benefit: string; justification: string;
  relatedProjectId?: ID;
}

// ---------------- Portfolio / Program ----------------
export interface Portfolio {
  id: ID; orgId: ID; name: string; description: string; ownerId: ID;
  objectiveIds: ID[]; budget: number; riskProfile: 'Baixo' | 'Médio' | 'Alto';
  priority: number; status: 'Ativo' | 'Em Revisão' | 'Encerrado';
}
export interface Program {
  id: ID; orgId: ID; code: string; name: string; objective: string; managerId: ID;
  benefits: string[]; budget: number; objectiveIds: ID[]; status: 'Ativo' | 'Planejamento' | 'Encerrado';
  start: string; end: string;
}

// ---------------- Projects ----------------
export type ProjectStatus = 'Potencial' | 'Em Análise' | 'Aprovado' | 'Planejamento' | 'Em Execução' | 'Suspenso' | 'Concluído' | 'Encerrado' | 'Cancelado';
export type Methodology = 'Preditiva' | 'Ágil' | 'Híbrida' | 'Personalizada';
export interface Project {
  id: ID; orgId: ID; code: string; name: string; description: string; objective: string;
  justification: string; sponsorId: ID; managerId: ID; pmoId?: ID; teamIds: ID[];
  start: string; plannedEnd: string; forecastEnd?: string; actualEnd?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica'; status: ProjectStatus;
  objectiveIds: ID[]; programId?: ID; portfolioId: ID;
  budget: number; methodology: Methodology; type: string;
  confidentiality: 'Público' | 'Interno' | 'Confidencial';
  unitId: ID; progress: number; tags: string[];
  charter?: Charter; scope?: { inScope: string[]; outScope: string[]; deliverables: string[] };
  createdAt: string; updatedAt: string;
}
export interface Charter {
  businessNeed: string; scope: string; benefits: string[]; deliverables: string[];
  assumptions: string[]; constraints: string[]; risks: string[]; approvedBy?: string; approvedAt?: string;
}

// ---------------- WBS / Tasks / Milestones ----------------
export type TaskStatus = 'Não Iniciada' | 'Planejada' | 'Em Andamento' | 'Em Revisão' | 'Bloqueada' | 'Aguardando Terceiro' | 'Concluída' | 'Cancelada';
export interface Task {
  id: ID; orgId: ID; projectId: ID; wbsCode?: string; title: string; description?: string;
  responsibleId?: ID; collaboratorIds: ID[];
  plannedStart: string; plannedEnd: string; actualStart?: string; actualEnd?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica'; status: TaskStatus; progress: number;
  dependencies: ID[]; estimatedH: number; actualH: number;
  tags: string[]; checklist?: { text: string; done: boolean }[]; blockingReason?: string;
  isMilestone?: boolean; critical?: boolean;
}
export interface Milestone {
  id: ID; projectId: ID; name: string; planned: string; forecast?: string; actual?: string;
  responsibleId?: ID; status: 'No prazo' | 'Em risco' | 'Atrasado' | 'Concluído';
}

// ---------------- Risks / Issues / Changes ----------------
export interface Risk {
  id: ID; orgId: ID; projectId?: ID; code: string; title: string; description: string;
  category: string; probability: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5;
  ownerId?: ID; trigger?: string; response: 'Evitar' | 'Mitigar' | 'Transferir' | 'Aceitar';
  mitigation?: string; contingency?: string; status: 'Identificado' | 'Monitorando' | 'Materializado' | 'Encerrado' | 'Sugestão da IA';
  reviewAt: string; aiSuggested?: boolean;
}
export interface Issue {
  id: ID; orgId: ID; projectId: ID; title: string; impact: string; severity: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  responsibleId?: ID; rootCause?: string; correctiveAction?: string; deadline?: string;
  status: 'Aberto' | 'Em Tratamento' | 'Resolvido' | 'Encerrado'; createdAt: string;
}
export type ChangeStatus = 'Solicitada' | 'Em Análise' | 'Aprovada' | 'Rejeitada' | 'Implementada';
export interface ChangeRequest {
  id: ID; orgId: ID; projectId: ID; code: string; title: string; reason: string; requesterId: ID;
  scopeImpact: 'Nenhum' | 'Baixo' | 'Médio' | 'Alto'; costImpact: number; scheduleImpactDays: number;
  riskImpact: string; recommendation?: string; status: ChangeStatus; createdAt: string; decidedAt?: string;
}

// ---------------- Costs / EVM ----------------
export interface CostEntry {
  id: ID; orgId: ID; projectId: ID; month: string; // YYYY-MM
  category: string; planned: number; actual: number; committed: number;
  publicTerms?: { dotacao?: number; empenho?: number; liquidacao?: number; contract?: string };
}
export interface EvmSnapshot {
  pv: number; ev: number; ac: number; cpi: number; spi: number;
  eac: number; etc: number; vac: number; at: string;
}

// ---------------- People ----------------
export interface Team { id: ID; orgId: ID; name: string; leadId?: ID; memberIds: ID[]; }
export interface Allocation { id: ID; userId: ID; projectId: ID; percent: number; role: string; from: string; to: string; }
export interface RaciItem { id: ID; projectId: ID; activity: string; raci: Record<ID, 'R' | 'A' | 'C' | 'I'>; }
export interface Stakeholder {
  id: ID; projectId: ID; name: string; organization: string; role: string;
  influence: 1 | 2 | 3 | 4 | 5; interest: 1 | 2 | 3 | 4 | 5; impact: string;
  engagement: 'Resistente' | 'Neutro' | 'Apoiador' | 'Líder'; strategy: string;
}

// ---------------- Meetings / Decisions / Docs ----------------
export interface Meeting {
  id: ID; orgId: ID; projectId?: ID; title: string; date: string; participantIds: ID[];
  agenda: string; minutes?: string; decisions?: string[]; actions?: string[]; status: 'Agendada' | 'Realizada';
}
export interface Decision {
  id: ID; orgId: ID; projectId?: ID; title: string; date: string; decisionMakerId: ID;
  context: string; alternatives: string[]; selected: string; reason: string; impact: string;
  status: 'Pendente' | 'Aprovada' | 'Registrada';
}
export interface Doc {
  id: ID; orgId: ID; projectId?: ID; name: string; category: string; folder: string; tags: string[];
  version: number; uploadedAt: string; responsibleId?: ID; expiresAt?: string;
  confidentiality: 'Público' | 'Interno' | 'Confidencial'; sizeKb: number;
}

// ---------------- Benefits / Lessons ----------------
export interface Benefit {
  id: ID; projectId: ID; description: string; type: 'Financeiro' | 'Operacional' | 'Social' | 'Estratégico' | 'Qualidade';
  baseline: string; target: string; method: string; responsibleId?: ID; measureAt?: string; actual?: string;
}
export interface Lesson {
  id: ID; orgId: ID; projectId: ID; situation: string; happened: string; cause: string;
  lesson: string; recommendation: string; category: string; createdAt: string;
}

// ---------------- Health / AI ----------------
export interface HealthScore {
  id: ID; projectId: ID; at: string; overall: number;
  dims: { label: string; value: number }[];
}
export interface AiInsight {
  id: ID; orgId: ID; kind: string; severity: 'Informação' | 'Atenção' | 'Alta' | 'Crítica';
  title: string; detail: string; projectId?: ID; dataUsed: string; confidence: number;
  assumptions?: string; createdAt: string;
}
export interface AiRecommendation {
  id: ID; orgId: ID; title: string; detail: string; rationale: string; projectId?: ID;
  action: { type: 'reassign' | 'reprioritize' | 'consolidate' | 'escalate' | 'review'; taskId?: ID; userId?: ID; demandIds?: ID[] };
  status: 'Pendente' | 'Aplicada' | 'Ignorada'; createdAt: string;
}
export interface AiForecast {
  id: ID; projectId: ID; generatedAt: string; forecastEnd: string; delayDays: number;
  delayProbability: number; budgetOverrunProbability: number; healthTrend: 'Melhorando' | 'Estável' | 'Piorando';
  bottlenecks: string[]; insufficient?: boolean; note?: string;
}

// ---------------- Alerts / Notifications / Audit / Events ----------------
export interface Alert {
  id: ID; orgId: ID; category: 'Prazo' | 'Risco' | 'Custo' | 'Equipe' | 'Aprovação' | 'Documento' | 'Estratégia' | 'IA' | 'Sistema';
  severity: 'Informação' | 'Atenção' | 'Alta' | 'Crítica';
  message: string; link?: Route; read: boolean; createdAt: string;
}
export interface Notification { id: ID; userId: ID; text: string; read: boolean; createdAt: string; }
export interface AuditLog {
  id: ID; orgId: ID; userId: ID; userName: string; at: string; action: string;
  entity: string; entityId?: ID; before?: string; after?: string;
}
export interface IntegrationEvent {
  id: ID; orgId: ID; source: string; type: string; payload: string; receivedAt: string; processed: boolean;
}
export interface CustomField {
  id: ID; orgId: ID; entity: 'Projeto' | 'Demanda' | 'Ideia' | 'Tarefa' | 'Risco';
  name: string; type: 'Texto' | 'Número' | 'Data' | 'Booleano' | 'Lista' | 'Usuário' | 'Moeda' | 'Percentual';
}

// ---------------- DB root ----------------
export interface DB {
  version: number;
  organizations: Organization[];
  units: OrgUnit[];
  roles: Role[];
  users: User[];
  plans: StrategicPlan[];
  objectives: StrategicObjective[];
  ideas: Idea[];
  demands: Demand[];
  portfolios: Portfolio[];
  programs: Program[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  changes: ChangeRequest[];
  costs: CostEntry[];
  teams: Team[];
  allocations: Allocation[];
  raci: RaciItem[];
  stakeholders: Stakeholder[];
  meetings: Meeting[];
  decisions: Decision[];
  documents: Doc[];
  benefits: Benefit[];
  lessons: Lesson[];
  health: HealthScore[];
  insights: AiInsight[];
  recommendations: AiRecommendation[];
  forecasts: AiForecast[];
  alerts: Alert[];
  notifications: Notification[];
  audit: AuditLog[];
  events: IntegrationEvent[];
  customFields: CustomField[];
}

export interface Session { userId: ID; orgId: ID; loggedAt: string; }
