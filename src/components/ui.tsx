import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox } from 'lucide-react';
import { healthTone } from '../lib/engine';

// ---------------- tone system ----------------
export type Tone = 'teal' | 'steel' | 'green' | 'amber' | 'red' | 'orange' | 'neutral' | 'ink' | 'slate';
const toneChip: Record<Tone, string> = {
  teal: 'bg-petrol-100 text-petrol-800 ring-petrol-600/20 dark:bg-petrol-900/40 dark:text-petrol-200 dark:ring-petrol-400/20',
  steel: 'bg-steel-100 text-steel-800 ring-steel-600/20 dark:bg-steel-900/50 dark:text-steel-200 dark:ring-steel-400/20',
  green: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-400/20',
  amber: 'bg-amber-100 text-amber-800 ring-amber-600/25 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-400/20',
  red: 'bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-400/20',
  orange: 'bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-900/40 dark:text-orange-200 dark:ring-orange-400/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/20',
  ink: 'bg-ink-800 text-white ring-ink-600/40',
  slate: 'bg-slate-200/70 text-slate-700 ring-slate-500/15 dark:bg-slate-800/70 dark:text-slate-300',
};
export const statusTone = (s: string): Tone => {
  const map: [RegExp, Tone][] = [
    [/(crític|atrasad|bloquead|cancelad|rejeit|materializ|alto)/i, 'red'],
    [/(atenção|risco|pendente|em análise|em analise|aguardand|revisão|suspenso|alerta)/i, 'amber'],
    [/(conclu|aprovad|no prazo|entregue|resolvid|implementad|saudável|excelente|adequada)/i, 'green'],
    [/(execução|andamento|estudo|priorizad|planejamento|ativo|convertid|registrada|alta utilização)/i, 'teal'],
    [/(triagem|nova|informação|em análise|potencial|neutro)/i, 'steel'],
  ];
  for (const [re, t] of map) if (re.test(s)) return t;
  return 'neutral';
};

