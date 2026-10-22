// Mobile-first implementation of the small UI kit the plan was written against.
import React, { Fragment, useState, useEffect, useMemo, useRef, ReactNode } from "react";
export { Fragment, useState, useEffect, useMemo };

const THEME = {
  radius: { sm: 6, md: 8, lg: 14, xl: 18, full: 999 },
  border: { default: "#24402f", strong: "#4c7a5e", focus: "#5cc98a" },
  fill: { primary: "#2f9e5c", secondary: "#1b3326", accentSubtle: "rgba(92,201,138,0.14)", controlChecked: "#2f9e5c" },
  bg: { base: "#0b1510", elevated: "#13231a", sunken: "#0e1b14" },
  text: { primary: "#eef5ef", secondary: "#a9c2b1", tertiary: "#7c9886", onPrimary: "#ffffff", link: "#8fe0b0" },
  font: {
    family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    body1: { fontSize: 17, lineHeight: "24px" },
    body2: { fontSize: 15, lineHeight: "21px" },
    label: { fontSize: 13, lineHeight: "18px" },
    heading2: { fontSize: 22, lineHeight: "28px" },
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  dataviz: { categorical: ["#5cc98a", "#f2c94c", "#56a3f2", "#e07a5f"] },
};
export function useGrokTheme() { return THEME; }
const t = THEME;

export function Page(props: { title: string; summary?: string; width?: string; children?: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: t.bg.base, color: t.text.primary, fontFamily: t.font.family }}>
      <header style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 10px", background: "linear-gradient(160deg,#0f3d24 0%,#0b1510 100%)", borderBottom: `1px solid ${t.border.default}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="./icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{props.title}</div>
            {props.summary && <div style={{ fontSize: 12, color: t.text.secondary, lineHeight: "16px" }}>{props.summary}</div>}
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "8px 14px calc(env(safe-area-inset-bottom) + 40px)", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>{props.children}</main>
    </div>
  );
}

