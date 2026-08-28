import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, PageHeader, Btn, Chip, AiBadge, Tabs, Thinking, Modal, Progress, EmptyState } from '../components/ui';
import { generateInsights, forecastProject, advisorAsk, fmtDate, relTime, uid, daysUntil, todayISO } from '../lib/engine';
import type { AiForecast } from '../lib/types';
import { Sparkles, Send, RefreshCw, Info, Check, X, MessageSquare, TrendingUp, BrainCircuit } from 'lucide-react';

interface ChatMsg { role: 'user' | 'ai'; text: string; sources?: string[]; suggestions?: string[]; }

export function IntelligencePage() {
  const { db, session, nav, route, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [tab, setTab] = useState(route.tab === 'advisor' ? 'advisor' : route.tab === 'recomendacoes' ? 'recomendacoes' : 'analises');
  const [insights, setInsights] = useState<ReturnType<typeof generateInsights> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fcMap, setFcMap] = useState<Record<string, AiForecast> | null>(null);
  const [fcLoading, setFcLoading] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([{ role: 'ai', text: 'Olá! Sou o NEX Advisor. Respondo com base nos dados da sua organização e sempre cito as fontes internas usadas. Experimente uma das perguntas abaixo.', suggestions: ['Quais projetos precisam da minha atenção hoje?', 'Por que o projeto PRJ-2025-001 está atrasado?', 'Qual é o maior risco do portfólio?', 'Quais equipes estão sobrecarregadas?', 'Quais decisões precisam ser tomadas esta semana?'] }]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, asking]);
  useEffect(() => { if (route.tab) setTab(route.tab === 'advisor' ? 'advisor' : route.tab === 'recomendacoes' ? 'recomendacoes' : 'analises'); }, [route.tab]);

  const projects = db.projects.filter(p => p.orgId === orgId && ['Em Execução', 'Planejamento', 'Aprovado'].includes(p.status));
  const runPortfolioAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const list = generateInsights(db, orgId).map(i => ({ ...i, orgId }));
      setInsights(list);
      mutate(d => {
        d.insights = [...list.map(i => ({ ...i, createdAt: new Date().toISOString() })), ...d.insights].slice(0, 120);
      }, { action: 'EXECUTOU_ANÁLISE_IA', entity: 'AiInsight', after: `${list.length} análises no portfólio` });
      setAnalyzing(false);
      toast(`Análise concluída: ${list.length} insights gerados.`, 'success');
    }, 1600);
  };
  const runForecasts = () => {
    setFcLoading(true);
    setTimeout(() => {
      const map: Record<string, AiForecast> = {};
      projects.forEach(p => { map[p.id] = forecastProject(db, p.id); });
      setFcMap(map);
      mutate(d => { d.forecasts = [...Object.values(map), ...d.forecasts.filter(f => !map[f.projectId])].slice(0, 60); }, { action: 'EXECUTOU_PREVISÕES_IA', entity: 'AiForecast', after: `${Object.keys(map).length} previsões` });
      setFcLoading(false);
      toast('Previsões atualizadas para todos os projetos ativos.', 'success');
    }, 1300);
  };
  const ask = (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setChat(c => [...c, { role: 'user', text }]);
    setQuestion('');
    setAsking(true);
    setTimeout(() => {
      const a = advisorAsk(db, orgId, text);
      setChat(c => [...c, { role: 'ai', text: a.answer, sources: a.sources, suggestions: a.suggestions }]);
      setAsking(false);
      mutate(d => { }, { action: 'CONSULTOU_ADVISOR', entity: 'AiAdvisor', after: text.slice(0, 80) });
    }, 900 + Math.random() * 500);
  };

  const recs = db.recommendations.filter(r => r.orgId === orgId && r.status === 'Pendente');
  const applied = db.recommendations.filter(r => r.orgId === orgId && r.status !== 'Pendente');
  const applyRec = (id: string) => {
    const rec = db.recommendations.find(r => r.id === id);
    if (!rec) return;
    mutate(d => {
      const r = d.recommendations.find(x => x.id === id);
      if (r) r.status = 'Aplicada';
      if (rec.action.type === 'reassign' && rec.action.taskId && rec.action.userId) {
        const t = d.tasks.find(x => x.id === rec.action.taskId);
        if (t) t.responsibleId = rec.action.userId;
      }
      if (rec.action.type === 'consolidate' && rec.action.demandIds) {
        rec.action.demandIds.forEach(did => { const dem = d.demands.find(x => x.id === did); if (dem) dem.status = 'Priorizada'; });
        d.insights.unshift({ id: uid(), orgId, kind: 'Portfólio', severity: 'Informação', title: 'Demandas de conectividade consolidadas no programa Cidade Digital', detail: 'Ação aprovada por usuário a partir de recomendação da IA.', dataUsed: `${rec.action.demandIds.length} demandas`, confidence: 100, createdAt: new Date().toISOString() });
      }
    }, { action: 'APLICOU_RECOMENDAÇÃO_IA', entity: 'AiRecommendation', entityId: id, after: rec.title });
    toast('Recomendação aplicada com sua aprovação.', 'success');
  };
  const ignoreRec = (id: string) => {
    mutate(d => { const r = d.recommendations.find(x => x.id === id); if (r) r.status = 'Ignorada'; }, { action: 'IGNOROU_RECOMENDAÇÃO_IA', entity: 'AiRecommendation', entityId: id });
    toast('Recomendação ignorada.', 'info');
  };

  const allInsights = insights ?? db.insights.filter(i => i.orgId === orgId);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="NEX Intelligence" title="Inteligência" subtitle="A IA detecta, explica e recomenda — nunca altera dados críticos sem aprovação humana. Toda análise mostra dados usados, confiança e limitações."
        actions={<AiBadge>Detectar → Explicar → Recomendar</AiBadge>} />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'analises', label: 'Análises', badge: allInsights.length },
        { key: 'forecast', label: 'NEX Forecast' },
        { key: 'advisor', label: 'NEX Advisor' },
        { key: 'recomendacoes', label: 'Recomendações', badge: recs.length },
      ]} />

      {tab === 'analises' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Btn onClick={runPortfolioAnalysis} disabled={analyzing}><RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} /> {analyzing ? 'Analisando portfólio…' : 'Executar análise do portfólio'}</Btn>
            <span className="text-[11.5px] text-slate-400">15 funções de detecção: cronograma, tarefas críticas, sobrecarga, custos, escopo, dependências, demandas duplicadas, aprovações atrasadas…</span>
          </div>
          {analyzing && <Card><Thinking label="Cruzando projetos, tarefas, custos, riscos e capacidade…" /></Card>}
          {!analyzing && (
            <div className="grid md:grid-cols-2 gap-3 stagger">
              {allInsights.map(i => (
                <Card key={i.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : i.severity === 'Atenção' ? 'amber' : 'steel'}>{i.severity}</Chip>
                    <span className="text-[10px] font-mono uppercase text-slate-400">{i.kind}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{relTime(i.createdAt)}</span>
                  </div>
                  <button className="block text-left mt-1.5" onClick={() => i.projectId ? nav('projeto', i.projectId, 'ia') : undefined}>
                    <span className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 hover:text-petrol-700 dark:hover:text-petrol-300">{i.title}</span>
                  </button>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{i.detail}</p>
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/6 text-[10.5px] font-mono text-slate-400 space-y-0.5">
                    <div>Dados usados: {i.dataUsed}</div>
                    <div className="flex items-center gap-2">Confiança: <Progress value={i.confidence} tone="teal" h={4} className="flex-1 max-w-[120px]" /> {i.confidence}%</div>
                  </div>
                </Card>
              ))}
              {allInsights.length === 0 && <Card className="md:col-span-2"><EmptyState title="Nenhuma análise ainda" hint="Execute a análise do portfólio para gerar insights." /></Card>}
            </div>
          )}
        </div>
      )}

      {tab === 'forecast' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Btn onClick={runForecasts} disabled={fcLoading}><RefreshCw size={14} className={fcLoading ? 'animate-spin' : ''} /> {fcLoading ? 'Calculando previsões…' : 'Atualizar previsões'}</Btn>
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><Info size={12} /> Previsão baseada nos dados disponíveis — não representa garantia de resultado.</span>
          </div>
          {fcLoading && <Card><Thinking label="NEX Forecast estimando conclusões, probabilidades e gargalos…" /></Card>}
          {!fcLoading && (
            <div className="grid md:grid-cols-2 gap-3 stagger">
              {projects.map(p => {
                const fc = fcMap?.[p.id] ?? db.forecasts.find(f => f.projectId === p.id) ?? forecastProject(db, p.id);
                return (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button onClick={() => nav('projeto', p.id, 'ia')} className="text-[13.5px] font-semibold text-ink-900 dark:text-slate-100 hover:text-petrol-700 dark:hover:text-petrol-300">{p.name}</button>
                        <div className="text-[10.5px] font-mono text-slate-400">{p.code} · concl. planejada {fmtDate(p.plannedEnd)}</div>
                      </div>
                      <Chip tone={fc.delayDays > 14 ? 'red' : fc.delayDays > 0 ? 'amber' : 'green'}>{fc.delayDays > 0 ? `+${fc.delayDays} dias` : 'no prazo'}</Chip>
                    </div>
                    {fc.insufficient ? (
                      <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300/50 p-3 text-[12px] text-amber-800 dark:text-amber-200 flex gap-2"><Info size={14} className="shrink-0" /> {fc.note}</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><div className="text-[9px] font-mono uppercase text-slate-400">Conclusão prevista</div><b className="font-display text-[13.5px] text-ink-900 dark:text-white">{fmtDate(fc.forecastEnd)}</b></div>
                          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><div className="text-[9px] font-mono uppercase text-slate-400">Prob. atraso</div><b className={`font-display text-[13.5px] ${fc.delayProbability > 60 ? 'text-rose-600' : fc.delayProbability > 35 ? 'text-amber-600' : 'text-emerald-600'}`}>{fc.delayProbability}%</b></div>
                          <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><div className="text-[9px] font-mono uppercase text-slate-400">Prob. estouro</div><b className={`font-display text-[13.5px] ${fc.budgetOverrunProbability > 50 ? 'text-rose-600' : fc.budgetOverrunProbability > 25 ? 'text-amber-600' : 'text-emerald-600'}`}>{fc.budgetOverrunProbability}%</b></div>
                        </div>
                        <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <TrendingUp size={12} /> Saúde: <Chip tone={fc.healthTrend === 'Piorando' ? 'red' : fc.healthTrend === 'Melhorando' ? 'green' : 'steel'}>{fc.healthTrend}</Chip>
                          {fc.bottlenecks[0] && <span className="truncate">· gargalo: {fc.bottlenecks[0]}</span>}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'advisor' && (
        <Card pad={false} className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8 bg-ink-900 grid-tex flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-petrol-600 grid place-items-center"><BrainCircuit size={16} className="text-white" /></span>
            <div><b className="font-display text-white text-[14px]">NEX Advisor</b><div className="text-[10px] font-mono text-petrol-300">pergunte em linguagem natural · respostas citam dados internos</div></div>
          </div>
          <div className="h-[430px] overflow-y-auto p-5 space-y-4">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} anim-rise`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-petrol-600 text-white' : 'bg-slate-100 dark:bg-white/6 text-ink-900 dark:text-slate-100'}`}>
                  <p className="text-[13px] whitespace-pre-line leading-relaxed">{m.text}</p>
                  {m.sources && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/8">
                      <div className="text-[9.5px] font-mono uppercase text-slate-400 mb-1">Fontes internas</div>
                      <div className="flex flex-wrap gap-1">{m.sources.map(s => <Chip key={s} tone="teal" className="!text-[9.5px]">{s}</Chip>)}</div>
                    </div>
                  )}
                  {m.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.suggestions.map(s => <button key={s} onClick={() => ask(s)} className="text-[11px] font-medium rounded-full ring-1 ring-petrol-500/40 text-petrol-700 dark:text-petrol-300 px-2.5 py-1 hover:bg-petrol-50 dark:hover:bg-petrol-900/30 transition">{s}</button>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {asking && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-white/6 rounded-xl px-4 py-3"><Thinking label="Consultando dados…" /></div></div>}
            <div ref={chatEnd} />
          </div>
          <div className="p-3.5 border-t border-slate-200/80 dark:border-white/8 flex gap-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="Ex.: Resuma o projeto PRJ-2025-003 para uma reunião executiva…"
              className="flex-1 rounded-lg bg-white dark:bg-ink-900 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 px-3.5 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-petrol-500 text-ink-900 dark:text-white" />
            <Btn onClick={() => ask()} disabled={asking || !question.trim()}><Send size={14} /> Perguntar</Btn>
          </div>
        </Card>
      )}

      {tab === 'recomendacoes' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3 stagger">
            {recs.map(r => (
              <Card key={r.id} className="border-l-[3px] !border-l-petrol-500">
                <div className="flex items-center gap-2"><Sparkles size={14} className="text-petrol-500" /><b className="text-[13.5px] text-ink-900 dark:text-slate-100 flex-1">{r.title}</b></div>
                <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mt-1.5">{r.detail}</p>
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400"><b className="text-slate-600 dark:text-slate-300">Por que:</b> {r.rationale}</div>
                <div className="flex gap-2 mt-3">
                  <Btn size="sm" onClick={() => applyRec(r.id)}><Check size={13} /> Aplicar</Btn>
                  <Btn size="sm" variant="outline" onClick={() => { mutate(d => { }, { action: 'REVISOU_RECOMENDAÇÃO', entity: 'AiRecommendation', entityId: r.id }); toast('Recomendação marcada para revisão.', 'info'); }}>Revisar</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => ignoreRec(r.id)}><X size={13} /> Ignorar</Btn>
                </div>
              </Card>
            ))}
            {recs.length === 0 && <Card className="md:col-span-2"><EmptyState title="Nenhuma recomendação pendente" hint="Todas as recomendações foram aplicadas ou ignoradas." /></Card>}
          </div>
          {applied.length > 0 && (
            <Card>
              <SectionTitle>Histórico de recomendações</SectionTitle>
              <div className="space-y-1.5">
                {applied.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-[12px]">
                    <Chip tone={r.status === 'Aplicada' ? 'green' : 'neutral'}>{r.status}</Chip>
                    <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{r.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{relTime(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
