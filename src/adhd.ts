// ADHD-friendly helpers: never-miss-twice streaks, XP levels, minimums, variable rewards, drill rotation.
// Pure functions only (no React) so they can be unit-tested with plain Node.

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
export function isoDay(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function plusDays(d: Date, n: number): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
/** ISO date of the Monday that starts d's week. */
export function weekKey(d: Date): string { return isoDay(plusDays(d, -((d.getDay() + 6) % 7))); }

export interface StreakInfo {
  /** Days done inside the current chain (today counts once it is done). */
  streak: number;
  /** Misses in a row right now (0 or 1 while the chain is alive). */
  missRun: number;
  /** True when this week's freeze is still unused. */
  freezeLeft: boolean;
  /** Dates a freeze covered. */
  frozen: string[];
  /** Days done out of the last 14 (today included). */
  last14: number;
}

/**
 * Never-miss-twice streak.
 * - A single missed day never ends the chain.
 * - Two misses in a row end it, unless the week's freeze (1 per Mon-Sun week) covers the second miss.
 * - Today is "pending" until it is done, so an unfinished today never counts as a miss.
 */
export function streakInfo(test: (d: Date) => boolean, today: Date, lookback = 400): StreakInfo {
  let chain = 0; let missRun = 0;
  const used = new Set<string>(); const frozen: string[] = [];
  for (let i = lookback; i >= 1; i--) {
    const d = plusDays(today, -i);
    if (test(d)) { chain += 1; missRun = 0; continue; }
    if (chain === 0) continue;
    const wk = weekKey(d);
    if (missRun >= 1 && !used.has(wk)) { used.add(wk); frozen.push(isoDay(d)); continue; }
    missRun += 1;
    if (missRun >= 2) { chain = 0; missRun = 0; }
  }
  if (test(today)) { chain += 1; missRun = 0; }
  let last14 = 0;
  for (let i = 0; i < 14; i++) if (test(plusDays(today, -i))) last14 += 1;
  return { streak: chain, missRun, freezeLeft: !used.has(weekKey(today)), frozen, last14 };
}

// ---------- Levels (named by mph milestones, advanced by XP) ----------
export const LEVELS: { name: string; mph: number; xp: number }[] = [
  { name: "98 Start", mph: 98, xp: 0 },
  { name: "100", mph: 100, xp: 2500 },
  { name: "102", mph: 102, xp: 5000 },
  { name: "105", mph: 105, xp: 8000 },
  { name: "108", mph: 108, xp: 12000 },
  { name: "110 Goal", mph: 110, xp: 16000 },
];
export const MILESTONES = [100, 102, 105, 108, 110];
export function levelOf(xp: number) {
  let i = 0;
  LEVELS.forEach((l, j) => { if (xp >= l.xp) i = j; });
  const cur = LEVELS[i]; const next = LEVELS[i + 1];
  const frac = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { idx: i, cur, next, frac, toNext: next ? next.xp - xp : 0 };
}
export const XP = { item: 10, full: 20, min: 10, extra: 5, log: 15, test: 30, pr: 50 };

// ---------- Minimum versions ----------
export const MIN_MOBILITY_IDS = ["d9090", "dbook", "s2f"];
export const MINIMUMS: Record<string, string> = {
  mobility: "5 min: 90/90 hip switches, open books, slow-to-fast swings (3 key moves), then the 4-min hip mini-block.",
  speed: "5 max-intent swings, then log your best speed.",
  strengthA: "Primer: light trap bar jump 2 x 3, then trap bar deadlift 2 x 5 (about 10 min).",
  strengthB: "Primer: step-in overhead throw 2 x 5, then bench press 2 x 6 (about 10 min).",
  strength: "Primer + 1 main lift x 2 sets (about 10 min).",
  wedges: "10-ball mini-ladder: 2 balls each to 5 targets of today's ladder.",
  putting: "Make 10 in a row from 3 ft.",
  sim: "9 holes, front tees, no driver.",
  hipmini: "2 moves, 1 set each: half-kneeling hip IR + supine 90/90 IR (2 min).",
  hips: "The first 2 moves, 1 set each (about 2 min).",
  recovery: "10-min easy walk.",
  review: "Answer the 3 review questions (5 min); prep can wait.",
};
/** Planned minutes for a Minimum, used by the session timer. */
export const MIN_MINUTES: Record<string, number> = { mobility: 5, speed: 5, strength: 10, wedges: 10, putting: 5, sim: 40, hipmini: 2, hips: 2, recovery: 10, review: 5 };

// ---------- Variable rewards ----------
export const BADGES: { id: string; name: string; desc: string; icon: string }[] = [
  { id: "earlybird", name: "Early bird", desc: "Started before the phone", icon: "sun" },
  { id: "showedup", name: "Showed up", desc: "Did the session, even on a meh day", icon: "check" },
  { id: "ironhips", name: "Iron hips", desc: "Hip work keeps stacking up", icon: "layers" },
  { id: "ladder", name: "Ladder climber", desc: "Wedge distances dialed", icon: "target" },
  { id: "icewater", name: "Ice water", desc: "Steady putter under pressure", icon: "golf" },
  { id: "speedhunter", name: "Speed hunter", desc: "Max intent, full rest", icon: "gauge" },
  { id: "cleanstop", name: "Clean stop", desc: "Stopped when the plan said stop", icon: "timer" },
  { id: "nevertwice", name: "Never twice", desc: "Bounced back after a miss", icon: "trend" },
  { id: "grinder", name: "Grinder", desc: "Quiet reps add up", icon: "workout" },
  { id: "simshark", name: "Sim shark", desc: "Approach shots on lock", icon: "golf" },
];
export const FACTS: string[] = [
  "Rule of thumb: each extra 1 mph of driver club speed is worth about 2.5 yards of carry.",
  "PGA Tour players average roughly 115 mph of driver club speed; LPGA players about 94 mph.",
  "Speed work is best done fresh: max-intent swings early, full rest between sets.",
  "Sleep is when new motor skills get consolidated, so tonight's bedtime is part of today's training.",
  "Light overspeed clubs (the idea behind TheStack) teach your body to move faster than your normal driver lets it.",
  "Tour players make about 99% of their 3-footers. Ten in a row is how you get there.",
  "Most 3-putts start with a poor lag. Distance control saves more strokes than a perfect line.",
  "Hip internal rotation lets you turn into your lead side; limited range often shows up as a stalled turn.",
];
export const BONUS_GAMES: { id: string; kind: "wedge" | "putt"; name: string; how: string }[] = [
  { id: "ladderflag", kind: "wedge", name: "Ladder to the flag", how: "Start at 30 yd. Move up 10 yd only when the ball finishes within 15% of the distance. Count the balls it takes to reach 100 yd." },
  { id: "worstball", kind: "wedge", name: "Worst-ball wedge", how: "Hit 2 balls to each of 5 distances and play the worse one. Score how many worse balls still land in the hit window." },
  { id: "updown9", kind: "wedge", name: "Up-and-down 9", how: "9 chips or pitches from different lies, then putt out. Score up-and-downs out of 9." },
  { id: "flagclock", kind: "wedge", name: "Flag clock", how: "Pick one flag. Hit from 12, 3, 6 and 9 o'clock around it at 40-60 yd. One point for each ball inside 15 ft." },
  { id: "aroundworld", kind: "putt", name: "Around-the-world putting", how: "6 balls in a circle at 3 ft. Make all 6 to move out to 4 ft, then 5 ft. A miss restarts that ring." },
  { id: "threetwoone", kind: "putt", name: "3-2-1 putting", how: "Make 3 from 3 ft, 2 from 6 ft, then 1 from 9 ft in a row. A miss sends you back to the start." },
  { id: "par18", kind: "putt", name: "Par-18 putting", how: "9 holes on the practice green, par 2 each. Beat 18." },
  { id: "lagclock", kind: "putt", name: "Lag clock", how: "Lag from 20, 30 and 40 ft. Every ball that stops within a putter length scores 1. Beat your last score." },
];
export const TREATS: string[] = [
  "Treat yourself: 20 guilt-free minutes of anything you like tonight.",
  "Treat yourself: your favorite coffee tomorrow morning.",
  "Treat yourself: put $5 in the gear fund (new glove, sleeve of balls).",
  "Treat yourself: make a new playlist for the next speed session.",
  "Treat yourself: pick any course you want for the next sim round.",
];
export interface Reward { kind: "badge" | "fact" | "bonus" | "treat"; id: string; title: string; body: string; icon: string; }
/** ~40% chance of a reward. `rnd` is injectable for tests. */
export function rollReward(owned: string[], rnd: () => number = Math.random): Reward | null {
  if (rnd() >= 0.4) return null;
  const left = BADGES.filter((b) => owned.indexOf(b.id) < 0);
  const kinds: Reward["kind"][] = left.length ? ["badge", "fact", "bonus", "treat"] : ["fact", "bonus", "treat"];
  const kind = kinds[Math.floor(rnd() * kinds.length) % kinds.length];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
  if (kind === "badge") { const b = pick(left); return { kind, id: b.id, title: `Badge unlocked: ${b.name}`, body: `${b.desc}. It's on your badge shelf in More.`, icon: "award" }; }
  if (kind === "fact") { const i = Math.floor(rnd() * FACTS.length) % FACTS.length; return { kind, id: `fact${i}`, title: "Fun fact", body: FACTS[i], icon: "bulb" }; }
  if (kind === "bonus") { const g = pick(BONUS_GAMES); return { kind, id: g.id, title: `Bonus drill unlocked: ${g.name}`, body: g.how, icon: "spark" }; }
  const i = Math.floor(rnd() * TREATS.length) % TREATS.length;
  return { kind, id: `treat${i}`, title: "Nice work", body: TREATS[i], icon: "gift" };
}

// ---------- 3-week drill rotation ----------
export const ROTATION: { wedge: string; putt: string }[] = [
  { wedge: "ladderflag", putt: "aroundworld" },
  { wedge: "worstball", putt: "threetwoone" },
  { wedge: "updown9", putt: "par18" },
  { wedge: "flagclock", putt: "lagclock" },
];
export function rotationBlock(startIso: string, today: Date): { idx: number; num: number; wedge: typeof BONUS_GAMES[0]; putt: typeof BONUS_GAMES[0]; dayInBlock: number; nextStart: Date } {
  const p = startIso.split("-").map((x) => Number(x));
  const start = new Date(p[0], p[1] - 1, p[2]);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.max(0, Math.round((t.getTime() - start.getTime()) / 86400000));
  const idx = Math.floor(diff / 21);
  const r = ROTATION[idx % ROTATION.length];
  const g = (id: string) => BONUS_GAMES.find((x) => x.id === id) || BONUS_GAMES[0];
  return { idx, num: idx + 1, wedge: g(r.wedge), putt: g(r.putt), dayInBlock: diff - idx * 21 + 1, nextStart: plusDays(start, (idx + 1) * 21) };
}

// ---------- If-then plans ----------
export const IF_THEN_DEFAULT: string[] = [
  "If the alarm goes off at 6:00, then feet on floor and start the mobility timer before the phone.",
  "If I feel lazy at 6:30, then I do just the minimum.",
  "If it's 9:00 PM, then phone goes on the charger outside the bedroom.",
  "If I miss a day, then tomorrow is the minimum, no catch-up.",
  "If I'm past the planned end, the timer ends it.",
];

// ---------- Optional daily extras ----------
export const EXTRAS: { id: string; label: string }[] = [
  { id: "daylight", label: "Morning daylight within 30 min of waking" },
  { id: "protbreak", label: "Protein breakfast before work" },
  { id: "dock", label: "Phone docked by 9:00" },
];

export const WHY_SOURCES: { title: string; site: string; href: string }[] = [
  { title: "Lally et al. 2010: How habits form in the real world (missing one day did not derail habit formation)", site: "doi.org", href: "https://doi.org/10.1002/ejsp.674" },
  { title: "Gawrilow & Gollwitzer 2008: If-then plans improve response inhibition in ADHD", site: "doi.org", href: "https://doi.org/10.1007/s10608-007-9150-1" },
  { title: "Xu et al. 2026: Exercise and executive function in adults with ADHD (meta-analysis)", site: "europepmc.org", href: "https://europepmc.org/article/med/41638541" },
  { title: "Marx et al. 2022: Time perception in ADHD (meta-analysis)", site: "pubmed.ncbi.nlm.nih.gov", href: "https://pubmed.ncbi.nlm.nih.gov/34923055/" },
  { title: "Hupfeld et al. 2019: Hyperfocus in adult ADHD", site: "pubmed.ncbi.nlm.nih.gov", href: "https://pubmed.ncbi.nlm.nih.gov/30267329/" },
  { title: "CHADD: ADHD and sleep disorders", site: "chadd.org", href: "https://chadd.org/about-adhd/adhd-and-sleep-disorders-diagnosis-and-management/" },
  { title: "Beaton et al. 2022: Self-compassion and mental health in adults with ADHD", site: "pmc.ncbi.nlm.nih.gov", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9790285/" },
];

// ---------- Soft chime (Web Audio) ----------
let ac: any = null;
export function chime() {
  try {
    const C: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return;
    ac = ac || new C();
    if (ac.state === "suspended") ac.resume();
    const t0 = ac.currentTime;
    [880, 1318.5].forEach((f, i) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      const s = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.12, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.9);
      o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + 0.95);
    });
  } catch (_e) {}
}
