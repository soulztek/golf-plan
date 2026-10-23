// @ts-nocheck
import React, { ReactNode } from "react";
const BASE = (import.meta as any).env.BASE_URL || "./";
export const PHOTO = { home: BASE + "photos/home.webp", bunker: BASE + "photos/bunker.webp", range: BASE + "photos/range.webp" };

const P = { stroke: "currentColor", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as any;
export const Icon = {
  home: <svg width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>,
  daily: <svg width="24" height="24" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  workout: <svg width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" /></svg>,
  golf: <svg width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M8 21V3l9 4-9 4" /><ellipse cx="12" cy="20.5" rx="7" ry="1.5" /></svg>,
  more: <svg width="24" height="24" viewBox="0 0 24 24" {...P}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>,
  back: <svg width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M15 5l-7 7 7 7" /></svg>,
  chev: <svg width="20" height="20" viewBox="0 0 24 24" {...P}><path d="M9 5l7 7-7 7" /></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  list: <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
  play: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" {...P} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>,
};

export type NavKey = "home" | "daily" | "workout" | "golf" | "more";
export function BottomNav(props: { value: NavKey; onChange: (v: NavKey) => void; badges?: Partial<Record<NavKey, string>> }) {
  const items: { k: NavKey; label: string }[] = [{ k: "home", label: "Home" }, { k: "daily", label: "Daily" }, { k: "workout", label: "Workout" }, { k: "golf", label: "Golf" }, { k: "more", label: "More" }];
  return (
    <nav aria-label="Main" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "var(--nav)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
        {items.map((it) => { const on = it.k === props.value; const b = props.badges && props.badges[it.k]; return (
          <button key={it.k} onClick={() => props.onChange(it.k)} aria-current={on ? "page" : undefined}
            style={{ minHeight: 62, border: "none", background: "transparent", color: on ? "var(--primary)" : "var(--text3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", fontSize: 11.5, fontWeight: on ? 700 : 500, position: "relative" }}>
            <span style={{ display: "flex", padding: "3px 14px", borderRadius: 999, background: on ? "var(--accent-subtle)" : "transparent" }}>{Icon[it.k]}</span>
            {it.label}
            {b && <span style={{ position: "absolute", top: 6, right: "50%", marginRight: -24, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--blue)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{b}</span>}
          </button>
        ); })}
      </div>
    </nav>
  );
}

/** Photo hero with gradient overlay that fades into the page background. */
export function Hero(props: { photo: string; height?: number | string; position?: string; children?: ReactNode; onBack?: () => void; fade?: boolean }) {
  return (
    <div style={{ position: "relative", margin: "0 -14px", minHeight: props.height || 260, backgroundImage: `url(${props.photo})`, backgroundSize: "cover", backgroundPosition: props.position || "center", borderRadius: "0 0 28px 28px", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: props.fade === false ? "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 100%)" : "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      {props.onBack && <button onClick={props.onBack} aria-label="Back" style={{ position: "absolute", zIndex: 2, top: "calc(env(safe-area-inset-top) + 10px)", left: 12, width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.88)", color: "#16212b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{Icon.back}</button>}
      <div style={{ position: "relative", zIndex: 1, minHeight: props.height || 260, padding: "calc(env(safe-area-inset-top) + 14px) 18px 18px", display: "flex", flexDirection: "column", color: "#fff" }}>{props.children}</div>
    </div>
  );
}

export function ScreenTitle(props: { title: string; sub?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 2px 4px", display: "flex", alignItems: "center", gap: 10 }}>
      {props.onBack && <button onClick={props.onBack} aria-label="Back" style={{ width: 44, height: 44, borderRadius: 22, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" }}>{Icon.back}</button>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.4, lineHeight: "34px" }}>{props.title}</div>
        {props.sub && <div style={{ fontSize: 14, color: "var(--text2)" }}>{props.sub}</div>}
      </div>
      {props.right}
    </div>
  );
}

export function StatCard(props: { emoji: string; label: string; value: string; unit?: string; detail?: string; big?: boolean; onClick?: () => void }) {
  return (
    <button onClick={props.onClick} style={{ textAlign: "left", border: "none", cursor: props.onClick ? "pointer" : "default", background: "var(--glass)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderRadius: 20, padding: "12px 14px", boxShadow: "var(--shadow)", color: "var(--text)", display: "grid", gap: 4, gridRow: props.big ? "span 2" : undefined, alignContent: props.big ? "space-between" : "start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}><span aria-hidden style={{ fontSize: 18 }}>{props.emoji}</span>{props.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: props.big ? "center" : "flex-start" }}>
        <span style={{ fontSize: props.big ? 44 : 26, fontWeight: 800, letterSpacing: -0.5 }}>{props.value}</span>
        {props.unit && <span style={{ fontSize: 13, color: "var(--text2)" }}>{props.unit}</span>}
      </div>
      {props.detail && <div style={{ fontSize: 12, color: "var(--text2)", textAlign: props.big ? "center" : "left" }}>{props.detail}</div>}
    </button>
  );
}

export function Bar(props: { value: number; color?: string; height?: number; track?: string }) {
  const v = Math.max(0, Math.min(1, props.value || 0));
  return <div style={{ height: props.height || 6, borderRadius: 99, background: props.track || "var(--fill2)", overflow: "hidden" }}><div style={{ width: `${v * 100}%`, height: "100%", borderRadius: 99, background: props.color || "var(--primary)" }} /></div>;
}

export function CategoryCard(props: { title: string; color: string; lines: string[]; value: number; photo?: string; emoji?: string; onClick: () => void }) {
  return (
    <button onClick={props.onClick} style={{ flex: "0 0 74%", maxWidth: 300, minHeight: 150, border: "none", borderRadius: 22, padding: 16, cursor: "pointer", textAlign: "left", color: "#fff", position: "relative", overflow: "hidden", background: props.photo ? `linear-gradient(90deg, ${props.color} 0%, ${props.color}e6 45%, ${props.color}33 100%), url(${props.photo}) center/cover` : props.color, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{props.emoji ? `${props.emoji} ` : ""}{props.title}</div>
        {props.lines.map((l, i) => <div key={i} style={{ fontSize: 13.5, opacity: 0.95, marginTop: 4 }}>{l}</div>)}
      </div>
      <Bar value={props.value} color="#ffffff" track="rgba(255,255,255,0.35)" />
    </button>
  );
}

export function Chip(props: { icon?: ReactNode; label: string; tone?: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: props.tone || "var(--accent-subtle)", color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>{props.icon}{props.label}</span>;
}

function Thumb(props: { src?: string | null; size?: number; fallback?: string }) {
  const s = props.size || 64;
  return props.src
    ? <img src={props.src} alt="" loading="lazy" decoding="async" width={s} height={s} style={{ width: s, height: s, objectFit: "cover", borderRadius: 14, background: "#fff", flex: "0 0 auto" }} />
    : <div style={{ width: s, height: s, borderRadius: 14, flex: "0 0 auto", background: "linear-gradient(135deg, var(--accent-subtle), var(--fill2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * 0.42 }}>{props.fallback || "⛳"}</div>;
}

export function WorkoutCard(props: { title: string; lines: string[]; value: number; progressLabel: string; thumb?: string | null; fallback?: string; badge?: string; onClick: () => void }) {
  return (
    <button onClick={props.onClick} style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: 14, border: "1px solid var(--border)", borderRadius: 20, background: "var(--card)", boxShadow: "var(--shadow)", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
      <div style={{ flex: 1, display: "grid", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{props.title}</span>
          {props.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "var(--blue)", color: "#fff" }}>{props.badge}</span>}
        </div>
        {props.lines.map((l, i) => <div key={i} style={{ fontSize: 13.5, color: "var(--text2)" }}>{l}</div>)}
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{props.progressLabel}</div>
        <div style={{ maxWidth: 160 }}><Bar value={props.value} /></div>
      </div>
      <Thumb src={props.thumb} size={96} fallback={props.fallback} />
    </button>
  );
}

export function ExerciseRow(props: { title: string; sub: string; done: boolean; thumb?: string | null; fallback?: string; onTap: () => void; onOpen?: () => void; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 18, border: `1px solid ${props.active ? "var(--focus)" : "var(--border)"}`, background: props.active ? "var(--accent-subtle)" : "var(--card)", boxShadow: "var(--shadow)" }}>
      <button onClick={props.onOpen || props.onTap} aria-label={`Show ${props.title}`} style={{ border: "none", padding: 0, background: "transparent", cursor: "pointer" }}><Thumb src={props.thumb} size={60} fallback={props.fallback} /></button>
      <button onClick={props.onOpen || props.onTap} style={{ flex: 1, border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", color: "var(--text)", display: "grid", gap: 4 }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, textDecoration: props.done ? "line-through" : "none", color: props.done ? "var(--text2)" : "var(--text)" }}>{props.title}</span>
        <span style={{ fontSize: 13, color: "var(--text2)" }}>{props.sub}</span>
        <Bar value={props.done ? 1 : 0} height={5} />
      </button>
      <button onClick={props.onTap} aria-label={props.done ? `Untick ${props.title}` : `Tick ${props.title}`} style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: 22, border: `2px solid ${props.done ? "var(--primary)" : "var(--border-strong)"}`, background: props.done ? "var(--primary)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{props.done ? Icon.check : null}</button>
    </div>
  );
}

export function MenuRow(props: { emoji: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={props.onClick} style={{ width: "100%", minHeight: 64, display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 18, background: "var(--card)", boxShadow: "var(--shadow)", cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
      <span aria-hidden style={{ width: 42, height: 42, borderRadius: 14, background: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flex: "0 0 auto" }}>{props.emoji}</span>
      <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{props.title}</span>{props.sub && <span style={{ display: "block", fontSize: 13, color: "var(--text2)" }}>{props.sub}</span>}</span>
      <span style={{ color: "var(--text3)" }}>{Icon.chev}</span>
    </button>
  );
}

export function SectionTitle(props: { children: ReactNode; action?: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "6px 2px 0" }}><div style={{ fontSize: 19, fontWeight: 800 }}>{props.children}</div>{props.action}</div>;
}
