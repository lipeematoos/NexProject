// ============================================================
// NETPROJECT — Intelligence & computation engine
// Rule-based decision-support layer. In production this module
// delegates to the AI_PROVIDER configured via environment
// variables; the deterministic core guarantees offline operation
// and full explainability ("Ver como esta análise foi gerada").
// ============================================================
import type { DB, ID, Project, Task, Idea, IdeaAnalysis, Scenario, AiForecast } from './types';

// ---------------- formatting (pt-BR / BRL) ----------------
export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const brlCompact = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return brl(n);
};
export const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const dt = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const fmtDateShort = (iso?: string) => {
  if (!iso) return '—';
  const dt = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};
export const fmtMonth = (ym: string) => {
  const [y, mo] = ym.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase();
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const addDaysISO = (days: number) => { const t = new Date(); t.setDate(t.getDate() + days); return t.toISOString().slice(0, 10); };
export const daysUntil = (iso?: string) => {
  if (!iso) return 0;
  const a = new Date(todayISO() + 'T00:00:00').getTime();
  const b = new Date((iso.length <= 10 ? iso : iso.slice(0, 10)) + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
};
export const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dd = Math.round(h / 24);
  return dd === 1 ? 'há 1 dia' : `há ${dd} dias`;
};
export const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

// ---------------- queries ----------------
export const tasksOf = (db: DB, projectId: ID) => db.tasks.filter(t => t.projectId === projectId);
export const overdueTasks = (db: DB, projectId?: ID, orgId?: ID) =>
  db.tasks.filter(t => (projectId ? t.projectId === projectId : true) && (orgId ? t.orgId === orgId : true) &&
    !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO() && t.progress < 100);
export const criticalOverdue = (db: DB, projectId?: ID, orgId?: ID) =>
  overdueTasks(db, projectId, orgId).filter(t => t.critical || t.priority === 'Crítica');
export const activeProjects = (db: DB) =>
  db.projects.filter(p => ['Em Execução', 'Planejamento', 'Aprovado'].includes(p.status));
export const projectCosts = (db: DB, projectId: ID) => db.costs.filter(c => c.projectId === projectId);

// ---------------- EVM (Earned Value Management) ----------------
export function evm(db: DB, projectId: ID) {
  const p = db.projects.find(x => x.id === projectId);
  if (!p) return null;
  const costs = projectCosts(db, projectId);
  const ac = costs.reduce((s, c) => s + c.actual, 0);
  const pv = costs.reduce((s, c) => s + c.planned, 0);
  const ev = (p.budget * p.progress) / 100;
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 1;
  const eac = cpi > 0 ? p.budget / cpi : p.budget;
  const etc = Math.max(0, eac - ac);
  const vac = p.budget - eac;
  return { pv, ev, ac, cpi, spi, eac, etc, vac };
}
export const evmExplainer: Record<string, string> = {
  pv: 'Valor Planejado (PV): quanto deveria ter sido executado financeiramente até agora.',
  ev: 'Valor Agregado (EV): valor do trabalho realmente concluído, medido pela linha de base.',
  ac: 'Custo Real (AC): quanto foi efetivamente gasto até agora.',
  cpi: 'Índice de Desempenho de Custos: acima de 1,00 indica economia; abaixo, estouro.',
  spi: 'Índice de Desempenho de Prazo: acima de 1,00 indica adiantamento; abaixo, atraso.',
  eac: 'Estimativa no Término (EAC): custo total projetado para o projeto.',
  etc: 'Estimativa para Terminar (ETC): quanto ainda deve ser gasto.',
  vac: 'Variação na Conclusão (VAC): diferença entre orçamento e projeção final.',
};

// ---------------- Health score ----------------
const WEIGHTS = { Cronograma: 0.2, Custos: 0.18, Escopo: 0.12, Riscos: 0.16, Equipe: 0.14, Entregas: 0.2 };
export function computeHealth(db: DB, projectId: ID): { overall: number; dims: { label: string; value: number }[] } {
  const p = db.projects.find(x => x.id === projectId);
  if (!p) return { overall: 0, dims: [] };
  const tasks = tasksOf(db, projectId);
  const done = tasks.filter(t => t.status === 'Concluída');
  const over = overdueTasks(db, projectId);
  const crit = criticalOverdue(db, projectId);

  const schedule = clamp(100 - over.length * 9 - crit.length * 6 - (daysUntil(p.forecastEnd ?? p.plannedEnd) < 0 ? 25 : 0) + done.length * 2);
  const e = evm(db, projectId);
  const cost = e ? clamp(50 + e.cpi * 45) : 80;
  const openChanges = db.changes.filter(c => c.projectId === projectId && ['Solicitada', 'Em Análise'].includes(c.status)).length;
  const scope = clamp(95 - openChanges * 10 - (p.methodology === 'Ágil' ? 0 : 4));
  const risks = db.risks.filter(r => r.projectId === projectId && !['Encerrado'].includes(r.status));
  const exposure = risks.reduce((s, r) => s + r.probability * r.impact, 0);
  const riskScore = clamp(100 - exposure * 3.2);
  const allocs = db.allocations.filter(a => p.teamIds.includes(a.userId));
  const overload = allocs.filter(a => {
    const total = db.allocations.filter(x => x.userId === a.userId).reduce((s, x) => s + x.percent, 0);
    return total > 110;
  }).length;
  const team = clamp(92 - overload * 18);
  const deliveries = clamp(tasks.length ? (done.length / tasks.length) * 60 + p.progress * 0.4 : p.progress);

  const dims = [
    { label: 'Cronograma', value: Math.round(schedule) },
    { label: 'Custos', value: Math.round(cost) },
    { label: 'Escopo', value: Math.round(scope) },
    { label: 'Riscos', value: Math.round(riskScore) },
    { label: 'Equipe', value: Math.round(team) },
    { label: 'Entregas', value: Math.round(deliveries) },
  ];
  const overall = Math.round(dims.reduce((s, dim) => s + dim.value * (WEIGHTS[dim.label as keyof typeof WEIGHTS] ?? 0.15), 0));
  return { overall: clamp(overall), dims };
}
export const healthTone = (v: number): 'ok' | 'warn' | 'crit' => (v >= 75 ? 'ok' : v >= 55 ? 'warn' : 'crit');
export const healthLabel = (v: number) => (v >= 85 ? 'Excelente' : v >= 75 ? 'Saudável' : v >= 55 ? 'Em Atenção' : 'Crítico');

// ---------------- workload ----------------
export function workloadOf(db: DB, userId: ID) {
  const total = db.allocations.filter(a => a.userId === userId).reduce((s, a) => s + a.percent, 0);
  const level = total > 110 ? 'Sobrecarga' : total > 90 ? 'Alta utilização' : total >= 60 ? 'Adequada' : 'Subutilizada';
  return { total, level };
}

// ---------------- AI: insights ----------------
export function generateInsights(db: DB, orgId?: ID) {
  const out: { severity: 'Informação' | 'Atenção' | 'Alta' | 'Crítica'; kind: string; title: string; detail: string; projectId?: ID; confidence: number; dataUsed: string }[] = [];
  const scope = <T extends { orgId: ID }>(arr: T[]) => (orgId ? arr.filter(x => x.orgId === orgId) : arr);
  for (const p of scope(activeProjects(db))) {
    const over = overdueTasks(db, p.id);
    const crit = criticalOverdue(db, p.id);
    if (crit.length >= 2) out.push({ severity: 'Crítica', kind: 'Atividades', title: `${p.code} possui ${crit.length} atividades críticas vencidas`, detail: `As atividades vencidas estão no caminho crítico e pressionam o marco de entrega. Recomenda-se força-tarefa ou replanejamento formal.`, projectId: p.id, confidence: 95, dataUsed: `${over.length} tarefas vencidas, ${crit.length} críticas` });
    const slip = daysUntil(p.forecastEnd ?? p.plannedEnd) - daysUntil(p.plannedEnd);
    if (slip > 0) out.push({ severity: slip > 14 ? 'Alta' : 'Atenção', kind: 'Cronograma', title: `${p.name} apresenta tendência de atraso de ${slip} dias`, detail: `A previsão de conclusão moveu de ${fmtDate(p.plannedEnd)} para ${fmtDate(p.forecastEnd)}.`, projectId: p.id, confidence: 86, dataUsed: 'linha de base × previsão atual' });
    const e = evm(db, p.id);
    if (e && e.cpi < 0.92 && e.ac > 100000) out.push({ severity: 'Alta', kind: 'Custos', title: `${p.name} está com orçamento ${Math.round((1 - e.cpi) * 100)}% acima da linha de base`, detail: `CPI acumulado de ${e.cpi.toFixed(2)}. Projeção de estouro: ${brlCompact(Math.max(0, e.eac - p.budget))}.`, projectId: p.id, confidence: 90, dataUsed: `${db.costs.filter(c => c.projectId === p.id).length} medições de custo` });
    const stalled = db.tasks.filter(t => t.projectId === p.id && t.status === 'Em Andamento' && (Date.now() - new Date(t.actualStart ?? t.plannedStart).getTime() > 21 * 86400000) && t.progress > 0 && t.progress < 100).length;
    if (stalled >= 2) out.push({ severity: 'Atenção', kind: 'Execução', title: `${p.code}: ${stalled} atividades sem avanço relevante`, detail: 'Atividades em andamento sem atualização de progresso significativa nas últimas semanas.', projectId: p.id, confidence: 68, dataUsed: 'histórico de progresso das tarefas' });
  }
  // workload
  for (const u of scope(db.users)) {
    const w = workloadOf(db, u.id);
    if (w.total > 110) out.push({ severity: 'Alta', kind: 'Recursos', title: `Sobrecarga sustentada de ${u.name.split(' ')[0]} (${w.total}%)`, detail: 'Alocação acima de 100% compromete prazos e qualidade. Considere redistribuição.', confidence: 93, dataUsed: 'alocações ativas × capacidade semanal' });
  }
  // approvals
  const pendingDecisions = scope(db.decisions).filter(x => x.status === 'Pendente').length + scope(db.changes).filter(x => ['Solicitada', 'Em Análise'].includes(x.status)).length;
  if (pendingDecisions > 0) out.push({ severity: pendingDecisions >= 4 ? 'Alta' : 'Atenção', kind: 'Governança', title: `${pendingDecisions} decisões aguardando aprovação executiva`, detail: 'Pendências de decisão travam mudanças e consolidações no portfólio.', confidence: 99, dataUsed: 'registro de decisões e mudanças' });
  // demands grouping
  const net = scope(db.demands).filter(x => ['Nova', 'Triagem', 'Em Análise', 'Priorizada'].includes(x.status) && x.category.toLowerCase().includes('rede'));
  if (net.length >= 2) out.push({ severity: 'Atenção', kind: 'Demandas', title: `${net.length} demandas de rede podem ser consolidadas`, detail: 'Padrão identificado: modernização de infraestrutura de rede tratada em demandas isoladas. Considere consolidá-las em um programa.', confidence: 74, dataUsed: `${net.length} demandas ativas correlatas` });
  if (out.length === 0) out.push({ severity: 'Informação', kind: 'Portfólio', title: 'Nenhuma anomalia crítica detectada', detail: 'Cronogramas, custos, riscos e capacidade estão dentro dos limites configurados. Novas análises são geradas a cada atualização de dados.', confidence: 97, dataUsed: 'todos os módulos monitorados' });
  const order = { Crítica: 0, Alta: 1, Atenção: 2, Informação: 3 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]).map(x => ({ ...x, id: uid(), orgId: '', createdAt: new Date().toISOString(), assumptions: 'Dados atuais dos módulos de projetos, tarefas, custos e recursos.', limitations: undefined as unknown as string }));
}

