import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, PageHeader, Btn, Chip, StatusChip, Modal, Field, Input, Textarea, Select, AiBadge, Thinking, PrintSheet, EmptyState, Tabs, Avatar } from '../components/ui';
import { brlCompact, fmtDate, fmtDateShort, computeHealth, healthLabel, downloadCSV, generateInsights, evm, uid, todayISO, relTime } from '../lib/engine';
import { FileBarChart2, FileText, Download, Printer, Sparkles, Plus, Check, Scale, Video, BookOpen, FolderOpen, FileSpreadsheet } from 'lucide-react';

// ============================================================
// RELATÓRIOS + Relatório Executivo por IA
// ============================================================
export function ReportsPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const org = db.organizations.find(o => o.id === orgId)!;
  const projects = db.projects.filter(p => p.orgId === orgId);
  const [execReport, setExecReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [printDoc, setPrintDoc] = useState<null | 'exec'>(null);

  const generateExec = () => {
    setGenerating(true); setReviewed(false);
    setTimeout(() => {
      const active = projects.filter(p => ['Em Execução', 'Planejamento'].includes(p.status));
      const insights = generateInsights(db, orgId).slice(0, 4);
      const pending = db.decisions.filter(x => x.orgId === orgId && x.status === 'Pendente');
      const over = db.tasks.filter(t => t.orgId === orgId && !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO());
      const consumed = db.costs.filter(c => c.orgId === orgId).reduce((s, c) => s + c.actual, 0);
      const budget = projects.reduce((s, p) => s + p.budget, 0);
      const delayed = active.filter(p => (p.forecastEnd ?? p.plannedEnd) > p.plannedEnd);
      const upcoming = db.milestones.filter(m => projects.some(p => p.id === m.projectId) && !m.actual).sort((a, b) => a.planned.localeCompare(b.planned)).slice(0, 4);
      const worst = active.map(p => ({ p, h: computeHealth(db, p.id).overall })).sort((a, b) => a.h - b.h)[0];
      const txt = [
        'RESUMO EXECUTIVO',
        `A carteira de ${org.name} reúne ${projects.length} projetos (${active.length} ativos), com orçamento aprovado de ${brlCompact(budget)} e ${brlCompact(consumed)} executados (${budget ? Math.round(consumed / budget * 100) : 0}%).`,
        '',
        'STATUS GERAL',
        `Saúde média dos projetos ativos: ${active.length ? Math.round(active.reduce((s, p) => s + computeHealth(db, p.id).overall, 0) / active.length) : 0}/100. Projeto em pior condição: ${worst ? `${worst.p.name} (${worst.h}/100, ${healthLabel(worst.h)})` : '—'}.`,
        '',
        'PRINCIPAIS PROBLEMAS',
        ...insights.filter(i => i.severity !== 'Informação').slice(0, 3).map(i => `• [${i.severity}] ${i.title}`),
        `• ${over.length} tarefas vencidas em toda a carteira.`,
        '',
        'DECISÕES NECESSÁRIAS',
        ...(pending.length ? pending.map(p2 => `• ${p2.title}`) : ['• Nenhuma decisão pendente.']),
        ...(db.changes.filter(c => c.orgId === orgId && ['Solicitada', 'Em Análise'].includes(c.status)).map(c => `• Mudança ${c.code}: ${c.title}`)),
        '',
        'PREVISÃO (NEX FORECAST)',
        ...(delayed.length ? delayed.map(p => `• ${p.name}: conclusão prevista para ${fmtDate(p.forecastEnd)} (+${Math.max(0, Math.round((new Date(p.forecastEnd!).getTime() - new Date(p.plannedEnd).getTime()) / 86400000))} dias).`) : ['• Nenhum projeto com desvio relevante de prazo.']),
        '',
        'PRÓXIMAS ENTREGAS',
        ...upcoming.map(m => `• ${m.name} — ${fmtDate(m.planned)} (${projects.find(p => p.id === m.projectId)?.code})`),
        '',
        'RECOMENDAÇÕES DA INTELIGÊNCIA',
        '1. Priorizar as decisões pendentes para destravar mudanças em análise.',
        '2. Avaliar a redistribuição de carga das pessoas em sobrecarga (ver Recursos).',
        '3. Consolidar demandas correlatas de conectividade em programa único.',
      ].join('\n');
      setExecReport(txt);
      setGenerating(false);
      mutate(d => { }, { action: 'GEROU_RELATÓRIO_EXECUTIVO_IA', entity: 'Report' });
      toast('Relatório executivo gerado — revise antes de exportar.', 'success');
    }, 1500);
  };

  const reports = [
    { name: 'Relatório Executivo', desc: 'Visão consolidada para alta administração', icon: <FileBarChart2 size={18} />, run: () => generateExec() },
    { name: 'Relatório de Portfólio', desc: 'Saúde, orçamento e priorização da carteira', icon: <FileText size={18} />, csv: () => downloadCSV('portfolio.csv', ['Projeto', 'Status', 'Prioridade', 'Orçamento', 'Progresso', 'Saúde'], projects.map(p => [p.name, p.status, p.priority, p.budget, `${p.progress}%`, computeHealth(db, p.id).overall])) },
    { name: 'Relatório de Riscos', desc: 'Registro completo com exposição P×I', icon: <FileText size={18} />, csv: () => downloadCSV('riscos.csv', ['Código', 'Risco', 'Categoria', 'Prob', 'Impacto', 'Exposição', 'Resposta', 'Status'], db.risks.filter(r => r.orgId === orgId).map(r => [r.code, r.title, r.category, r.probability, r.impact, r.probability * r.impact, r.response, r.status])) },
    { name: 'Relatório de Custos', desc: 'Planejado × realizado × EVM', icon: <FileText size={18} />, csv: () => downloadCSV('custos.csv', ['Projeto', 'Mês', 'Categoria', 'Planejado', 'Realizado', 'Empenhado'], db.costs.filter(c => c.orgId === orgId).map(c => [db.projects.find(p => p.id === c.projectId)?.code ?? '', c.month, c.category, c.planned, c.actual, c.committed])) },
    { name: 'Relatório de Demandas', desc: 'Funil completo com status e esforço', icon: <FileText size={18} />, csv: () => downloadCSV('demandas.csv', ['Código', 'Demanda', 'Prioridade', 'Esforço', 'Status', 'Origem'], db.demands.filter(x => x.orgId === orgId).map(x => [x.code, x.title, x.priority, x.effort, x.status, x.origin])) },
    { name: 'Relatório de Recursos', desc: 'Carga e alocação por pessoa', icon: <FileText size={18} />, csv: () => downloadCSV('recursos.csv', ['Pessoa', 'Alocação %', 'Tarefas ativas'], db.users.filter(u => u.orgId === orgId).map(u => [u.name, db.allocations.filter(a => a.userId === u.id).reduce((s, a) => s + a.percent, 0), db.tasks.filter(t => t.orgId === orgId && t.responsibleId === u.id && !['Concluída', 'Cancelada'].includes(t.status)).length])) },
    { name: 'Relatório de Estratégia', desc: 'Projetos por objetivo estratégico', icon: <FileText size={18} />, csv: () => downloadCSV('estrategia.csv', ['Objetivo', 'Projetos'], db.objectives.filter(o => o.orgId === orgId).map(o => [o.name, projects.filter(p => p.objectiveIds.includes(o.id)).length])) },
    { name: 'Relatório de Lições Aprendidas', desc: 'Base de conhecimento', icon: <FileText size={18} />, csv: () => downloadCSV('licoes.csv', ['Projeto', 'Categoria', 'Lição', 'Recomendação'], db.lessons.filter(l => l.orgId === orgId).map(l => [db.projects.find(p => p.id === l.projectId)?.code ?? '', l.category, l.lesson, l.recommendation])) },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <PageHeader kicker="Relatórios" title="Relatórios" subtitle="Exportações em CSV (compatível com Excel) e versão imprimível/PDF. O relatório executivo é gerado pela IA e exige revisão humana antes da exportação." />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 stagger mb-5">
        {reports.map(r => (
          <Card key={r.name} onClick={() => r.run ? r.run() : r.csv?.()} className="group">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-lg bg-steel-100 dark:bg-steel-900/40 text-steel-600 dark:text-steel-300 grid place-items-center group-hover:bg-petrol-100 group-hover:text-petrol-600 dark:group-hover:bg-petrol-900/40 transition">{r.icon}</span>
              <div className="min-w-0">
                <b className="block text-[13px] font-display text-ink-900 dark:text-white truncate">{r.name}</b>
                <span className="text-[10.5px] text-slate-400">{r.csv ? 'CSV / Excel' : 'IA + PDF'}</span>
              </div>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2">{r.desc}</p>
            <div className="flex gap-1.5 mt-3">
              <Chip tone={r.csv ? 'steel' : 'teal'}>{r.csv ? <><FileSpreadsheet size={11} /> Exportar</> : <><Sparkles size={11} /> Gerar</>}</Chip>
            </div>
          </Card>
        ))}
      </div>

      {(generating || execReport) && (
        <Card className="anim-rise">
          <SectionTitle right={<AiBadge>requer revisão humana</AiBadge>}>Relatório Executivo gerado pela IA</SectionTitle>
          {generating && <Thinking label="Sintetizando dados da carteira…" />}
          {execReport && !generating && (
            <>
              <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-ink-900 rounded-lg p-4 ring-1 ring-slate-200/70 dark:ring-white/8">{execReport}</pre>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {!reviewed ? (
                  <><Btn onClick={() => { setReviewed(true); toast('Relatório revisado e aprovado — liberado para exportação.', 'success'); }}><Check size={14} /> Revisado — aprovar para exportação</Btn>
                    <span className="text-[11px] text-slate-400">A exportação fica bloqueada até a revisão humana.</span></>
                ) : (
                  <>
                    <Btn onClick={() => { setPrintDoc('exec'); setTimeout(() => window.print(), 60); }}><Printer size={14} /> Imprimir / PDF</Btn>
                    <Btn variant="outline" onClick={() => downloadCSV('relatorio-executivo.csv', ['Linha'], execReport.split('\n').map(l => [l]))}><Download size={14} /> Baixar CSV</Btn>
                    <Chip tone="green">revisado</Chip>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      )}
      {printDoc === 'exec' && execReport && (
        <PrintSheet>
          <h1 style={{ fontFamily: 'Space Grotesk' }}>Relatório Executivo — {org.name}</h1>
          <p>Gerado pela Inteligência NEX em {fmtDate(todayISO())} · revisado e aprovado por usuário · NETPROJECT</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 10 }}>{execReport}</pre>
        </PrintSheet>
      )}
    </div>
  );
}

