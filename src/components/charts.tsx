import React, { useMemo } from 'react';
import { fmtDateShort } from '../lib/engine';

// ---------------- Donut ----------------
export function Donut({ segments, size = 132, thickness = 16, center, sub }: {
  segments: { value: number; color: string; label: string }[]; size?: number; thickness?: number; center: string; sub?: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-slate-200/70 dark:text-white/8" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * C;
        const off = -acc * C;
        acc += frac;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700">
            <title>{`${s.label}: ${s.value}`}</title>
          </circle>
        );
      })}
      <text x="50%" y="47%" textAnchor="middle" className="fill-ink-900 dark:fill-white font-display" style={{ fontSize: size * 0.19, fontWeight: 700 }}>{center}</text>
      {sub && <text x="50%" y="62%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: size * 0.075 }}>{sub}</text>}
    </svg>
  );
}

// ---------------- Horizontal bars ----------------
export function HBars({ items, unit = '', money }: { items: { label: string; value: number; color?: string; hint?: string }[]; unit?: string; money?: (n: number) => string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex justify-between text-[11.5px] mb-1 gap-2">
            <span className="font-medium text-slate-600 dark:text-slate-300 truncate">{it.label}</span>
            <span className="font-mono font-semibold text-ink-800 dark:text-slate-200 whitespace-nowrap">{money ? money(it.value) : `${it.value}${unit}`}</span>
          </div>
          <div className="h-[7px] rounded-full bg-slate-200/80 dark:bg-white/8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? '#17998c' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Vertical bars ----------------
export function VBars({ series, height = 150, money }: { series: { label: string; a: number; b?: number }[]; height?: number; money?: (n: number) => string }) {
  const max = Math.max(1, ...series.flatMap(s => [s.a, s.b ?? 0]));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {series.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex items-end justify-center gap-1" style={{ height: height - 22 }}>
              <div title={money ? money(s.a) : String(s.a)} className="w-1/2 max-w-[26px] rounded-t bg-steel-400/90 dark:bg-steel-500 transition-all duration-700 hover:opacity-80" style={{ height: `${(s.a / max) * 100}%` }} />
              {s.b !== undefined && <div title={money ? money(s.b) : String(s.b)} className="w-1/2 max-w-[26px] rounded-t bg-petrol-500 transition-all duration-700 hover:opacity-80" style={{ height: `${((s.b ?? 0) / max) * 100}%` }} />}
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">{s.label}</span>
          </div>
        ))}
      </div>
      {money && <div className="flex gap-4 mt-2 text-[10.5px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-steel-400" />Planejado</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-petrol-500" />Realizado</span></div>}
    </div>
  );
}