// ---------------- AI: forecast ----------------
export function forecastProject(db: DB, projectId: ID): AiForecast {
  const p = db.projects.find(x => x.id === projectId)!;
  const tasks = tasksOf(db, projectId);
  const withProgress = tasks.filter(t => t.progress > 0 && t.progress < 100);
  if (tasks.length < 3) {
    return { id: uid(), projectId, generatedAt: new Date().toISOString(), forecastEnd: p.plannedEnd, delayDays: 0, delayProbability: 0, budgetOverrunProbability: 0, healthTrend: 'Estável', bottlenecks: [], insufficient: true, note: 'Não há dados suficientes para gerar uma previsão confiável.' };
  }
  const slip = Math.max(0, daysUntil(p.forecastEnd ?? p.plannedEnd) - daysUntil(p.plannedEnd));
  const over = overdueTasks(db, projectId);
  const e = evm(db, projectId);
  const delayProbability = clamp(Math.round(slip * 2.2 + over.length * 7 + (p.forecastEnd && p.forecastEnd > p.plannedEnd ? 15 : 0)), 3, 95);
  const budgetOverrunProbability = e ? clamp(Math.round((1.05 - e.cpi) * 220 + over.length * 3), 2, 95) : 10;
  const history = db.health.filter(h => h.projectId === projectId).sort((a, b) => a.at.localeCompare(b.at));
  let trend: AiForecast['healthTrend'] = 'Estável';
  if (history.length >= 2) {
    const diff = history[history.length - 1].overall - history[0].overall;
    trend = diff <= -4 ? 'Piorando' : diff >= 4 ? 'Melhorando' : 'Estável';
  }
  const bottlenecks: string[] = [];
  const blocked = tasks.filter(t => t.status === 'Bloqueada' || t.status === 'Aguardando Terceiro');
  blocked.slice(0, 2).forEach(t => bottlenecks.push(t.blockingReason ?? t.title));
  for (const uidA of p.teamIds) { const w = workloadOf(db, uidA); if (w.total > 110) bottlenecks.push(`Capacidade de ${db.users.find(u => u.id === uidA)?.name.split(' ')[0]} (${w.total}%)`); }
  return {
    id: uid(), projectId, generatedAt: new Date().toISOString(),
    forecastEnd: p.forecastEnd ?? p.plannedEnd, delayDays: slip, delayProbability, budgetOverrunProbability,
    healthTrend: trend, bottlenecks: bottlenecks.slice(0, 4),
  };
}

