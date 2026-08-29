import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { Btn, Field, Input, Modal } from '../components/ui';
import { Eye, EyeOff, ShieldAlert, Lock, Building2, KeyRound } from 'lucide-react';
import { greeting } from '../lib/engine';

export function LoginPage() {
  const { login, user, changePassword } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  useEffect(() => { if (user?.mustChangePassword) setPwdModal(true); }, [user]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Informe e-mail e senha para continuar.'); return; }
    setLoading(true);
    setTimeout(() => {
      const r = login(email, password);
      setLoading(false);
      if (!r.ok) setError(r.error ?? 'Falha na autenticação.');
    }, 550);
  };
  const submitPwd = () => {
    if (pwd.length < 6) { setPwdErr('A nova senha deve ter ao menos 6 caracteres.'); return; }
    if (pwd !== pwd2) { setPwdErr('As senhas não conferem.'); return; }
    changePassword(pwd);
    setPwdModal(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr]">
      {/* identity panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink-900 grid-tex scanline p-10 relative overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full border border-petrol-500/15" />
        <div className="absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full border border-petrol-500/10" />
        <div className="flex items-center gap-3 relative">
          <span className="h-10 w-10 rounded-xl bg-petrol-600 grid place-items-center shadow-lg shadow-petrol-950/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19V5m0 14h16M4 15l5-6 4 3 7-8" /></svg>
          </span>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none tracking-tight">NETPROJECT</div>
            <div className="text-[10px] font-mono text-petrol-300 mt-1 tracking-[0.18em]">DA ESTRATÉGIA À ENTREGA</div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-[34px] leading-[1.12] font-bold text-white tracking-tight">
            Uma plataforma de <span className="text-petrol-300">PMO estratégico</span> para governar ideias, projetos e decisões.
          </h1>
          <p className="text-slate-400 text-[14px] mt-4 leading-relaxed">
            Portfólios, programas, demandas, governança, previsão e inteligência gerencial —
            do setor público à iniciativa privada, com trilha de auditoria completa.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { n: '10', l: 'projetos ativos no demo' },
              { n: '15', l: 'perfis de acesso (RBAC)' },
              { n: '100%', l: 'das ações auditadas' },
            ].map(s => (
              <div key={s.l} className="rounded-lg bg-white/4 ring-1 ring-white/10 px-3 py-2.5">
                <div className="font-display font-bold text-white text-xl">{s.n}</div>
                <div className="text-[10.5px] text-slate-400 mt-0.5 leading-tight">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] font-mono text-slate-500 flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Lock size={12} /> Sessão criptografada</span>
          <span>LGPD by design</span>
          <span>Multi-organização</span>
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center p-6 bg-paper dark:bg-ink-950">
        <div className="w-full max-w-sm anim-rise">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="h-9 w-9 rounded-lg bg-petrol-600 grid place-items-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19V5m0 14h16M4 15l5-6 4 3 7-8" /></svg></span>
            <div>
              <div className="font-display font-bold text-ink-900 dark:text-white leading-none">NETPROJECT</div>
              <div className="text-[9px] font-mono text-petrol-600 mt-0.5 tracking-[0.16em]">DA ESTRATÉGIA À ENTREGA</div>
            </div>
          </div>
          <div className="text-[12px] font-mono text-slate-400 uppercase tracking-widest">{greeting()}</div>
          <h2 className="font-display text-[24px] font-bold text-ink-900 dark:text-white tracking-tight mt-1">Acesse sua organização</h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 mb-6">Autenticação multi-organização com perfis de acesso granulares.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="E-mail corporativo" required>
              <Input type="email" placeholder="nome@organizacao.gov.br" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </Field>
            <Field label="Senha" required>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </Field>
            {error && <div className="text-[12px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-900 rounded-lg px-3 py-2">{error}</div>}
            <Btn type="submit" className="w-full !py-2.5" disabled={loading}>
              {loading ? 'Autenticando…' : 'Entrar na plataforma'}
            </Btn>
          </form>

          <div className="mt-6 rounded-xl ring-1 ring-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:ring-amber-900 p-3.5">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-[12px] font-bold"><ShieldAlert size={14} /> Ambiente de demonstração</div>
            <div className="text-[11.5px] text-amber-700/90 dark:text-amber-200/80 mt-1 leading-relaxed">
              Senha padrão: <b className="font-mono">123456</b> · O primeiro acesso exige troca de senha. Nunca utilize esta credencial em produção.
            </div>
            <div className="mt-2.5 space-y-1">
              {[
                { e: 'admin@systenex.local', r: 'Administrador Master (Systenex)' },
                { e: 'mariana.souza@exemplo.gov.br', r: 'PMO (Prefeitura de Exemplo)' },
                { e: 'fernanda.alves@exemplo.gov.br', r: 'Secretária / Executiva' },
                { e: 'carlos.lima@exemplo.gov.br', r: 'Gerente de Projetos' },
                { e: 'paulo.reis@exemplo.gov.br', r: 'Auditor (leitura + trilha)' },
              ].map(a => (
                <button key={a.e} onClick={() => { setEmail(a.e); setPassword('123456'); setError(''); }}
                  className="w-full flex items-center justify-between gap-2 text-left text-[11px] font-mono bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-md px-2 py-1.5 transition">
                  <span className="truncate text-ink-700 dark:text-slate-200">{a.e}</span>
                  <span className="text-slate-400 text-[10px] shrink-0">{a.r}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 text-[10.5px] text-slate-400 flex items-center gap-2"><Building2 size={12} /> Multi-tenant: cada organização enxerga apenas os próprios dados.</div>
        </div>
      </div>

      <Modal open={pwdModal} onClose={() => setPwdModal(false)} title={<span className="flex items-center gap-2"><KeyRound size={16} className="text-petrol-600" /> Alteração de senha obrigatória</span>}
        footer={<><Btn variant="ghost" onClick={() => setPwdModal(false)}>Depois</Btn><Btn onClick={submitPwd}>Salvar nova senha</Btn></>}>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">Por política de segurança, a senha padrão do ambiente de desenvolvimento deve ser substituída no primeiro acesso. (Nesta demonstração, qualquer nova senha com 6+ caracteres é aceita.)</p>
        <div className="space-y-3">
          <Field label="Nova senha" required><Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} /></Field>
          <Field label="Confirmar nova senha" required><Input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} /></Field>
          {pwdErr && <div className="text-[12px] font-medium text-rose-600">{pwdErr}</div>}
        </div>
      </Modal>
    </div>
  );
}
