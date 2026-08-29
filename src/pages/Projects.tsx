import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import type { Project, Methodology } from '../lib/types';
import { Card, PageHeader, Btn, Chip, StatusChip, Modal, Field, Input, Textarea, Select, EmptyState, Progress, Avatar } from '../components/ui';
import { brlCompact, fmtDate, computeHealth, healthLabel, todayISO, addDaysISO, uid } from '../lib/engine';
import { Plus, Search, LayoutTemplate, Briefcase } from 'lucide-react';

const TEMPLATES = [
  { name: 'Projeto de TI', type: 'Tecnologia', methodology: 'Híbrida' as Methodology, phases: ['Iniciação', 'Infraestrutura', 'Implantação', 'Encerramento'] },
  { name: 'Projeto de Obras', type: 'Obras', methodology: 'Preditiva' as Methodology, phases: ['Projeto Executivo', 'Licitação', 'Execução', 'Medições', 'Entrega'] },
  { name: 'Transformação Digital', type: 'Modernização', methodology: 'Híbrida' as Methodology, phases: ['Diagnóstico', 'Portfólio de Iniciativas', 'Ondas de Implantação', 'Adoção'] },
  { name: 'Projeto Administrativo', type: 'Administrativo', methodology: 'Preditiva' as Methodology, phases: ['Levantamento', 'Implantação', 'Treinamento'] },
  { name: 'Projeto Estratégico', type: 'Políticas Públicas', methodology: 'Híbrida' as Methodology, phases: ['Estudo', 'Desenho', 'Piloto', 'Escala'] },
  { name: 'Projeto Ágil', type: 'Tecnologia', methodology: 'Ágil' as Methodology, phases: ['Discovery', 'Sprint 1', 'Sprint 2', 'Sprint 3'] },
  { name: 'Projeto de Inovação', type: 'Inovação', methodology: 'Ágil' as Methodology, phases: ['Ideação', 'Prova de Conceito', 'MVP', 'Escala'] },
];