// ---------------- AI: advisor (NEX Advisor) ----------------
export interface AdvisorAnswer { answer: string; sources: string[]; suggestions: string[] }
export function advisorAsk(db: DB, orgId: ID, question: string): AdvisorAnswer {
  const q = question.toLowerCase();
  const name = (id: ID) => db.users.find(u => u.id === id)?.name ?? '—';
  const projects = db.projects.filter(p => p.orgId === orgId);
  const proj = (frag: string) => projects.find(p => (p.name + p.code).toLowerCase().includes(frag));
  const extractProject = () => {
    for (const p of projects) if (q.includes(p.name.toLowerCase()) || q.includes(p.code.toLowerCase())) return p;
    const m = q.match(/projeto\s+([a-z0-9à-ú .-]+)/i);
    if (m) return proj(m[1].trim().split(/\s+(?:está|tem|e\b|com)/)[0]);
    return undefined;
  };
  const p = extractProject();

  if (/(atenção|atencao|hoje|prioridade)/.test(q)) {
    const insights = generateInsights(db, orgId).slice(0, 4);
    return {
      answer: `Hoje há ${overdueTasks(db, undefined, orgId).length} tarefas vencidas na organização e ${db.decisions.filter(x => x.orgId === orgId && x.status === 'Pendente').length + db.changes.filter(c => c.orgId === orgId && ['Solicitada', 'Em Análise'].includes(c.status)).length} decisões pendentes. As prioridades da Inteligência:\n${insights.map((i, n) => `${n + 1}. [${i.severity}] ${i.title}`).join('\n')}`,
      sources: [`${overdueTasks(db, undefined, orgId).length} tarefas vencidas`, `${insights.length} análises da Inteligência`, 'registro de decisões e mudanças'],
      suggestions: ['Qual é o maior risco do portfólio?', 'Quais equipes estão sobrecarregadas?', 'Quais decisões precisam ser tomadas esta semana?'],
    };
  }
  if (p && /(por que|porque|atrasad)/.test(q)) {
    const over = overdueTasks(db, p.id);
    const issues = db.issues.filter(i => i.projectId === p.id && i.status !== 'Resolvido');
    const ms = db.milestones.filter(x => x.projectId === p.id && x.status === 'Atrasado');
    const fc = forecastProject(db, p.id);
    return {
      answer: `${p.name} está com ${p.progress}% de progresso e previsão de conclusão em ${fmtDate(fc.forecastEnd)} (${fc.delayDays > 0 ? `+${fc.delayDays} dias` : 'no prazo'}). Fatores identificados:\n• ${over.length} tarefas vencidas (${criticalOverdue(db, p.id).length} críticas)\n• ${ms.length} marco(s) atrasado(s)\n• ${issues.length} problema(s) ativo(s): ${issues.map(i => i.title).join('; ') || 'nenhum'}\n• ${db.tasks.filter(t => t.projectId === p.id && ['Bloqueada', 'Aguardando Terceiro'].includes(t.status)).length} atividade(s) bloqueada(s) por terceiros\nMantida a tendência, a probabilidade de atraso é de ${fc.delayProbability}%.`,
      sources: [`${over.length} tarefas vencidas`, `${ms.length} marcos atrasados`, `${issues.length} problemas ativos`, 'linha de base × previsão'],
      suggestions: [`Resuma o projeto ${p.code} para uma reunião executiva`, 'Quais decisões precisam ser tomadas esta semana?', 'Qual é o maior risco do portfólio?'],
    };
  }
  if (/(maior risco|risco do portf)/.test(q)) {
    const top = db.risks.filter(r => r.orgId === orgId && r.status !== 'Encerrado').sort((a, b) => b.probability * b.impact - a.probability * a.impact)[0];
    const pn = top?.projectId ? projects.find(x => x.id === top.projectId)?.name : 'nível de portfólio';
    return {
      answer: top
        ? `O maior risco atual é "${top.title}" (exposição ${top.probability * top.impact}/25, probabilidade ${top.probability}/5 × impacto ${top.impact}/5), em ${pn}. Estratégia: ${top.response.toLowerCase()} — ${top.mitigation ?? 'sem plano de mitigação registrado'}. ${top.aiSuggested ? 'Este risco foi sugerido pela Inteligência e aguarda confirmação.' : ''}`
        : 'Nenhum risco ativo encontrado para o portfólio.',
      sources: ['matriz de riscos (probabilidade × impacto)', 'registro de mitigações'],
      suggestions: ['Quais projetos precisam da minha atenção hoje?', 'Quais projetos têm maior chance de atraso?'],
    };
  }
  if (/(chance de atraso|maior chance|probabilidade)/.test(q)) {
    const ranked = projects.filter(x => activeProjects(db).some(a => a.id === x.id)).map(x => ({ x, f: forecastProject(db, x.id) })).sort((a, b) => b.f.delayProbability - a.f.delayProbability).slice(0, 4);
    return {
      answer: `Projetos com maior probabilidade de atraso:\n${ranked.map((r, i) => `${i + 1}. ${r.x.name} — ${r.f.delayProbability}% (previsão ${fmtDate(r.f.forecastEnd)}${r.f.delayDays ? `, +${r.f.delayDays} dias` : ''})`).join('\n')}`,
      sources: [`${ranked.length} previsões NEX Forecast`, 'linhas de base e tendências de progresso'],
      suggestions: [`Por que o projeto ${ranked[0]?.x.code ?? ''} está atrasado?`, 'Quais equipes estão sobrecarregadas?'],
    };
  }
  if (/(sobrecarregad|equipe|capacidade|recursos)/.test(q)) {
    const rows = db.users.filter(u => u.orgId === orgId).map(u => ({ u, w: workloadOf(db, u.id) })).filter(r => r.w.total > 0).sort((a, b) => b.w.total - a.w.total);
    return {
      answer: `Carga de trabalho por pessoa:\n${rows.map(r => `• ${r.u.name} — ${r.w.total}% (${r.w.level})`).join('\n')}\n${rows.filter(r => r.w.total > 110).length ? 'A Inteligência recomenda redistribuir tarefas não críticas das pessoas em sobrecarga. Há recomendação pendente em Inteligência → Recomendações.' : 'Nenhuma sobrecarga crítica identificada.'}`,
      sources: [`${db.allocations.filter(a => rows.some(r => r.u.id === a.userId)).length} alocações ativas`, 'capacidade semanal individual'],
      suggestions: ['Quais projetos precisam da minha atenção hoje?', 'Quais demandas deveriam virar projeto?'],
    };
  }
  if (/(decis)/.test(q)) {
    const pend = db.decisions.filter(x => x.orgId === orgId && x.status === 'Pendente');
    const ch = db.changes.filter(c => c.orgId === orgId && ['Solicitada', 'Em Análise'].includes(c.status));
    return {
      answer: `Decisões pendentes esta semana:\n${pend.map(x => `• ${x.title} (${x.projectId ? projects.find(p2 => p2.id === x.projectId)?.code ?? '' : 'portfólio'})`).join('\n') || '• Nenhuma decisão pendente'}\nMudanças aguardando aprovação:\n${ch.map(c => `• ${c.code} — ${c.title}`).join('\n') || '• Nenhuma'}`,
      sources: [`${pend.length} decisões pendentes`, `${ch.length} mudanças em fluxo de aprovação`],
      suggestions: ['Qual é o maior risco do portfólio?', 'Quais projetos precisam da minha atenção hoje?'],
    };
  }
  if (p && /(resum|compare não)/.test(q) && /resum/.test(q)) {
    const h = computeHealth(db, p.id);
    const e = evm(db, p.id);
    const over = overdueTasks(db, p.id);
    return {
      answer: `${p.name} (${p.code}) — saúde geral ${h.overall}/100 (${healthLabel(h.overall)}). Status: ${p.status}, progresso ${p.progress}%, conclusão prevista ${fmtDate(p.forecastEnd ?? p.plannedEnd)}. Orçamento ${brlCompact(p.budget)}, CPI ${e ? e.cpi.toFixed(2) : '—'}. ${over.length} tarefas vencidas. Objetivo estratégico: ${p.objectiveIds.map(o => db.objectives.find(x => x.id === o)?.name).filter(Boolean).join('; ')}. Sponsor: ${name(p.sponsorId)}. Gerente: ${name(p.managerId)}.`,
      sources: ['índice de saúde', 'EVM', 'tarefas vencidas', 'mapa estratégico'],
      suggestions: [`Por que o projeto ${p.code} está atrasado?`, 'Quais decisões precisam ser tomadas esta semana?'],
    };
  }
  if (/compar/.test(q)) {
    const [a, b] = projects.filter(x => q.includes(x.code.toLowerCase()) || q.includes(x.name.split(' ')[0].toLowerCase())).slice(0, 2);
    const pa = a ?? projects[0], pb = b ?? projects[1];
    if (pa && pb && pa.id !== pb.id) {
      const ha = computeHealth(db, pa.id), hb = computeHealth(db, pb.id);
      const ea = evm(db, pa.id), eb = evm(db, pb.id);
      return {
        answer: `${pa.name} × ${pb.name}:\n• Saúde: ${ha.overall}/100 × ${hb.overall}/100\n• Progresso: ${pa.progress}% × ${pb.progress}%\n• CPI: ${ea?.cpi.toFixed(2) ?? '—'} × ${eb?.cpi.toFixed(2) ?? '—'}\n• Tarefas vencidas: ${overdueTasks(db, pa.id).length} × ${overdueTasks(db, pb.id).length}\n• Orçamento: ${brlCompact(pa.budget)} × ${brlCompact(pb.budget)}\nConclusão: ${ha.overall >= hb.overall ? pa.code : pb.code} apresenta melhor condição relativa de execução.`,
        sources: ['índices de saúde', 'EVM', 'tarefas vencidas'],
        suggestions: ['Quais projetos têm maior chance de atraso?'],
      };
    }
  }
  if (/(demandas? .*virar|demandas? .*projeto|deveriam)/.test(q)) {
    const cands = db.demands.filter(x => ['Priorizada', 'Aprovada'].includes(x.status));
    return {
      answer: cands.length
        ? `Demandas com perfil para conversão em projeto:\n${cands.map(x => `• ${x.code} — ${x.title} (${x.status}, esforço ${x.effort}, impacto ${x.impact})`).join('\n')}\nA consolidação das demandas de rede em programa segue como recomendação pendente.`
        : 'Nenhuma demanda pronta para conversão neste momento.',
      sources: [`${cands.length} demandas priorizadas/aprovadas`, 'matriz impacto × esforço'],
      suggestions: ['Quais equipes estão sobrecarregadas?', 'Qual é o maior risco do portfólio?'],
    };
  }
  // default
  const over = overdueTasks(db, undefined, orgId);
  return {
    answer: `Posso ajudar com análises do portfólio. Encontrei ${over.length} tarefas vencidas, ${db.risks.filter(r => r.orgId === orgId && r.status !== 'Encerrado').length} riscos ativos e ${db.decisions.filter(x => x.orgId === orgId && x.status === 'Pendente').length} decisões pendentes na organização. Experimente uma das perguntas sugeridas abaixo.`,
    sources: ['módulos de tarefas, riscos e decisões'],
    suggestions: ['Quais projetos precisam da minha atenção hoje?', 'Por que o projeto PRJ-2025-001 está atrasado?', 'Qual é o maior risco do portfólio?', 'Quais equipes estão sobrecarregadas?', 'Resuma o projeto PRJ-2025-003 para uma reunião executiva'],
  };
}

