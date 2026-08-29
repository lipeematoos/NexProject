import React, { useState } from 'react';
import { useApp } from '../lib/store';
import type { Risk } from '../lib/types';
import { Card, PageHeader, Btn, Chip, StatusChip, Modal, Field, Input, Textarea, Select, EmptyState, AiBadge } from '../components/ui';
import { RiskMatrix } from '../components/charts';
import { fmtDate, fmtDateShort, brlCompact, todayISO, uid } from '../lib/engine';
import { Plus, AlertTriangle, Sparkles, Check, X } from 'lucide-react';

// ============================================================
// RISCOS
// ============================================================
export function RisksPage() {
  const { db, session, nav, mutate, toast, route } = useApp();
  const orgId = session!.orgId;
  const [showNew, setShowNew] = useState(route.tab === 'novo');
  const [fCategory, setFCategory] = useState('Todos');
  const risks = db.risks.filter(r => r.orgId === orgId).filter(r => fCategory === 'Todos' || r.category === fCategory);
  const aiSuggestions = risks.filter(r => r.aiSuggested && r.status === 'Sugestão da IA');
  const projName = (id?: string) => db.projects.find(p => p.id === id)?.code;

  const confirmAi = (r: Risk) => {
    mutate(d => { const x = d.risks.find(y => y.id === r.id); if (x) { x.status = 'Identificado'; x.aiSuggested = false; } }, { action: 'CONFIRMOU_RISCO_IA', entity: 'Risk', entityId: r.id, before: 'Sugestão da IA', after: 'Identificado' });
    toast('Risco confirmado e incluído no registro oficial.', 'success');
  };
  const dismissAi = (r: Risk) => {
    mutate(d => { d.risks = d.risks.filter(y => y.id !== r.id); }, { action: 'DESCARTOU_RISCO_IA', entity: 'Risk', entityId: r.id });
    toast('Sugestão descartada (registrado em auditoria).', 'info');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Gestão de riscos" title="Registro de Riscos" subtitle="Matriz probabilidade × impacto, planos de resposta e riscos detectados pela Inteligência — sempre com confirmação humana."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Registrar Risco</Btn>} />

      {aiSuggestions.length > 0 && (
        <div className="mb-4 rounded-xl ring-1 ring-petrol-500/30 bg-petrol-50 dark:bg-petrol-900/15 p-4 anim-rise">
          <div className="flex items-center gap-2 mb-2"><Sparkles size={15} className="text-petrol-600" /><b className="font-display text-[13.5px] text-petrol-800 dark:text-petrol-200">Riscos Detectados pela Inteligência</b><AiBadge>sugestões</AiBadge></div>
          <p className="text-[11.5px] text-petrol-700/80 dark:text-petrol-300/80 mb-2.5">A IA identificou padrões de risco nos dados. Sugestões permanecem fora do registro oficial até que uma pessoa confirme.</p>
          <div className="grid md:grid-cols-2 gap-2">
            {aiSuggestions.map(r => (
              <div key={r.id} className="rounded-lg bg-card dark:bg-ink-800 ring-1 ring-slate-200 dark:ring-white/10 p-3">
                <div className="flex items-center gap-2"><b className="text-[12.5px] text-ink-900 dark:text-slate-100 flex-1">{r.title}</b><Chip tone="red">{r.probability * r.impact}/25</Chip></div>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1">{r.description}</p>
                <div className="flex gap-2 mt-2.5">
                  <Btn size="sm" onClick={() => confirmAi(r)}><Check size={13} /> Confirmar risco</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => dismissAi(r)}><X size={13} /> Descartar</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <Card>
          <div className="text-[13px] font-display font-semibold text-ink-900 dark:text-white mb-3">Matriz 5×5</div>
          <RiskMatrix risks={risks.filter(r => r.status !== 'Encerrado').map(r => ({ id: r.id, p: r.probability, i: r.impact, title: r.title }))} />
          <div className="mt-3 space-y-1">
            <Select value={fCategory} onChange={e => setFCategory(e.target.value)}>{['Todos', ...new Set(db.risks.filter(r => r.orgId === orgId).map(r => r.category))].map(c => <option key={c}>{c}</option>)}</Select>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[['Críticos', risks.filter(r => r.probability * r.impact >= 15 && r.status !== 'Encerrado').length, 'text-rose-600'], ['Moderados', risks.filter(r => r.probability * r.impact >= 8 && r.probability * r.impact < 15 && r.status !== 'Encerrado').length, 'text-amber-600'], ['Baixos', risks.filter(r => r.probability * r.impact < 8 && r.status !== 'Encerrado').length, 'text-emerald-600']].map(([l, v, c]) => (
                <div key={l as string} className="rounded-lg bg-slate-50 dark:bg-white/5 py-2"><div className={`font-display font-bold text-lg ${c}`}>{v}</div><div className="text-[9.5px] uppercase font-mono text-slate-400">{l}</div></div>
              ))}
            </div>
          </div>
        </Card>
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2.5 font-semibold">Risco</th><th className="px-3 py-2.5 font-semibold">Categoria</th><th className="px-3 py-2.5 font-semibold">P×I</th><th className="px-3 py-2.5 font-semibold">Resposta</th><th className="px-3 py-2.5 font-semibold">Projeto</th><th className="px-3 py-2.5 font-semibold">Revisão</th><th className="px-3 py-2.5 font-semibold">Status</th>
              </tr></thead>
              <tbody>
                {risks.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/[.03]">
                    <td className="px-4 py-2.5 max-w-[300px]">
                      <div className="font-semibold text-ink-800 dark:text-slate-200 flex items-center gap-1.5">{r.title}{r.aiSuggested && <AiBadge>IA</AiBadge>}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">{r.mitigation ?? r.description}</div>
                    </td>
                    <td className="px-3 py-2.5"><Chip tone="steel">{r.category}</Chip></td>
                    <td className="px-3 py-2.5"><span className={`font-display font-bold ${r.probability * r.impact >= 15 ? 'text-rose-600' : r.probability * r.impact >= 8 ? 'text-amber-600' : 'text-emerald-600'}`}>{r.probability * r.impact}</span><span className="text-[9px] text-slate-400 font-mono"> ({r.probability}×{r.impact})</span></td>
                    <td className="px-3 py-2.5"><Chip tone={r.response === 'Evitar' ? 'red' : r.response === 'Mitigar' ? 'teal' : r.response === 'Transferir' ? 'steel' : 'neutral'}>{r.response}</Chip></td>
                    <td className="px-3 py-2.5">{r.projectId ? <button className="font-mono text-[11px] text-steel-600 hover:underline" onClick={() => nav('projeto', r.projectId, 'riscos')}>{projName(r.projectId)}</button> : <span className="text-[10.5px] text-slate-400">portfólio</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{fmtDateShort(r.reviewAt)}</td>
                    <td className="px-3 py-2.5"><StatusChip s={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {risks.length === 0 && <EmptyState title="Nenhum risco neste filtro" />}
          </div>
        </Card>
      </div>
      <NewRiskModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
function NewRiskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, session, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [f, setF] = useState({ title: '', description: '', category: 'Técnico', projectId: '', probability: '3', impact: '3', response: 'Mitigar' as Risk['response'], mitigation: '' });
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.title.trim()) { setErr('Descreva o risco.'); return; }
    const code = `RSK-${String(7 + db.risks.length).padStart(3, '0')}`;
    mutate(d => {
      d.risks.unshift({ id: uid(), orgId, code, title: f.title, description: f.description || f.title, category: f.category, probability: Number(f.probability) as Risk['probability'], impact: Number(f.impact) as Risk['impact'], projectId: f.projectId || undefined, response: f.response, mitigation: f.mitigation, status: 'Identificado', reviewAt: (() => { const t = new Date(); t.setDate(t.getDate() + 14); return t.toISOString().slice(0, 10); })() });
    }, { action: 'CRIOU', entity: 'Risk', after: `${code} — ${f.title}` });
    toast(`Risco ${code} registrado (exposição ${Number(f.probability) * Number(f.impact)}/25).`, 'success');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Registrar Risco" footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={submit}><AlertTriangle size={14} /> Registrar</Btn></>}>
      <div className="space-y-3">
        <Field label="Descrição do risco" required><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ex.: Atraso na entrega do fornecedor principal" /></Field>
        <Field label="Detalhamento / gatilho"><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Categoria"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Técnico', 'Fornecedor', 'Recursos', 'Externo', 'Aquisições', 'Ambiental', 'Portfólio', 'Integração'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Probabilidade (1–5)"><Select value={f.probability} onChange={e => setF({ ...f, probability: e.target.value })}>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</Select></Field>
          <Field label="Impacto (1–5)"><Select value={f.impact} onChange={e => setF({ ...f, impact: e.target.value })}>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</Select></Field>
          <Field label="Estratégia de resposta"><Select value={f.response} onChange={e => setF({ ...f, response: e.target.value as Risk['response'] })}>{['Evitar', 'Mitigar', 'Transferir', 'Aceitar'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Projeto vinculado"><Select value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value })}><option value="">Nível de portfólio</option>{db.projects.filter(p => p.orgId === orgId).map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</Select></Field>
        </div>
        <Field label="Plano de mitigação"><Textarea value={f.mitigation} onChange={e => setF({ ...f, mitigation: e.target.value })} /></Field>
        {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
      </div>
    </Modal>
  );
}

// ============================================================
// PROBLEMAS
// ============================================================
export function IssuesPage() {
  const { db, session, mutate, toast, nav } = useApp();
  const orgId = session!.orgId;
  const [showNew, setShowNew] = useState(false);
  const issues = db.issues.filter(i => i.orgId === orgId);
  const [f, setF] = useState({ title: '', projectId: '', severity: 'Alta' as const, impact: '', deadline: '' });
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.title.trim() || !f.projectId) { setErr('Título e projeto são obrigatórios.'); return; }
    mutate(d => { d.issues.unshift({ id: uid(), orgId, projectId: f.projectId, title: f.title, impact: f.impact || 'A avaliar', severity: f.severity, deadline: f.deadline || undefined, status: 'Aberto', createdAt: new Date().toISOString() }); }, { action: 'CRIOU', entity: 'Issue', after: f.title });
    toast('Problema registrado.', 'success');
    setShowNew(false); setF({ title: '', projectId: '', severity: 'Alta', impact: '', deadline: '' });
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Gestão de problemas" title="Problemas" subtitle="Eventos materializados que exigem ação corretiva — com causa raiz e responsável."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Registrar Problema</Btn>} />
      <div className="space-y-2 stagger">
        {issues.map(i => {
          const p = db.projects.find(x => x.id === i.projectId);
          return (
            <Card key={i.id} className="!p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : 'neutral'}>{i.severity}</Chip>
                <span className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 flex-1">{i.title}</span>
                <StatusChip s={i.status} />
              </div>
              <div className="grid md:grid-cols-3 gap-2 mt-2.5 text-[11.5px]">
                <div><span className="text-slate-400">Impacto:</span> <b className="text-slate-600 dark:text-slate-300">{i.impact}</b></div>
                <div><span className="text-slate-400">Causa raiz:</span> <b className="text-slate-600 dark:text-slate-300">{i.rootCause ?? 'em análise'}</b></div>
                <div><span className="text-slate-400">Prazo:</span> <b className="text-slate-600 dark:text-slate-300">{i.deadline ? fmtDate(i.deadline) : '—'}</b> · <button className="text-steel-600 hover:underline font-mono text-[10.5px]" onClick={() => nav('projeto', i.projectId)}>{p?.code}</button></div>
              </div>
              {i.correctiveAction && <div className="mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">Ação corretiva: <b>{i.correctiveAction}</b></div>}
              {i.status !== 'Resolvido' && i.status !== 'Encerrado' && (
                <div className="mt-2.5 flex gap-2">
                  {i.status === 'Aberto' && <Btn size="sm" variant="outline" onClick={() => { mutate(d => { const x = d.issues.find(y => y.id === i.id); if (x) x.status = 'Em Tratamento'; }, { action: 'ATUALIZOU_STATUS', entity: 'Issue', entityId: i.id, after: 'Em Tratamento' }); toast('Problema em tratamento.', 'info'); }}>Iniciar tratamento</Btn>}
                  <Btn size="sm" onClick={() => { mutate(d => { const x = d.issues.find(y => y.id === i.id); if (x) x.status = 'Resolvido'; }, { action: 'RESOLVEU', entity: 'Issue', entityId: i.id }); toast('Problema resolvido.', 'success'); }}>Marcar como resolvido</Btn>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Registrar Problema" footer={<><Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn onClick={submit}>Registrar</Btn></>}>
        <div className="space-y-3">
          <Field label="Problema" required><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Projeto" required><Select value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value })}><option value="">selecione…</option>{db.projects.filter(p => p.orgId === orgId).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name.slice(0, 26)}</option>)}</Select></Field>
            <Field label="Severidade"><Select value={f.severity} onChange={e => setF({ ...f, severity: e.target.value as never })}>{['Baixa', 'Média', 'Alta', 'Crítica'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Field label="Impacto"><Input value={f.impact} onChange={e => setF({ ...f, impact: e.target.value })} /></Field>
          <Field label="Prazo de resolução"><Input type="date" value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></Field>
          {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// MUDANÇAS
// ============================================================
export function ChangesPage() {
  const { db, session, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const changes = db.changes.filter(c => c.orgId === orgId);
  const decide = (id: string, status: 'Aprovada' | 'Rejeitada') => {
    mutate(d => {
      const c = d.changes.find(x => x.id === id);
      if (!c) return;
      c.status = status; c.decidedAt = todayISO();
      if (status === 'Aprovada') {
        const pj = d.projects.find(y => y.id === c.projectId);
        if (pj) {
          if (c.scheduleImpactDays) { const t = new Date(pj.forecastEnd ?? pj.plannedEnd); t.setDate(t.getDate() + c.scheduleImpactDays); pj.forecastEnd = t.toISOString().slice(0, 10); }
          if (c.costImpact) pj.budget += c.costImpact;
        }
      }
    }, { action: status === 'Aprovada' ? 'APROVOU_MUDANÇA' : 'REJEITOU_MUDANÇA', entity: 'ChangeRequest', entityId: id });
    toast(status === 'Aprovada' ? 'Mudança aprovada — baselines atualizadas.' : 'Mudança rejeitada.', status === 'Aprovada' ? 'success' : 'warn');
  };
  const implement = (id: string) => {
    mutate(d => { const c = d.changes.find(x => x.id === id); if (c) c.status = 'Implementada'; }, { action: 'IMPLEMENTOU_MUDANÇA', entity: 'ChangeRequest', entityId: id });
    toast('Mudança implementada.', 'success');
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Controle integrado de mudanças" title="Mudanças" subtitle="Fluxo: Solicitada → Análise do PM → Aprovação do Sponsor → Implementação. Nenhuma mudança altera linha de base sem aprovação registrada." />
      <div className="space-y-2 stagger">
        {changes.length === 0 && <Card><EmptyState title="Nenhuma mudança registrada" /></Card>}
        {changes.map(c => {
          const p = db.projects.find(x => x.id === c.projectId);
          return (
            <Card key={c.id} className="!p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] text-slate-400">{c.code}</span>
                <span className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 flex-1">{c.title}</span>
                <StatusChip s={c.status} />
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{c.reason}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2.5 text-[11px]">
                <div className="rounded-md bg-slate-50 dark:bg-white/5 px-2 py-1.5"><span className="block text-[9px] uppercase font-mono text-slate-400">Escopo</span><b>{c.scopeImpact}</b></div>
                <div className="rounded-md bg-slate-50 dark:bg-white/5 px-2 py-1.5"><span className="block text-[9px] uppercase font-mono text-slate-400">Custo</span><b className={c.costImpact > 0 ? 'text-rose-600' : c.costImpact < 0 ? 'text-emerald-600' : ''}>{c.costImpact >= 0 ? '+' : ''}{brlCompact(c.costImpact)}</b></div>
                <div className="rounded-md bg-slate-50 dark:bg-white/5 px-2 py-1.5"><span className="block text-[9px] uppercase font-mono text-slate-400">Prazo</span><b className={c.scheduleImpactDays > 0 ? 'text-rose-600' : ''}>{c.scheduleImpactDays >= 0 ? '+' : ''}{c.scheduleImpactDays}d</b></div>
                <div className="rounded-md bg-slate-50 dark:bg-white/5 px-2 py-1.5"><span className="block text-[9px] uppercase font-mono text-slate-400">Risco</span><b>{c.riskImpact.slice(0, 26)}</b></div>
                <div className="rounded-md bg-slate-50 dark:bg-white/5 px-2 py-1.5"><span className="block text-[9px] uppercase font-mono text-slate-400">Projeto</span><b className="font-mono text-[10.5px]">{p?.code}</b></div>
              </div>
              {['Solicitada', 'Em Análise'].includes(c.status) && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10.5px] font-mono text-slate-400 mr-auto">Aprovação humana obrigatória (sponsor/PMO)</span>
                  <Btn size="sm" variant="outline" onClick={() => decide(c.id, 'Rejeitada')}>Rejeitar</Btn>
                  <Btn size="sm" onClick={() => decide(c.id, 'Aprovada')}>Aprovar</Btn>
                </div>
              )}
              {c.status === 'Aprovada' && <div className="mt-3"><Btn size="sm" variant="outline" onClick={() => implement(c.id)}>Marcar como implementada</Btn></div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