export function Section(props: { heading?: string; caption?: string; collapsible?: boolean; defaultOpen?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState<boolean>(props.collapsible ? !!props.defaultOpen : true);
  return (
    <section style={{ background: t.bg.sunken, border: `1px solid ${t.border.default}`, borderRadius: t.radius.xl, padding: 14, display: "grid", gap: 12, minWidth: 0 }}>
      {props.heading && (
        <div onClick={props.collapsible ? () => setOpen(!open) : undefined} style={{ cursor: props.collapsible ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 650 as any, lineHeight: "24px" }}>{props.heading}</div>
            {props.caption && <div style={{ fontSize: 13, color: t.text.tertiary, marginTop: 2 }}>{props.caption}</div>}
          </div>
          {props.collapsible && <span style={{ fontSize: 20, color: t.text.secondary }}>{open ? "▾" : "▸"}</span>}
        </div>
      )}
      {open && props.children}
    </section>
  );
}

export function Text(props: { children?: ReactNode }) {
  return <div style={{ fontSize: t.font.body2.fontSize, lineHeight: t.font.body2.lineHeight, color: t.text.secondary }}>{props.children}</div>;
}

export function Callout(props: { tone?: string; children?: ReactNode }) {
  const c = props.tone === "warning" ? "#f2c94c" : props.tone === "danger" ? "#e07a5f" : "#56a3f2";
  return <div style={{ borderLeft: `4px solid ${c}`, background: "rgba(255,255,255,0.04)", borderRadius: t.radius.md, padding: "10px 12px", fontSize: 15, lineHeight: "21px" }}>{props.children}</div>;
}

export function BulletList(props: { items: ReactNode[] }) {
  return <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 15, lineHeight: "21px" }}>{props.items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

export function Steps(props: { steps: { title: string; detail?: string }[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
      {props.steps.map((s, i) => (
        <li key={i} style={{ display: "flex", gap: 10 }}>
          <span style={{ flex: "0 0 28px", height: 28, borderRadius: 14, background: t.fill.secondary, color: t.text.link, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{i + 1}</span>
          <span><div style={{ fontWeight: 600 }}>{s.title}</div>{s.detail && <div style={{ fontSize: 14, color: t.text.secondary }}>{s.detail}</div>}</span>
        </li>
      ))}
    </ol>
  );
}

export function Table(props: { columns: string[]; rows: ReactNode[][]; align?: string[]; emphasis?: number }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any, border: `1px solid ${t.border.default}`, borderRadius: t.radius.lg }}>
      <table style={{ fontSize: 14, lineHeight: "19px", minWidth: props.columns.length > 2 ? 520 : undefined }}>
        <thead>
          <tr>{props.columns.map((c, i) => <th key={i} style={{ textAlign: (props.align?.[i] === "end" ? "right" : "left") as any, padding: "8px 10px", background: t.fill.secondary, color: t.text.secondary, fontWeight: 600, position: "sticky", top: 0 }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {props.rows.map((r, ri) => (
            <tr key={ri} style={{ background: ri === props.emphasis ? t.fill.accentSubtle : ri % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
              {r.map((c, ci) => <td key={ci} style={{ padding: "8px 10px", verticalAlign: "top", borderTop: `1px solid ${t.border.default}`, textAlign: (props.align?.[ci] === "end" ? "right" : "left") as any, fontWeight: ci === 0 ? 600 : 400 }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Rows(props: { rows: { lead?: string; title: string; detail?: string }[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ flex: "0 0 64px", color: t.text.link, fontWeight: 700, fontSize: 14 }}>{r.lead}</span>
          <span><div style={{ fontWeight: 600 }}>{r.title}</div>{r.detail && <div style={{ fontSize: 14, color: t.text.secondary }}>{r.detail}</div>}</span>
        </div>
      ))}
    </div>
  );
}

export function Properties(props: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.items.map((it, i) => (
        <div key={i} style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: t.text.tertiary }}>{it.label}</div>
          <div style={{ fontSize: 16, lineHeight: "22px" }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

type Opt<T> = T | { value: T; label: string };
function normOpts<T>(o: Opt<T>[]): { value: T; label: string }[] {
  return o.map((x: any) => (x !== null && typeof x === "object" && "value" in x ? x : { value: x, label: String(x) }));
}

export function Segmented<T>(props: { options: Opt<T>[]; value: T; onChange: (v: T) => void }) {
  const opts = normOpts(props.options);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current; if (!box) return;
    const el = box.querySelector('[data-on="1"]') as HTMLElement | null;
    if (el) box.scrollTo({ left: Math.max(0, el.offsetLeft - box.offsetLeft - 24), behavior: "smooth" });
  }, [props.value]);
  return (
    <div ref={ref} style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" as any, paddingBottom: 2 }}>
      {opts.map((o) => {
        const on = o.value === props.value;
        return (
          <button key={String(o.value)} data-on={on ? "1" : "0"} onClick={() => props.onChange(o.value)}
            style={{ flex: "0 0 auto", minHeight: 44, padding: "0 16px", borderRadius: t.radius.full, cursor: "pointer", border: `1px solid ${on ? t.border.focus : t.border.default}`, background: on ? t.fill.primary : t.bg.elevated, color: on ? "#fff" : t.text.primary, fontSize: 15, fontWeight: on ? 700 : 500, whiteSpace: "nowrap" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const fieldStyle: React.CSSProperties = { width: "100%", minHeight: 48, padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.border.default}`, background: t.bg.elevated, color: t.text.primary, fontSize: 16 };
export function Select<T>(props: { label?: string; options: Opt<T>[]; value: T; onChange: (v: T) => void }) {
  const opts = normOpts(props.options);
  return (
    <label style={{ display: "grid", gap: 6 }}>
      {props.label && <span style={{ fontSize: 13, color: t.text.secondary }}>{props.label}</span>}
      <select style={fieldStyle} value={String(props.value)} onChange={(e) => { const o = opts.find((x) => String(x.value) === e.target.value); if (o) props.onChange(o.value); }}>
        {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Input(props: { label?: string; value: string; placeholder?: string; type?: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      {props.label && <span style={{ fontSize: 13, color: t.text.secondary }}>{props.label}</span>}
      <input style={fieldStyle} value={props.value} placeholder={props.placeholder} type={props.type === "number" ? "text" : props.type || "text"} inputMode={props.type === "number" ? "decimal" : undefined} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}

export function Button(props: { label: string; variant?: string; onClick?: () => void }) {
  const p = props.variant === "primary";
  return (
    <button onClick={props.onClick} style={{ minHeight: 52, padding: "0 18px", borderRadius: t.radius.lg, cursor: "pointer", border: `1px solid ${p ? t.fill.primary : t.border.strong}`, background: p ? t.fill.primary : t.bg.elevated, color: p ? "#fff" : t.text.primary, fontSize: 16, fontWeight: 650 as any, width: "100%" }}>
      {props.label}
    </button>
  );
}

export function Metrics(props: { metrics: { value: string; label: string; detail?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
      {props.metrics.map((m, i) => (
        <div key={i} style={{ background: t.bg.elevated, border: `1px solid ${t.border.default}`, borderRadius: t.radius.lg, padding: 12 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: t.text.link }}>{m.value}</div>
          <div style={{ fontWeight: 600 }}>{m.label}</div>
          {m.detail && <div style={{ fontSize: 12, color: t.text.tertiary }}>{m.detail}</div>}
        </div>
      ))}
    </div>
  );
}

export function LinkCards(props: { links: { title: string; site?: string; href: string }[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.links.map((l, i) => (
        <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: 12, borderRadius: t.radius.lg, border: `1px solid ${t.border.default}`, background: t.bg.elevated, color: t.text.primary, textDecoration: "none" }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{l.title}</div>
          {l.site && <div style={{ fontSize: 12, color: t.text.link }}>{l.site} ↗</div>}
        </a>
      ))}
    </div>
  );
}

export function LineChart(props: { points: { label: string; value: number }[]; floor?: number; ceiling?: number; unit?: string; labels?: string[]; secondary?: { label: string; values: number[] }; format?: (v: number) => string }) {
  const W = 340, H = 180, P = { l: 36, r: 10, t: 12, b: 28 };
  const vals = props.points.map((p) => p.value);
  const lo = props.floor ?? Math.min(...vals), hi = props.ceiling ?? Math.max(...vals);
  const n = props.points.length;
  const x = (i: number) => P.l + (n <= 1 ? 0 : (i * (W - P.l - P.r)) / (n - 1));
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const path = props.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const fmt = props.format || ((v: number) => String(v));
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={props.labels?.[0] || "chart"}>
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(tv)} y2={y(tv)} stroke={t.border.default} strokeDasharray="3 3" />
            <text x={P.l - 4} y={y(tv) + 4} fontSize="10" fill={t.text.tertiary} textAnchor="end">{Math.round(tv)}</text>
          </g>
        ))}
        {props.secondary && <path d={props.secondary.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} stroke={t.dataviz.categorical[1]} strokeDasharray="5 4" fill="none" strokeWidth={1.5} />}
        <path d={path} stroke={t.dataviz.categorical[0]} strokeWidth={2.5} fill="none" />
        {props.points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={3.5} fill={t.dataviz.categorical[0]}><title>{`${p.label}: ${fmt(p.value)}`}</title></circle>
            {p.label && <text x={x(i)} y={H - 8} fontSize="10" fill={t.text.tertiary} textAnchor="middle">{p.label}</text>}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: t.text.secondary }}>
        <span><span style={{ color: t.dataviz.categorical[0] }}>●</span> {props.labels?.[0] || "Value"}</span>
        {props.secondary && <span><span style={{ color: t.dataviz.categorical[1] }}>- -</span> {props.secondary.label}</span>}
      </div>
    </div>
  );
}

export function Columns(props: { points: { label: string; value: number; display?: string }[]; emphasis?: number }) {
  const max = Math.max(100, ...props.points.map((p) => p.value));
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 140 }}>
      {props.points.map((p, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 11, color: t.text.secondary }}>{p.display ?? p.value}</div>
          <div style={{ width: "100%", height: `${(p.value / max) * 90}%`, minHeight: 2, borderRadius: 6, background: i === props.emphasis ? t.dataviz.categorical[1] : t.dataviz.categorical[0] }} />
          <div style={{ fontSize: 12, color: i === props.emphasis ? t.text.primary : t.text.tertiary }}>{p.label}</div>
        </div>
      ))}
    </div>
  );
}

export function CalendarHeatmap(props: { days: { date: string; value: number }[]; max?: number; note?: string }) {
  const max = props.max || 100;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {props.days.map((d) => (
          <div key={d.date} title={`${d.date}: ${d.value}%`} style={{ aspectRatio: "1", borderRadius: 4, background: d.value > 0 ? `rgba(92,201,138,${0.2 + 0.8 * (d.value / max)})` : t.fill.secondary }} />
        ))}
      </div>
      {props.note && <div style={{ fontSize: 12, color: t.text.tertiary, marginTop: 6 }}>{props.note}</div>}
    </div>
  );
}

function hm(h: number): string {
  const total = Math.round(h * 60); const hh = Math.floor(total / 60) % 24; const mm = total % 60;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${mm < 10 ? "0" : ""}${mm}`;
}
export function DayView(props: { start: number; end: number; events: { start: number; end: number; title: string; selected?: boolean; flag?: boolean }[]; mark?: { at: number; label?: string } }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {props.events.filter((e) => e.end > props.start && e.start < props.end).map((e, i) => {
        const past = props.mark ? e.end <= props.mark.at : false;
        return (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${e.selected ? t.border.focus : t.border.default}`, background: e.selected ? t.fill.accentSubtle : t.bg.elevated, opacity: past && !e.selected ? 0.55 : 1 }}>
            <span style={{ flex: "0 0 92px", fontSize: 13, color: t.text.link, fontVariantNumeric: "tabular-nums" }}>{`${hm(e.start)}-${hm(e.end)}`}</span>
            <span style={{ fontSize: 14 }}>{e.flag ? "✓ " : ""}{e.title}{e.selected && props.mark ? `  · ${props.mark.label || "Now"}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