// ---------------- AI: idea analysis (NEX Strategy) ----------------
const hashNum = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return h; };
export function analyzeIdea(idea: Idea, orgSector: 'public' | 'private'): IdeaAnalysis {
  const h = hashNum(idea.title);
  const base = 46 + (h % 22) + (idea.urgency === 'Alta' ? 12 : idea.urgency === 'Média' ? 6 : 0);
  const components = [
    { label: 'Alinhamento Estratégico', value: clamp(base + (orgSector === 'public' ? 10 : 6)), weight: 0.2 },
    { label: 'Impacto', value: clamp(base + 8), weight: 0.18 },
    { label: 'Urgência', value: clamp(idea.urgency === 'Alta' ? base + 18 : base), weight: 0.12 },
    { label: 'Viabilidade Técnica', value: clamp(base + 4), weight: 0.15 },
    { label: orgSector === 'public' ? 'Viabilidade Orçamentária' : 'Viabilidade Financeira', value: clamp(base - 4), weight: 0.15 },
    { label: 'Capacidade Organizacional', value: clamp(base - 8), weight: 0.1 },
    { label: 'Risco (inverso)', value: clamp(base - 2), weight: 0.05 },
    { label: 'Complexidade (inversa)', value: clamp(base - 6), weight: 0.05 },
  ];
  const score = Math.round(clamp(components.reduce((s, c) => s + c.value * c.weight, 0), 5, 96));
  const low = score < 55, mid = score >= 55 && score < 72;
  const scenarios: Scenario[] = [
    { name: 'Conservador', cost: 380000 + (h % 9) * 20000, durationMonths: 8, team: '2 pessoas + apoio do PMO', risk: 'Baixo', impact: 'Atende ao problema central com escopo mínimo', dependencies: 'Nenhuma além de orçamento', tradeoffs: 'Menor benefício no curto prazo', benefits: idea.benefit },
    { name: 'Equilibrado', cost: 620000 + (h % 9) * 25000, durationMonths: 5, team: '3 pessoas dedicadas', risk: 'Médio', impact: 'Resolve o problema com cobertura ampla', dependencies: 'Integração com sistemas existentes', tradeoffs: 'Exige dedicação parcial da equipe', benefits: idea.benefit },
    { name: 'Agressivo', cost: 940000 + (h % 9) * 30000, durationMonths: 3, team: '4 pessoas + fornecedor externo', risk: 'Alto', impact: 'Antecipa benefícios e amplia escopo', dependencies: 'Contratação emergencial', tradeoffs: 'Risco de qualidade e dependência de fornecedor', benefits: idea.benefit },
  ];
  return {
    id: uid(), ideaId: idea.id, generatedAt: new Date().toISOString(), engine: 'NEX Strategy v2 (análise preliminar)',
    summary: `A proposta "${idea.title}" ataca o problema: ${idea.problem} O benefício declarado é: ${idea.benefit} A análise preliminar indica viabilidade ${mid ? 'moderada' : low ? 'incerta, exigindo estudos adicionais' : 'favorável'}, com recomendação de ${low ? 'aprofundar o estudo de viabilidade antes de priorizar' : mid ? 'avançar para estudo de viabilidade com patrocínio definido' : 'priorizar e converter em demanda estruturada'}.`,
    problem: idea.problem,
    objective: `Resolver: ${idea.problem}`,
    justification: idea.benefit,
    stakeholders: [idea.area, 'PMO', idea.audience, orgSector === 'public' ? 'Controle interno' : 'Diretoria'],
    areas: [idea.area, 'TI', orgSector === 'public' ? 'Fazenda' : 'Financeiro'],
    resources: ['Equipe interna multidisciplinar', 'Orçamento de investimento (CAPEX)', orgSector === 'public' ? 'Dotação orçamentária específica' : 'Budget da unidade'],
    timeEstimate: `${scenarios[1].durationMonths} meses (cenário equilibrado)`,
    costEstimate: `Entre ${brlCompact(scenarios[0].cost)} e ${brlCompact(scenarios[2].cost)}`,
    complexity: idea.urgency === 'Alta' ? 'Média' : 'Média',
    dependencies: ['Disponibilidade orçamentária', 'Definição de patrocínio', 'Integrações com sistemas legados'],
    risks: ['Escopo subdimensionado na fase de ideia', 'Concorrência por recursos com a operação', orgSector === 'public' ? 'Prazos do ciclo de contratação pública' : 'Variação de custos de fornecedores'],
    benefits: [idea.benefit, orgSector === 'public' ? 'Valor público e transparência' : 'Produtividade e redução de custo'],
    indicators: ['Tempo médio de atendimento', 'Satisfação do usuário', orgSector === 'public' ? 'Redução de processos físicos' : 'Custo por transação'],
    scenarios,
    recommendation: score >= 72
      ? 'Recomenda-se converter a ideia em demanda estruturada e incluí-la na próxima janela de priorização do portfólio.'
      : mid ? 'Recomenda-se estudo de viabilidade com critérios de sucesso definidos antes da priorização.'
      : 'Recomenda-se revisar o escopo e o problema declarado; dados insuficientes para priorização.',
    confirmed: [`Ideia registrada por ${idea.authorId} em ${idea.area}`, `Urgência declarada: ${idea.urgency}`, `Problema e benefício descritos pelo autor`],
    estimates: [`Prazo de ${scenarios[1].durationMonths} meses (cenário equilibrado)`, `Custo entre ${brlCompact(scenarios[0].cost)} e ${brlCompact(scenarios[2].cost)}`, 'Equipe de 2 a 4 pessoas'],
    hypotheses: ['O problema declarado representa a causa raiz', 'Há sponsor disposto a patrocinar a iniciativa', 'Sistemas legados permitem integração'],
    assumptions: ['Orçamento disponível no próximo ciclo', 'Equipe interna com capacidade parcial', orgSector === 'public' ? 'Ciclo de contratação dentro dos prazos médios históricos' : 'Aprovação executiva em até 30 dias'],
    score, components, confidence: clamp(58 + (h % 24)),
    limitations: ['Análise baseada apenas no texto da ideia, sem dados operacionais', 'Estimativas de custo e prazo são ordens de grandeza, não cotações', 'Não substitui estudo de viabilidade formal'],
    dataUsed: ['Texto da ideia (título, problema, benefício)', 'Parâmetros da organização', 'Critérios do modelo de pontuação preliminar'],
  };
}