// ============================================================
// DOCUMENTOS
// ============================================================
export function DocumentsPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('Todas');
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ name: '', category: 'Relatório', folder: 'Geral', confidentiality: 'Interno' as const, projectId: '' });
  const docs = db.documents.filter(x => x.orgId === orgId).filter(x => fCat === 'Todas' || x.category === fCat).filter(x => !q || x.name.toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!f.name.trim()) { toast('Informe o nome do documento.', 'warn'); return; }
    mutate(d => { d.documents.unshift({ id: uid(), orgId, name: f.name, category: f.category, folder: f.folder, tags: [], version: 1, uploadedAt: new Date().toISOString(), responsibleId: session!.userId, confidentiality: f.confidentiality, sizeKb: 120 + Math.round(Math.random() * 900), projectId: f.projectId || undefined }); }, { action: 'ENVIOU_DOCUMENTO', entity: 'Document', after: f.name });
    toast('Documento versionado (v1) e registrado.', 'success');
    setShowNew(false); setF({ name: '', category: 'Relatório', folder: 'Geral', confidentiality: 'Interno', projectId: '' });
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <PageHeader kicker="Repositório" title="Documentos" subtitle="Versionamento, pastas, classificação de confidencialidade e vínculo com projetos."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Enviar Documento</Btn>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar documento…" className="!w-auto flex-1 max-w-xs" />
        <Select value={fCat} onChange={e => setFCat(e.target.value)} className="!w-auto"><option>Todas</option>{['Termo de Abertura', 'Plano do Projeto', 'Contrato', 'Ata', 'Relatório', 'Evidência', 'Projeto Técnico', 'Medição'].map(c => <option key={c}>{c}</option>)}</Select>
      </div>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
              <th className="px-4 py-2.5 font-semibold">Documento</th><th className="px-3 py-2.5 font-semibold">Categoria</th><th className="px-3 py-2.5 font-semibold">Pasta</th><th className="px-3 py-2.5 font-semibold">Versão</th><th className="px-3 py-2.5 font-semibold">Confidencialidade</th><th className="px-3 py-2.5 font-semibold">Projeto</th><th className="px-3 py-2.5 font-semibold">Enviado</th>
            </tr></thead>
            <tbody>
              {docs.map(x => (
                <tr key={x.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/[.03]">
                  <td className="px-4 py-2.5"><span className="flex items-center gap-2 font-semibold text-ink-800 dark:text-slate-200"><FileText size={14} className="text-steel-500" />{x.name}<span className="text-[9.5px] font-mono text-slate-400">{x.sizeKb} KB</span></span></td>
                  <td className="px-3 py-2.5"><Chip tone="steel">{x.category}</Chip></td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400"><FolderOpen size={12} className="inline mr-1 -mt-0.5 text-slate-300" />{x.folder}</td>
                  <td className="px-3 py-2.5 font-mono">v{x.version}</td>
                  <td className="px-3 py-2.5"><Chip tone={x.confidentiality === 'Confidencial' ? 'red' : x.confidentiality === 'Interno' ? 'amber' : 'green'}>{x.confidentiality}</Chip></td>
                  <td className="px-3 py-2.5">{x.projectId ? <button className="font-mono text-[11px] text-steel-600 hover:underline" onClick={() => nav('projeto', x.projectId)}>{db.projects.find(p => p.id === x.projectId)?.code}</button> : <span className="text-slate-300 dark:text-slate-600 text-[11px]">organizacional</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{fmtDateShort(x.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.length === 0 && <EmptyState title="Nenhum documento" />}
        </div>
      </Card>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Enviar Documento" footer={<><Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn onClick={submit}><FolderOpen size={14} /> Enviar</Btn></>}>
        <div className="space-y-3">
          <Field label="Nome do arquivo" required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="relatorio-medicao-09.pdf" /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Categoria"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Termo de Abertura', 'Plano do Projeto', 'Contrato', 'Ata', 'Relatório', 'Evidência', 'Projeto Técnico', 'Documento Administrativo', 'Medição', 'Outro'].map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Pasta"><Select value={f.folder} onChange={e => setF({ ...f, folder: e.target.value })}>{['Geral', 'Governança', 'Contratos', 'Engenharia', 'Qualidade', 'Reuniões'].map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Confidencialidade"><Select value={f.confidentiality} onChange={e => setF({ ...f, confidentiality: e.target.value as never })}><option>Público</option><option>Interno</option><option>Confidencial</option></Select></Field>
            <Field label="Projeto vinculado"><Select value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value })}><option value="">Nenhum</option>{db.projects.filter(p => p.orgId === orgId).map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</Select></Field>
          </div>
          <p className="text-[10.5px] text-slate-400">Demonstração: o registro é criado no repositório (upload binário fica a cargo do backend de armazenamento em produção).</p>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// REUNIÕES (com análise de ata pela IA)
// ============================================================
export function MeetingsPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [aiFor, setAiFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ decisions: string[]; actions: string[]; risks: string[] } | null>(null);
  const meetings = db.meetings.filter(m => m.orgId === orgId).sort((a, b) => b.date.localeCompare(a.date));

  const analyzeMinutes = (id: string) => {
    setAiFor(id); setSuggestions(null);
    setTimeout(() => {
      setSuggestions({
        decisions: ['Confirmar janela de manutenção noturna para o lote 1', 'Manter comunicação semanal às secretarias'],
        actions: ['Validar redundância de energia do datacenter (responsável: Marcos, prazo: 5 dias)', 'Revisar cronograma com novo prazo do fornecedor (Carlos, 3 dias)'],
        risks: ['Indisponibilidade durante migração parcial', 'Novo prazo do fornecedor ainda não contratualizado'],
      });
    }, 1200);
  };
  const approveSuggestions = (mId: string) => {
    const m = db.meetings.find(x => x.id === mId)!;
    mutate(d => {
      const x = d.meetings.find(y => y.id === mId);
      if (x && suggestions) {
        x.decisions = [...(x.decisions ?? []), ...suggestions.decisions];
        x.actions = [...(x.actions ?? []), ...suggestions.actions];
        suggestions.risks.forEach(r => d.risks.unshift({ id: uid(), orgId, code: `RSK-IA-${String(d.risks.length + 1).padStart(2, '0')}`, title: r, description: `Risco sugerido pela IA a partir da ata: ${m.title}`, category: 'Governança', probability: 3, impact: 3, response: 'Mitigar', status: 'Sugestão da IA', reviewAt: (() => { const t = new Date(); t.setDate(t.getDate() + 10); return t.toISOString().slice(0, 10); })(), aiSuggested: true }));
      }
    }, { action: 'APROVOU_SUGESTÕES_IA_ATA', entity: 'Meeting', entityId: mId });
    toast('Decisões e ações registradas; riscos enviados como sugestões para confirmação.', 'success');
    setAiFor(null); setSuggestions(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Gestão de reuniões" title="Reuniões" subtitle="Atas, decisões e ações. A IA pode analisar a ata e sugerir decisões, tarefas e riscos — nada é registrado sem sua aprovação." />
      <div className="space-y-3 stagger">
        {meetings.map(m => {
          const p = db.projects.find(x => x.id === m.projectId);
          return (
            <Card key={m.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Video size={16} className="text-steel-500" />
                <b className="text-[13.5px] font-display text-ink-900 dark:text-slate-100 flex-1">{m.title}</b>
                <StatusChip s={m.status} />
                <span className="text-[11px] font-mono text-slate-400">{fmtDate(m.date)} · {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex -space-x-2 mt-2.5">{m.participantIds.map(pid => { const u = db.users.find(x => x.id === pid); return u ? <Avatar key={pid} name={u.name} size={26} /> : null; })}</div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2"><b className="text-slate-600 dark:text-slate-300">Pauta:</b> {m.agenda}</p>
              {m.minutes && <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-50 dark:bg-white/5 rounded-lg p-3">{m.minutes}</p>}
              {(m.decisions?.length || m.actions?.length) ? (
                <div className="grid md:grid-cols-2 gap-2 mt-2.5 text-[11.5px]">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/15 p-2.5"><b className="block text-[9.5px] uppercase text-emerald-700 dark:text-emerald-400 mb-1">Decisões</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{m.decisions?.map(x => <li key={x}>{x}</li>)}</ul></div>
                  <div className="rounded-lg bg-steel-50 dark:bg-steel-900/20 p-2.5"><b className="block text-[9.5px] uppercase text-steel-700 dark:text-steel-300 mb-1">Ações</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{m.actions?.map(x => <li key={x}>{x}</li>)}</ul></div>
                </div>
              ) : null}
              {m.status === 'Realizada' && m.minutes && (
                <div className="mt-3 flex gap-2 items-center">
                  {aiFor !== m.id && <Btn size="sm" variant="outline" onClick={() => analyzeMinutes(m.id)}><Sparkles size={13} /> Analisar ata com IA</Btn>}
                  {aiFor === m.id && !suggestions && <Thinking label="Extraindo decisões, ações e riscos da ata…" />}
                </div>
              )}
              {aiFor === m.id && suggestions && (
                <div className="mt-3 rounded-xl bg-ink-900 grid-tex p-4 anim-rise">
                  <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-petrol-300" /><b className="text-white text-[12.5px] font-display">Sugestões da Inteligência (requer aprovação)</b></div>
                  <div className="grid md:grid-cols-3 gap-2 text-[11.5px] text-slate-300">
                    <div className="rounded-lg bg-white/6 p-2.5"><b className="block text-petrol-300 text-[9.5px] uppercase mb-1">Decisões sugeridas</b><ul className="list-disc pl-4 space-y-0.5">{suggestions.decisions.map(x => <li key={x}>{x}</li>)}</ul></div>
                    <div className="rounded-lg bg-white/6 p-2.5"><b className="block text-petrol-300 text-[9.5px] uppercase mb-1">Ações sugeridas</b><ul className="list-disc pl-4 space-y-0.5">{suggestions.actions.map(x => <li key={x}>{x}</li>)}</ul></div>
                    <div className="rounded-lg bg-white/6 p-2.5"><b className="block text-petrol-300 text-[9.5px] uppercase mb-1">Riscos sugeridos</b><ul className="list-disc pl-4 space-y-0.5">{suggestions.risks.map(x => <li key={x}>{x}</li>)}</ul></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Btn size="sm" onClick={() => approveSuggestions(m.id)}><Check size={13} /> Aprovar e registrar</Btn>
                    <Btn size="sm" variant="ghost" className="!text-slate-400 hover:!bg-white/10" onClick={() => { setAiFor(null); setSuggestions(null); }}>Descartar</Btn>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// LIÇÕES APRENDIDAS
// ============================================================
export function LessonsPage() {
  const { db, session, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ situation: '', happened: '', lesson: '', recommendation: '', category: 'Qualidade', projectId: '' });
  const lessons = db.lessons.filter(l => l.orgId === orgId);
  const submit = () => {
    if (!f.lesson.trim()) { toast('Descreva a lição aprendida.', 'warn'); return; }
    mutate(d => { d.lessons.unshift({ id: uid(), orgId, projectId: f.projectId || db.projects.find(p => p.orgId === orgId)?.id || '', situation: f.situation, happened: f.happened, cause: '—', lesson: f.lesson, recommendation: f.recommendation, category: f.category, createdAt: new Date().toISOString() }); }, { action: 'REGISTROU_LIÇÃO', entity: 'Lesson', after: f.lesson.slice(0, 60) });
    toast('Lição registrada na base de conhecimento.', 'success');
    setShowNew(false);
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Base de conhecimento" title="Lições Aprendidas" subtitle="Situação, causa, lição e recomendação — capital intelectual reutilizável entre projetos."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Registrar Lição</Btn>} />
      <div className="grid md:grid-cols-2 gap-3 stagger">
        {lessons.map(l => {
          const p = db.projects.find(x => x.id === l.projectId);
          return (
            <Card key={l.id}>
              <div className="flex items-center gap-2"><BookOpen size={15} className="text-petrol-500" /><Chip tone="teal">{l.category}</Chip><span className="ml-auto font-mono text-[10px] text-slate-400">{p?.code}</span></div>
              <b className="block text-[13.5px] text-ink-900 dark:text-slate-100 mt-2">{l.lesson}</b>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1"><b>Situação:</b> {l.situation || l.happened}</p>
              {l.cause !== '—' && <p className="text-[11.5px] text-slate-500 dark:text-slate-400"><b>Causa:</b> {l.cause}</p>}
              <div className="rounded-lg bg-petrol-50 dark:bg-petrol-900/15 p-2.5 mt-2.5 text-[11.5px] text-petrol-800 dark:text-petrol-200"><b>Recomendação:</b> {l.recommendation}</div>
            </Card>
          );
        })}
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Registrar Lição Aprendida" footer={<><Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn onClick={submit}>Registrar</Btn></>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Situação"><Input value={f.situation} onChange={e => setF({ ...f, situation: e.target.value })} /></Field>
            <Field label="Categoria"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['Qualidade', 'Aquisições', 'Engenharia', 'Comunicação', 'Riscos', 'Escopo'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Field label="O que aconteceu"><Textarea value={f.happened} onChange={e => setF({ ...f, happened: e.target.value })} /></Field>
          <Field label="Lição" required><Textarea value={f.lesson} onChange={e => setF({ ...f, lesson: e.target.value })} /></Field>
          <Field label="Recomendação"><Textarea value={f.recommendation} onChange={e => setF({ ...f, recommendation: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// REGISTRO DE DECISÕES
// ============================================================
export function DecisionsPage() {
  const { db, session, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const decisions = db.decisions.filter(x => x.orgId === orgId);
  const decide = (id: string, approve: boolean) => {
    mutate(d => {
      const x = d.decisions.find(y => y.id === id);
      if (x) { x.status = approve ? 'Aprovada' : 'Registrada'; if (!x.selected) x.selected = approve ? x.alternatives[0] ?? 'Opção recomendada' : '—'; if (!x.reason) x.reason = approve ? 'Aprovada em fluxo executivo.' : 'Não aprovada.'; }
    }, { action: approve ? 'APROVOU_DECISÃO' : 'REJEITOU_DECISÃO', entity: 'Decision', entityId: id });
    toast(approve ? 'Decisão aprovada e registrada.' : 'Decisão encerrada sem aprovação.', approve ? 'success' : 'info');
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Governança decisória" title="Registro de Decisões" subtitle="Contexto, alternativas, opção escolhida e impacto — rastreabilidade completa de quem decidiu o quê." />
      <div className="space-y-3 stagger">
        {decisions.map(x => {
          const p = db.projects.find(pr => pr.id === x.projectId);
          const maker = db.users.find(u => u.id === x.decisionMakerId);
          return (
            <Card key={x.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Scale size={16} className="text-steel-500" />
                <b className="text-[13.5px] font-display text-ink-900 dark:text-slate-100 flex-1">{x.title}</b>
                {p && <span className="font-mono text-[10.5px] text-slate-400">{p.code}</span>}
                <StatusChip s={x.status} />
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5">{x.context}</p>
              <div className="grid md:grid-cols-3 gap-2 mt-2.5 text-[11.5px]">
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><b className="block text-[9.5px] uppercase text-slate-400 mb-1">Alternativas</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{x.alternatives.map(a => <li key={a} className={a === x.selected ? 'font-bold text-petrol-700 dark:text-petrol-300' : ''}>{a}{a === x.selected ? ' ✓' : ''}</li>)}</ul></div>
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><b className="block text-[9.5px] uppercase text-slate-400 mb-1">Decisor</b><span className="text-slate-600 dark:text-slate-300">{maker?.name}</span><b className="block text-[9.5px] uppercase text-slate-400 mt-2 mb-1">Data</b><span className="font-mono">{fmtDate(x.date)}</span></div>
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><b className="block text-[9.5px] uppercase text-slate-400 mb-1">Impacto</b><span className="text-slate-600 dark:text-slate-300">{x.impact || '—'}</span></div>
              </div>
              {x.status === 'Pendente' && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10.5px] font-mono text-slate-400 mr-auto">Aguardando decisão executiva</span>
                  <Btn size="sm" variant="outline" onClick={() => decide(x.id, false)}>Não aprovar</Btn>
                  <Btn size="sm" onClick={() => decide(x.id, true)}><Check size={13} /> Aprovar decisão</Btn>
                </div>
              )}
              {x.reason && x.status !== 'Pendente' && <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2"><b>Motivo:</b> {x.reason}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
