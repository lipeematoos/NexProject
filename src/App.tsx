import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './lib/store';
import { Sidebar, Topbar, CommandPalette, Drawers, ToastHost, canAccess } from './components/shell';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { StrategyPage, PortfoliosPage, RoadmapPage } from './pages/Strategy';
import { IdeasPage, DemandsPage } from './pages/Pipeline';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { KanbanPage, MyTasksPage, SchedulePage } from './pages/Board';
import { RisksPage, IssuesPage, ChangesPage } from './pages/Governance';
import { CostsPage, ResourcesPage, TeamsPage } from './pages/Finance';
import { IntelligencePage } from './pages/Intelligence';
import { ReportsPage, DocumentsPage, MeetingsPage, LessonsPage, DecisionsPage } from './pages/Knowledge';
import { AdminPage } from './pages/Admin';

function Router() {
  const { route, user, nav } = useApp();
  // role guard: bounce to dashboard if the current profile can't see the page
  useEffect(() => {
    if (user && !canAccess(user.role, route.page)) nav('painel');
  }, [route.page, user, nav]);
  const key = `${route.page}-${route.id ?? ''}`;
  switch (route.page) {
    case 'estrategia': return <StrategyPage key={key} />;
    case 'ideias': return <IdeasPage key={key} />;
    case 'demandas': return <DemandsPage key={key} />;
    case 'portfolios': return <PortfoliosPage key={key} mode="portfolios" />;
    case 'programas': return <PortfoliosPage key={key} mode="programas" />;
    case 'projetos': return <ProjectsPage key={key} />;
    case 'projeto': return route.id ? <ProjectDetailPage key={key} projectId={route.id} /> : <ProjectsPage key={key} />;
    case 'atividades': return <KanbanPage key={key} />;
    case 'tarefas': return <MyTasksPage key={key} />;
    case 'cronograma': return <SchedulePage key={key} />;
    case 'equipes': return <TeamsPage key={key} />;
    case 'recursos': return <ResourcesPage key={key} />;
    case 'riscos': return <RisksPage key={key} />;
    case 'problemas': return <IssuesPage key={key} />;
    case 'mudancas': return <ChangesPage key={key} />;
    case 'custos': return <CostsPage key={key} />;
    case 'relatorios': return <ReportsPage key={key} />;
    case 'inteligencia': return <IntelligencePage key={key} />;
    case 'documentos': return <DocumentsPage key={key} />;
    case 'reunioes': return <MeetingsPage key={key} />;
    case 'licoes': return <LessonsPage key={key} />;
    case 'decisoes': return <DecisionsPage key={key} />;
    case 'admin': return <AdminPage key={key} />;
    default: return <DashboardPage key={key} />;
  }
}

function Shell() {
  const { session, user, nav, route } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = 'NETPROJECT — PMO Estratégico'; }, []);
  if (!session || !user) return <><LoginPage /><ToastHost /></>;
  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-[248px] flex flex-col min-h-screen">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1">
          <Router />
        </main>
        <footer className="px-5 py-3 border-t border-slate-900/8 dark:border-white/8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-mono text-slate-400">
          <span className="text-petrol-600 dark:text-petrol-400 font-semibold">NETPROJECT</span>
          <span>da estratégia à entrega</span>
          <span className="hidden sm:inline">· PMO estratégico multi-organização</span>
          <button onClick={() => nav('relatorios')} className="hover:text-petrol-600 transition">relatórios</button>
          <button onClick={() => nav('inteligencia')} className="hover:text-petrol-600 transition">inteligência</button>
          <span className="ml-auto">auditoria ativa · LGPD by design</span>
        </footer>
      </div>
      <CommandPalette />
      <Drawers />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