// ---------------- Weighted prioritization ----------------
export const CRITERIA = [
  { key: 'alignment', label: 'Alinhamento Estratégico', weight: 0.2 },
  { key: 'impact', label: 'Impacto', weight: 0.18 },
  { key: 'urgency', label: 'Urgência', weight: 0.12 },
  { key: 'value', label: 'Valor (público/financeiro)', weight: 0.15 },
  { key: 'legal', label: 'Obrigação Legal', weight: 0.1 },
  { key: 'risk', label: 'Risco Operacional (inverso)', weight: 0.1 },
  { key: 'feasibility', label: 'Viabilidade', weight: 0.15 },
] as const;
export function scoreProject(db: DB, p: Project): number {
  const h = hashNum(p.id);
  const hasObj = p.objectiveIds.length > 0;
  const vals: Record<string, number> = {
    alignment: hasObj ? 70 + (h % 25) : 25 + (h % 15),
    impact: p.priority === 'Crítica' ? 88 : p.priority === 'Alta' ? 74 : 55,
    urgency: daysUntil(p.plannedEnd) < 60 ? 85 : 55 + (h % 20),
    value: p.budget > 5_000_000 ? 70 + (h % 20) : 60 + (h % 25),
    legal: p.tags.includes('transparência') || p.type === 'Compliance' ? 90 : 40 + (h % 20),
    risk: 90 - db.risks.filter(r => r.projectId === p.id).reduce((s, r) => s + r.probability * r.impact, 0) * 2.4,
    feasibility: p.status === 'Em Execução' ? 80 : 62 + (h % 18),
  };
  return Math.round(clamp(CRITERIA.reduce((s, c) => s + clamp(vals[c.key]) * c.weight, 0)));
}

// ---------------- CSV export ----------------
export function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [header, ...rows].map(r => r.map(esc).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const TASK_COLUMNS: { status: string; tone: string }[] = [
  { status: 'Não Iniciada', tone: 'neutral' }, { status: 'Planejada', tone: 'steel' },
  { status: 'Em Andamento', tone: 'teal' }, { status: 'Em Revisão', tone: 'amber' },
  { status: 'Bloqueada', tone: 'red' }, { status: 'Aguardando Terceiro', tone: 'orange' },
  { status: 'Concluída', tone: 'green' }, { status: 'Cancelada', tone: 'neutral' },
];