export function Chip({ tone = 'neutral', children, className = '', dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${toneChip[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
export const StatusChip = ({ s, className }: { s: string; className?: string }) => <Chip tone={statusTone(s)} className={className}>{s}</Chip>;

// ---------------- surfaces ----------------
export function Card({ children, className = '', pad = true, onClick }: { children: React.ReactNode; className?: string; pad?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-card dark:bg-ink-800 rounded-xl ring-1 ring-slate-900/8 dark:ring-white/8 shadow-soft ${pad ? 'p-4 sm:p-5' : ''} ${onClick ? 'cursor-pointer transition hover:shadow-lift hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  );
}
export function SectionTitle({ children, right, className = '' }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <h2 className="font-display font-semibold text-[15px] text-ink-900 dark:text-slate-100 tracking-tight">{children}</h2>
      {right}
    </div>
  );
}
export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 anim-rise">
      <div>
        {kicker && <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-petrol-600 dark:text-petrol-300 mb-1">{kicker}</div>}
        <h1 className="font-display text-[22px] sm:text-[26px] font-bold tracking-tight text-ink-900 dark:text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ---------------- buttons ----------------
export function Btn({ children, onClick, variant = 'primary', size = 'md', className = '', disabled, title, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'dark'; size?: 'sm' | 'md';
  className?: string; disabled?: boolean; title?: string; type?: 'button' | 'submit';
}) {
  const v = {
    primary: 'bg-petrol-600 hover:bg-petrol-700 text-white shadow-sm',
    dark: 'bg-ink-800 hover:bg-ink-700 text-white shadow-sm dark:bg-petrol-700 dark:hover:bg-petrol-600',
    ghost: 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/8',
    outline: 'ring-1 ring-inset ring-slate-300 dark:ring-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  }[variant];
  const s = size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-3.5 py-2 text-[13px]';
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition active:scale-[.97] disabled:opacity-45 disabled:pointer-events-none ${v} ${s} ${className}`}>
      {children}
    </button>
  );
}
export function IconBtn({ children, onClick, title, className = '', badge }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string; badge?: number }) {
  return (
    <button title={title} onClick={onClick} className={`relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/8 hover:text-ink-800 dark:hover:text-white transition active:scale-95 ${className}`}>
      {children}
      {badge !== undefined && badge > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold grid place-items-center">{badge}</span>}
    </button>
  );
}

// ---------------- avatar ----------------
const avColors = ['bg-petrol-600', 'bg-steel-600', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-600', 'bg-ink-600'];
export function Avatar({ name, initials, size = 30 }: { name: string; initials?: string; size?: number }) {
  const ini = initials ?? name.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const color = avColors[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % avColors.length];
  return (
    <span title={name} style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} text-white rounded-full grid place-items-center font-display font-semibold shrink-0 ring-2 ring-white dark:ring-ink-800`}>
      {ini}
    </span>
  );
}

// ---------------- progress ----------------
export function Progress({ value, tone, className = '', h = 6 }: { value: number; tone?: 'teal' | 'steel' | 'green' | 'amber' | 'red' | 'auto'; className?: string; h?: number }) {
  const t = tone === 'auto' || !tone ? ({ ok: 'bg-emerald-500', warn: 'bg-amber-500', crit: 'bg-rose-500' }[healthTone(value)]) : { teal: 'bg-petrol-500', steel: 'bg-steel-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500' }[tone];
  return (
    <div className={`w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden ${className}`} style={{ height: h }}>
      <div className={`h-full rounded-full ${t} transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ---------------- stat ----------------
export function Stat({ label, value, hint, tone = 'neutral', onClick, icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone; onClick?: () => void; icon?: React.ReactNode }) {
  const bar: Record<Tone, string> = { teal: 'bg-petrol-500', steel: 'bg-steel-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', orange: 'bg-orange-500', neutral: 'bg-slate-400', ink: 'bg-ink-700', slate: 'bg-slate-400' };
  return (
    <div onClick={onClick} className={`relative bg-card dark:bg-ink-800 rounded-xl ring-1 ring-slate-900/8 dark:ring-white/8 shadow-soft p-4 overflow-hidden ${onClick ? 'cursor-pointer transition hover:shadow-lift hover:-translate-y-0.5' : ''}`}>
      <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${bar[tone]}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        {icon && <span className="text-slate-300 dark:text-slate-600">{icon}</span>}
      </div>
      <div className="font-display text-[26px] font-bold text-ink-900 dark:text-white leading-tight mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

// ---------------- modal / drawer ----------------
export function Modal({ open, onClose, title, children, width = 'max-w-2xl', footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: string; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className={`relative w-full ${width} bg-card dark:bg-ink-800 rounded-xl shadow-lift ring-1 ring-slate-900/10 dark:ring-white/10 anim-rise max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8">
          <h3 className="font-display font-semibold text-[15px] text-ink-900 dark:text-white">{title}</h3>
          <IconBtn onClick={onClose} title="Fechar"><X size={17} /></IconBtn>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-white/8 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, title, children, width = 'max-w-md' }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65]">
      <div className="absolute inset-0 bg-ink-950/45 anim-fade" onClick={onClose} />
      <div className={`absolute right-0 top-0 bottom-0 w-full ${width} bg-card dark:bg-ink-800 shadow-lift anim-slide-r flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8">
          <h3 className="font-display font-semibold text-[15px] text-ink-900 dark:text-white">{title}</h3>
          <IconBtn onClick={onClose} title="Fechar"><X size={17} /></IconBtn>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
// print portal — only visible in @media print
export function PrintSheet({ children }: { children: React.ReactNode }) {
  return createPortal(<div className="print-sheet">{children}</div>, document.body);
}

// ---------------- form ----------------
export function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}
const inputCls = 'w-full rounded-lg bg-white dark:bg-ink-900 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 px-3 py-2 text-[13px] text-ink-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-petrol-500 transition';
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />; }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`${inputCls} min-h-[74px] ${props.className ?? ''}`} />; }
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />; }
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 group">
      <span className={`w-9 h-5 rounded-full p-0.5 transition ${on ? 'bg-petrol-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </span>
      {label && <span className="text-[13px] text-slate-600 dark:text-slate-300">{label}</span>}
    </button>
  );
}

// ---------------- tabs ----------------
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; badge?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/8 mb-4 -mx-1 px-1">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-3 py-2 text-[13px] font-semibold rounded-t-lg whitespace-nowrap transition relative ${active === t.key ? 'text-petrol-700 dark:text-petrol-300' : 'text-slate-500 hover:text-ink-800 dark:hover:text-slate-200'}`}>
          {t.label}{t.badge !== undefined && t.badge > 0 && <span className="ml-1.5 text-[10px] font-bold bg-slate-200 dark:bg-white/10 rounded-full px-1.5 py-0.5">{t.badge}</span>}
          {active === t.key && <span className="absolute left-2 right-2 -bottom-px h-[2.5px] bg-petrol-500 rounded-full" />}
        </button>
      ))}
    </div>
  );
}

// ---------------- misc ----------------
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10">
      <Inbox className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={34} />
      <div className="font-display font-semibold text-slate-600 dark:text-slate-300">{title}</div>
      {hint && <div className="text-[12px] text-slate-400 mt-1 max-w-sm mx-auto">{hint}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-white/5 font-mono text-[10px] text-slate-500 dark:text-slate-400">{children}</kbd>;
}
export function AiBadge({ children = 'Inteligência NEX' }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-ink-900 dark:bg-petrol-900/50 text-petrol-300 px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wide uppercase">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg>
      {children}
    </span>
  );
}
export function Thinking({ label = 'Analisando dados…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6 justify-center text-slate-500 dark:text-slate-400">
      <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-petrol-500" style={{ animation: `blink 1s ${i * 0.18}s infinite` }} />)}</span>
      <span className="text-[13px] font-mono">{label}</span>
    </div>
  );
}