export function ProjectsPage() {
  const { db, session, user, nav, route, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('Todos');
  const [fPriority, setFPriority] = useState('Todas');
  const [showNew, setShowNew] = useState(route.tab === 'novo');
  useEffect(() => { if (route.tab === 'novo') setShowNew(true); }, [route.tab]);

  const projects = useMemo(() => db.projects.filter(p => p.orgId === orgId)
    .filter(p => fStatus === 'Todos' || p.status === fStatus)
    .filter(p => fPriority === 'Todas' || p.priority === fPriority)
    .filter(p => !q || (p.name + p.code + p.description).toLowerCase().includes(q.toLowerCase())), [db, orgId, q, fStatus, fPriority]);

  const statuses = ['Todos', 'Em Execução', 'Planejamento', 'Aprovado', 'Em Análise', 'Concluído', 'Suspenso'];
  const managerName = (id: string) => db.users.find(u => u.id === id);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Carteira de projetos" title="Projetos" subtitle="Ciclo completo: iniciação, planejamento, execução, monitoramento, previsão e encerramento com trilha de auditoria."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Novo Projeto</Btn>} />

      <div className="flex flex-wrap gap-2 mb-4 anim-rise">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, código ou descrição…" className="!pl-8" />
        </div>
        <Select value={fStatus} onChange={e => setFStatus(e.target.value)} className="!w-auto">{statuses.map(s => <option key={s}>{s}</option>)}</Select>
        <Select value={fPriority} onChange={e => setFPriority(e.target.value)} className="!w-auto">{['Todas', 'Crítica', 'Alta', 'Média', 'Baixa'].map(s => <option key={s}>{s}</option>)}</Select>
      </div>

      {projects.length === 0 ? <Card><EmptyState title="Nenhum projeto encontrado" hint="Ajuste os filtros ou crie um novo projeto." /></Card> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {projects.map(p => {
            const h = computeHealth(db, p.id).overall;
            const mgr = managerName(p.managerId);
            const slip = (p.forecastEnd ?? p.plannedEnd) > p.plannedEnd;
            return (
              <Card key={p.id} onClick={() => nav('projeto', p.id)} className="flex flex-col group">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10.5px] text-slate-400">{p.code}</span>
                  <StatusChip s={p.status} />
                  <Chip tone={p.priority === 'Crítica' ? 'red' : p.priority === 'Alta' ? 'orange' : 'neutral'} className="ml-auto">{p.priority}</Chip>
                </div>
                <div className="font-display font-semibold text-[14.5px] text-ink-900 dark:text-white leading-snug group-hover:text-petrol-700 dark:group-hover:text-petrol-300 transition">{p.name}</div>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 flex-1">{p.objective}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10.5px] font-mono text-slate-400 mb-1">
                    <span>{p.progress}% concluído</span>
                    {slip ? <span className="text-rose-500 font-semibold">previsão {fmtDate(p.forecastEnd)}</span> : <span>término {fmtDate(p.plannedEnd)}</span>}
                  </div>
                  <Progress value={p.progress} tone="teal" />
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
                  {mgr && <Avatar name={mgr.name} size={24} />}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">{mgr?.name} · {p.methodology}</span>
                  <span className={`font-display font-bold text-[15px] ${h >= 75 ? 'text-emerald-600' : h >= 55 ? 'text-amber-600' : 'text-rose-600'}`} title={healthLabel(h)}>{h}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, session, user, mutate, toast, nav } = useApp();
  const orgId = session!.orgId;
  const [step, setStep] = useState(0);
  const [tpl, setTpl] = useState<typeof TEMPLATES[number] | null>(null);
  const [f, setF] = useState({ name: '', objective: '', justification: '', budget: '500000', priority: 'Média', methodology: 'Híbrida', type: 'Tecnologia', confidentiality: 'Interno', objectiveIds: [] as string[] });
  const [err, setErr] = useState('');
  useEffect(() => { if (open) { setStep(0); setTpl(null); setErr(''); } }, [open]);

  const create = () => {
    if (!f.name.trim()) { setErr('Informe o nome do projeto.'); return; }
    const code = `PRJ-${new Date().getFullYear()}-${String(7 + db.projects.length).padStart(3, '0')}`;
    const id = uid();
    mutate(d => {
      const unit = d.units.find(u => u.orgId === orgId);
      d.projects.unshift({
        id, orgId, code, name: f.name, description: f.objective, objective: f.objective, justification: f.justification,
        sponsorId: session!.userId, managerId: session!.userId, teamIds: [session!.userId],
        start: todayISO(), plannedEnd: addDaysISO(180), priority: f.priority as Project['priority'], status: 'Em Análise',
        objectiveIds: f.objectiveIds, portfolioId: d.portfolios.find(p => p.orgId === orgId)?.id ?? '', budget: Number(f.budget) || 0,
        methodology: f.methodology as Methodology, type: f.type, confidentiality: f.confidentiality as Project['confidentiality'],
        unitId: unit?.id ?? '', progress: 0, tags: [tpl?.name.toLowerCase() ?? 'manual'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      if (tpl) {
        const start = new Date();
        tpl.phases.forEach((ph, i) => {
          const s = new Date(start); s.setDate(s.getDate() + i * 30);
          const e2 = new Date(start); e2.setDate(e2.getDate() + (i + 1) * 30 - 1);
          d.tasks.push({ id: uid(), orgId, projectId: id, wbsCode: `${i + 1}`, title: ph, collaboratorIds: [], plannedStart: s.toISOString().slice(0, 10), plannedEnd: e2.toISOString().slice(0, 10), priority: 'Média', status: i === 0 ? 'Planejada' : 'Não Iniciada', progress: 0, dependencies: [], estimatedH: 80, actualH: 0, tags: ['fase'], critical: i === 0 });
        });
      }
      d.events.unshift({ id: uid(), orgId, source: 'NETPROJECT', type: 'PROJECT_CREATED', payload: `${code} — ${f.name}`, receivedAt: new Date().toISOString(), processed: true });
    }, { action: 'CRIOU', entity: 'Project', after: `${code} — ${f.name}` });
    toast(`Projeto ${code} criado${tpl ? ` a partir do modelo "${tpl.name}"` : ''}. Segue para fluxo de aprovação.`, 'success');
    onClose();
    nav('projeto', id);
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" title={step === 0 ? 'Novo Projeto — escolha a origem' : `Novo Projeto — ${tpl?.name ?? 'criação manual'}`}
      footer={step === 1 ? (<><Btn variant="ghost" onClick={() => setStep(0)}>Voltar</Btn><Btn onClick={create}><Briefcase size={14} /> Criar Projeto</Btn></>) : undefined}>
      {step === 0 && (
        <div>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-3">Projetos podem nascer manualmente, de ideias aprovadas, de demandas, de iniciativas estratégicas ou de programas. Escolha um modelo para pré-preencher fases e metodologia:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => { setTpl(t); setF({ ...f, methodology: t.methodology, type: t.type }); setStep(1); }}
                className="text-left rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-3.5 hover:ring-petrol-400 hover:bg-petrol-50/50 dark:hover:bg-petrol-900/10 transition group">
                <div className="flex items-center gap-2"><LayoutTemplate size={15} className="text-petrol-500" /><b className="font-display text-[13px] text-ink-900 dark:text-white group-hover:text-petrol-700 dark:group-hover:text-petrol-300">{t.name}</b></div>
                <div className="text-[10.5px] font-mono text-slate-400 mt-1">{t.methodology} · {t.phases.length} fases</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{t.phases.join(' → ')}</div>
              </button>
            ))}
            <button onClick={() => { setTpl(null); setStep(1); }} className="text-left rounded-xl ring-1 ring-dashed ring-slate-300 dark:ring-slate-600 p-3.5 hover:ring-petrol-400 hover:bg-petrol-50/50 dark:hover:bg-petrol-900/10 transition">
              <div className="flex items-center gap-2"><Plus size={15} className="text-slate-400" /><b className="font-display text-[13px] text-ink-900 dark:text-white">Criação manual (em branco)</b></div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">Sem fases pré-definidas — defina tudo no planejamento.</div>
            </button>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          <Field label="Nome do projeto" required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex.: Modernização do Atendimento Presencial" /></Field>
          <Field label="Objetivo" required><Textarea value={f.objective} onChange={e => setF({ ...f, objective: e.target.value })} placeholder="Qual resultado o projeto deve gerar?" /></Field>
          <Field label="Justificativa"><Textarea value={f.justification} onChange={e => setF({ ...f, justification: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Orçamento previsto (R$)"><Input type="number" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></Field>
            <Field label="Prioridade"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['Baixa', 'Média', 'Alta', 'Crítica'].map(x => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Metodologia"><Select value={f.methodology} onChange={e => setF({ ...f, methodology: e.target.value })}>{['Preditiva', 'Ágil', 'Híbrida', 'Personalizada'].map(x => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Classificação"><Select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['Tecnologia', 'Obras', 'Infraestrutura', 'Administrativo', 'Políticas Públicas', 'Saúde', 'Educação', 'Mobilidade', 'Segurança', 'Modernização', 'Inovação', 'Automação', 'Compliance', 'Outros'].map(x => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <Field label="Objetivos estratégicos vinculados" hint="Todo projeto deve responder: por que existe e qual objetivo atende.">
            <div className="flex flex-wrap gap-1.5">
              {db.objectives.filter(o => o.orgId === orgId).map(o => (
                <button key={o.id} type="button" onClick={() => setF({ ...f, objectiveIds: f.objectiveIds.includes(o.id) ? f.objectiveIds.filter(x => x !== o.id) : [...f.objectiveIds, o.id] })}
                  className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ring-1 transition ${f.objectiveIds.includes(o.id) ? 'bg-petrol-600 text-white ring-transparent' : 'ring-slate-300 dark:ring-slate-600 text-slate-500 hover:ring-petrol-400'}`}>
                  {o.code} · {o.name.slice(0, 34)}
                </button>
              ))}
            </div>
          </Field>
          {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
        </div>
      )}
    </Modal>
  );
}