// ---------------- Area / line ----------------
export function AreaLine({ points, height = 140, color = '#17998c', labels, suffix = '' }: { points: number[]; height?: number; color?: string; labels?: string[]; suffix?: string }) {
  const W = 300, H = 100;
  const { path, area, coords } = useMemo(() => {
    if (points.length === 0) return { path: '', area: '', coords: [] as { x: number; y: number; v: number }[] };
    const max = Math.max(...points, 1), min = Math.min(...points, 0);
    const range = Math.max(1, max - min);
    const coords = points.map((v, i) => ({
      x: points.length === 1 ? W / 2 : (i / (points.length - 1)) * (W - 12) + 6,
      y: H - 14 - ((v - min) / range) * (H - 30),
      v,
    }));
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${path} L${coords[coords.length - 1].x},${H - 6} L${coords[0].x},${H - 6} Z`;
    return { path, area, coords };
  }, [points]);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full">
        <defs><linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1="6" x2={W - 6} y1={H - 14 - f * (H - 30)} y2={H - 14 - f * (H - 30)} stroke="currentColor" className="text-slate-200 dark:text-white/8" strokeDasharray="3 4" />)}
        <path d={area} fill={`url(#g-${color.replace('#', '')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" className="chart-draw" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3.4" fill={color} stroke="white" strokeWidth="1.4"><title>{`${c.v}${suffix}`}</title></circle>
          </g>
        ))}
      </svg>
      {labels && <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-1">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
}

// ---------------- Risk matrix 5×5 ----------------
export function RiskMatrix({ risks, onPick }: { risks: { id: string; p: number; i: number; title: string }[]; onPick?: (id: string) => void }) {
  const cell = (p: number, i: number) => {
    const e = p * i;
    if (e >= 15) return '#e11d48'; if (e >= 9) return '#f59e0b'; if (e >= 4) return '#facc15'; return '#34d399';
  };
  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between text-[9px] font-mono text-slate-400 py-1 pr-1 text-right">
        <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-5 gap-[3px]">
          {[5, 4, 3, 2, 1].map(p =>
            [1, 2, 3, 4, 5].map(i => {
              const here = risks.filter(r => r.p === p && r.i === i);
              return (
                <div key={`${p}${i}`} className="aspect-square rounded-[5px] relative grid place-items-center p-0.5" style={{ background: `${cell(p, i)}26`, boxShadow: `inset 0 0 0 1px ${cell(p, i)}55` }}>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {here.map(r => (
                      <button key={r.id} title={r.title} onClick={() => onPick?.(r.id)}
                        className="h-3.5 w-3.5 rounded-full border-2 border-white dark:border-ink-800 transition hover:scale-125"
                        style={{ background: cell(p, i) }} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="grid grid-cols-5 gap-[3px] mt-1 text-center text-[9px] font-mono text-slate-400">{[1, 2, 3, 4, 5].map(i => <span key={i}>{i}</span>)}</div>
      </div>
    </div>
  );
}

// ---------------- Gantt ----------------
export interface GanttRow { id: string; label: string; start: string; end: string; progress: number; critical?: boolean; baseline?: { start: string; end: string }; milestone?: boolean }
export function Gantt({ rows, today }: { rows: GanttRow[]; today: string }) {
  const all = rows.flatMap(r => [r.start, r.end, ...(r.baseline ? [r.baseline.start, r.baseline.end] : [])]);
  if (!all.length) return null;
  const min = new Date(Math.min(...all.map(d => +new Date(d + 'T00:00:00'))));
  const max = new Date(Math.max(...all.map(d => +new Date(d + 'T00:00:00'))));
  const span = Math.max(1, (max.getTime() - min.getTime()) / 86400000);
  const pos = (d: string) => ((new Date(d + 'T00:00:00').getTime() - min.getTime()) / 86400000 / span) * 100;
  const tPos = pos(today.slice(0, 10));
  return (
    <div className="relative">
      <div className="absolute top-0 bottom-0 w-px bg-rose-400/80 z-10 pointer-events-none" style={{ left: `calc(${Math.min(99.5, Math.max(0.5, tPos))}% )` }}>
        <span className="absolute -top-1 -translate-x-1/2 text-[9px] font-mono font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 px-1 rounded">HOJE</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.id} className="group grid grid-cols-[150px_1fr] sm:grid-cols-[190px_1fr] items-center gap-2">
            <div className={`text-[11px] truncate font-medium ${r.critical ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
              {r.critical && <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5 align-middle" />}
              {r.label}
            </div>
            <div className="relative h-[18px] rounded bg-slate-100 dark:bg-white/5 overflow-hidden">
              {r.baseline && (
                <div className="absolute top-1/2 -translate-y-1/2 h-[4px] rounded bg-slate-300 dark:bg-white/20"
                  style={{ left: `${pos(r.baseline.start)}%`, width: `${Math.max(0.6, pos(r.baseline.end) - pos(r.baseline.start))}%` }} title="Linha de base" />
              )}
              {r.milestone ? (
                <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 rounded-[2px]" style={{ left: `calc(${pos(r.start)}% - 6px)`, background: r.critical ? '#e11d48' : '#17998c' }} title={`Marco — ${fmtDateShort(r.start)}`} />
              ) : (
                <div className={`absolute top-1/2 -translate-y-1/2 h-[10px] rounded-full overflow-hidden ${r.critical ? 'bg-rose-200 dark:bg-rose-900/50' : 'bg-petrol-100 dark:bg-petrol-900/40'}`}
                  style={{ left: `${pos(r.start)}%`, width: `${Math.max(0.8, pos(r.end) - pos(r.start))}%` }}>
                  <div className={`h-full ${r.critical ? 'bg-rose-500' : 'bg-petrol-500'}`} style={{ width: `${r.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Progress ring ----------------
export function Ring({ value, size = 74, color, label }: { value: number; size?: number; color?: string; label?: string }) {
  const t = value >= 75 ? '#10b981' : value >= 55 ? '#f59e0b' : '#e11d48';
  const c = color ?? t;
  const r = (size - 8) / 2, C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-200 dark:text-white/10" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={c} strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C - (value / 100) * C} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-1000" />
      <text x="50%" y="50%" textAnchor="middle" dy="0.36em" className="fill-ink-900 dark:fill-white font-display" style={{ fontSize: size * 0.24, fontWeight: 700 }}>{value}</text>
      {label && <text x="50%" y="78%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: size * 0.11 }}>{label}</text>}
    </svg>
  );
}

// ---------------- Power × Interest ----------------
export function PowerInterest({ items }: { items: { id: string; name: string; influence: number; interest: number }[] }) {
  return (
    <div className="relative h-[240px] rounded-lg ring-1 ring-slate-200 dark:ring-white/10 bg-slate-50 dark:bg-ink-900 overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        <div className="border-r border-b border-dashed border-slate-200 dark:border-white/10 grid place-items-start p-2"><span className="text-[9px] font-mono text-slate-400">MANTER INFORMADO</span></div>
        <div className="border-b border-dashed border-slate-200 dark:border-white/10 grid place-items-start p-2"><span className="text-[9px] font-mono text-petrol-600 dark:text-petrol-300 font-bold">GERENCIAR DE PERTO</span></div>
        <div className="border-r border-dashed border-slate-200 dark:border-white/10 grid place-items-start p-2"><span className="text-[9px] font-mono text-slate-400">MONITORAR</span></div>
        <div className="grid place-items-start p-2"><span className="text-[9px] font-mono text-slate-400">MANTER INTERESSADO</span></div>
      </div>
      {items.map(s => (
        <span key={s.id} title={`${s.name} — influência ${s.influence}, interesse ${s.interest}`}
          className="absolute -translate-x-1/2 translate-y-1/2 h-3.5 w-3.5 rounded-full bg-steel-500 ring-2 ring-white dark:ring-ink-800 hover:scale-125 transition cursor-pointer"
          style={{ left: `${(s.interest / 5) * 100}%`, top: `${100 - (s.influence / 5) * 100}%` }} />
      ))}
      <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400">Interesse →</span>
      <span className="absolute top-1 left-2 text-[9px] font-mono text-slate-400">↑ Influência</span>
    </div>
  );
}
