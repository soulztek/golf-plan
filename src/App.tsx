// @ts-nocheck
import {
  Page, Section, Text, Callout, BulletList, Steps, Table, Rows, Properties, Segmented, Select, Input, Button,
  LineChart, Columns, CalendarHeatmap, DayView, Metrics, LinkCards, Fragment, useState, useEffect, useMemo, useGrokTheme,
} from "./kit";
import { DemoBlock, demoKind, demoThumb } from "./Demo";
import { BottomNav, Hero, HeroTitle, ScreenTitle, StatCard, CategoryCard, WorkoutCard, ExerciseRow, MenuRow, SectionTitle, Chip, Bar, Icon, PHOTO, I, IconDot, Tick, CARD, NAV_H, NAV_BOTTOM } from "./Shell";
import { DEMOS, FEDB_USED } from "./demos.generated";

type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type CheckKey = "wake" | "mobility" | "strength" | "speed" | "wedges" | "putting" | "sim" | "eighteen" | "nine" | "hips" | "hipmini" | "recovery" | "review" | "protein" | "water" | "screens" | "bed";
type Tab = "today" | "drills" | "stretch" | "plan" | "phases" | "log" | "assess" | "food";
type LogKind = "speed" | "ball" | "bench" | "trap" | "score18" | "score9" | "hcp";
type DrillGroup = "Power" | "Golf" | "Hips";
type RoutineKey = "daily" | "dailylift" | "warmup" | "sunday";
interface Drill { id: string; group: DrillGroup; name: string; days: DayKey[]; when: string; time: string; reps: string; cue: string; pass: string; credit?: string; }
interface GameDef { id: string; name: string; scoring: string; higher: boolean; days: DayKey[]; }
interface RoundStats { score?: string; gir?: string; putts?: string; focus?: string; }
interface Move { id: string; name: string; rounds: number; hold?: number; reps?: string; sides: boolean; secs: number; cue: string; area: string; }
interface Routine { label: string; when: string; start: number; moves: Move[]; }
interface Ex { name: string; dose: string; rest: string; load: string; min: number; }
interface Session { name: string; key?: CheckKey; start: number; goal: string; items: Ex[]; }
type Part = { kind: "stretch"; routine: RoutineKey; start: number } | { kind: "session"; s: Session };
interface Block { s: number; e: number; t: string; k?: CheckKey; routine?: RoutineKey; }
interface DayPlan { key: DayKey; focus: string; am: string; pm: string; checks: CheckKey[]; labels: Partial<Record<CheckKey, string>>; parts: Part[]; testing?: boolean; }
interface DayRec { c: Partial<Record<CheckKey, boolean>>; energy?: number; focus?: number; notes?: string; win?: string; fix?: string; next?: string; stretch?: Record<string, boolean>; drills?: Record<string, boolean>; round?: RoundStats; }
interface LogEntry { date: string; kind: LogKind; value: number; note?: string; }
interface AssessRec { date: string; results: Record<string, string>; }
interface GameRec { date: string; id: string; score: number; }
interface TestRec { date: string; v: Record<string, string>; }
interface WedgeRec { date: string; ladder: "A" | "B"; hits: number[]; shots: number[]; done?: boolean; }
interface Store { days: Record<string, DayRec>; logs: LogEntry[]; assess: AssessRec[]; games: GameRec[]; tests: TestRec[]; wedge: WedgeRec[]; startDate?: string; seeded?: boolean; }

const STORE_KEY = "golf-speed-plan-v1";
const TZ = "America/New_York";
// Current wall-clock time in New York, as a local Date (so getDay/getHours read NY time).
function nyNow(): Date {
  try { return new Date(new Date().toLocaleString("en-US", { timeZone: TZ })); } catch (_e) { return new Date(); }
}

const BASELINE_SWINGS = [
  { label: "#1", value: 93.5 }, { label: "#2", value: 94.5 }, { label: "#3", value: 91.5 }, { label: "#4", value: 95 },
  { label: "#5", value: 98 }, { label: "#6", value: 98 }, { label: "#7", value: 93 }, { label: "#8", value: 94 },
];
const BASELINE_NOTE = "Barefoot, indoors, air swings with no ball. On-course speed in shoes, hitting a ball, may read slightly different.";
const SEED_LOG: LogEntry = { date: "2026-10-21", kind: "speed", value: 98, note: "Baseline: TheStack R-Speed max, GT2 driver, barefoot air swings" };

const TESTING_DATES = ["2026-11-18", "2026-12-16", "2027-01-13", "2027-02-10"];
const TEST_FIELDS: { id: string; label: string }[] = [
  { id: "rspeed", label: "TheStack R-Speed max (mph, barefoot air swings)" },
  { id: "rclub", label: "Rapsodo club speed with a ball (mph)" },
  { id: "rball", label: "Rapsodo ball speed (mph)" },
  { id: "broad", label: "Broad jump, best of 3 (inches)" },
  { id: "rotL", label: "Rotational slam ball throw, left side (ft)" },
  { id: "rotR", label: "Rotational slam ball throw, right side (ft)" },
  { id: "chest", label: "Seated chest pass, best of 3 (ft)" },
  { id: "toetouch", label: "Toe touch (fingertips to toes? or inches short)" },
  { id: "aslrL", label: "Active straight-leg raise, left (degrees, phone angle app)" },
  { id: "aslrR", label: "Active straight-leg raise, right (degrees)" },
  { id: "mob", label: "Mobility score (note Pliability or GOWOD)" },
];
const BASELINE_TEST: TestRec = { date: "2026-10-21", v: { rspeed: "98" } };

function mv(id: string, name: string, rounds: number, hold: number | undefined, reps: string | undefined, sides: boolean, secs: number | undefined, area: string, cue: string): Move {
  const total = hold ? rounds * hold * (sides ? 2 : 1) : secs || 60;
  return { id, name, rounds, hold, reps, sides, secs: total, cue, area };
}
function doseOf(m: Move): string {
  if (m.hold) return `${m.rounds} x ${m.hold}s${m.sides ? "/side" : ""}`;
  return `${m.rounds} x ${m.reps || ""}`;
}
const B1 = "Block 1 · Open up";
const B2 = "Block 2 · Strengthen the range";
const B3 = "Block 3 · Use it fast";
const DAILY_MOVES: Move[] = [
  mv("d9090", "90/90 hip switches", 2, undefined, "6/side, 2-breath hold at each end", true, 120, `${B1} · Hips`, "Tall chest; rotate knees side to side, breathe twice at end range."),
  mv("spider", "Spiderman stretch with reach", 1, undefined, "5/side", true, 70, `${B1} · Hips + T-spine`, "Big lunge, hand inside the foot, then reach the same arm to the ceiling."),
  mv("dbook", "Open books", 1, undefined, "5/side, 5-count hold", true, 75, `${B1} · Thoracic rotation`, "Knees stacked and pinned; hold 5 counts open, eyes follow the hand."),
  mv("dham", "Banded lying hamstring stretch (30-45 s)", 2, 35, undefined, true, undefined, `${B1} · Hamstrings (tight)`, "Band around the foot, knee straight, ease in; hold 30-45 s, no bouncing."),
  mv("aslr", "Banded active straight-leg raise", 2, undefined, "8/side, 3 s lowering", true, 80, `${B1} · Hamstrings (active range)`, "Lying, band loops the raised foot for a light assist; lift the straight leg with the other leg pinned down, lower over 3 s."),
  mv("liftoff", "90/90 hip lift-offs", 2, undefined, "5/side, 3 s holds", true, 90, `${B2} · Hip rotation strength`, "In 90/90, lift the back knee and foot off the floor; hold 3 s."),
  mv("bandir", "Seated banded hip internal rotation", 2, undefined, "12/side", true, 90, `${B2} · Hip internal rotation`, "Band around the ankle; knee stays still while the foot rotates out."),
  mv("pallof", "Half-kneeling Pallof press with rotation", 2, undefined, "8/side", true, 90, `${B2} · Core anti-rotation`, "Press out, rotate the chest away from the anchor, come back slow."),
  mv("slrdlslow", "Kettlebell single-leg RDL, slow lower", 2, undefined, "6/side, 3 s down", true, 110, `${B2} · Hamstrings + balance`, "Light KB; hips square, 3 s lowering builds strength through length. Drop this move if you are sore."),
  mv("bander9090", "90/90 band external rotation", 2, undefined, "10/arm", true, 90, `${B2} · Shoulders`, "Elbow at shoulder height, rotate back to vertical and lower slowly."),
  mv("stepover", "Banded lateral step-overs", 1, undefined, "10/side", true, 50, `${B3} · Hip stability`, "Mini band around calves, hands on hips, step over low blocks, hips level."),
  mv("rotthrow", "Split-stance rotational slam ball throws", 2, undefined, "4/side", true, 120, `${B3} · Rotational power`, "Light slam ball into a wall; fast hips, then torso. Skip on Tue/Thu."),
  mv("s2f", "Slow-to-fast swings, hold the finish", 1, undefined, "5 swings", false, 75, `${B3} · Swing speed`, "Start at half speed and build each swing; hold the finish for 3 s."),
];
const DAILY_LIFT_MOVES: Move[] = DAILY_MOVES.filter((m) => m.id !== "rotthrow");
const WARMUP_MOVES: Move[] = [
  mv("swingfb", "Leg swings, front to back", 1, undefined, "10/side", true, 30, "Hips + hamstrings", "Hold a wall; relaxed, growing range."),
  mv("swingss", "Leg swings, side to side", 1, undefined, "10/side", true, 30, "Hip adductors", "Toes forward, swing across the body."),
  mv("lungerot", "Reverse lunge with rotation", 1, undefined, "5/side", true, 45, "Hip flexors + T-spine", "Turn the chest over the front leg."),
  mv("pullapart", "Band pull-apart", 1, undefined, "15 reps", false, 30, "Upper back", "Straight arms, squeeze shoulder blades."),
  mv("wuer", "Band external rotation", 1, undefined, "10/side", true, 40, "Shoulders", "Elbow at side, smooth reps."),
  mv("latwalk", "Band lateral walk (band above knees)", 1, undefined, "10 steps each way", false, 30, "Glute activation", "Knees push out, small steps, stay low."),
  mv("halo", "Kettlebell halo (light KB)", 1, undefined, "5 each direction", false, 30, "Shoulders + T-spine", "Ribs down; circle the bell close to the head."),
  mv("clubturn", "Club-across-shoulders turns", 1, undefined, "10/side", true, 30, "Thoracic rotation", "Golf posture, turn the chest, hips quiet."),
  mv("buildup", "Build-up swings", 1, undefined, "5 swings, 50% to 80%", false, 35, "Swing", "Smooth; save max effort for the session."),
];
const SUNDAY_MOVES: Move[] = [
  mv("gf", "GolfForever mobility session (pick one in the app)", 1, undefined, "8 min", false, 480, "Full body", "Easy range; follow the app's pace."),
  mv("s9090", "90/90 hip switch", 2, 45, undefined, true, undefined, "Hip internal + external rotation", "Tall chest; pause 3 s at each end."),
  mv("fig4", "Figure-4 stretch (lying)", 2, 30, undefined, true, undefined, "Hip external rotation", "Pull the uncrossed thigh toward you; back flat."),
  mv("wiper", "Lying hip windshield wipers", 2, undefined, "10/side", true, 60, "Hip internal rotation", "Feet wide, drop both knees side to side slowly."),
  mv("shipflex", "Half-kneeling hip flexor stretch", 2, 30, undefined, true, undefined, "Hip flexors", "Tuck pelvis, squeeze glute, reach the arm up."),
  mv("sham", "Band hamstring stretch (lying)", 2, 30, undefined, true, undefined, "Hamstrings", "Knee straight; ease in, no bouncing."),
  mv("thread", "Thread the needle", 2, 20, undefined, true, undefined, "Thoracic rotation", "Slide the arm under; let the shoulder sink."),
  mv("childlat", "Child's pose side reach", 2, 30, undefined, true, undefined, "Lats", "Walk both hands to one side; breathe into the ribs."),
  mv("sankle", "Knee-to-wall ankle rock", 2, undefined, "10/side", true, 90, "Ankles", "Heel down; move the foot back as it gets easy."),
  mv("slbridge", "Single-leg glute bridge", 2, undefined, "8/side", true, 90, "Glute activation", "Hips level; push through the heel."),
  mv("legswall", "Legs up the wall, slow breathing", 1, 120, undefined, false, undefined, "Recovery", "Breathe in 4 s, out 6 s."),
];
const ROUTINES: Record<RoutineKey, Routine> = {
  daily: { label: "Daily mobility + strength (20 min)", when: "Every morning at 6:10; on TheStack days (Mon, Wed, Sat) it is your warm-up", start: 6 + 10 / 60, moves: DAILY_MOVES },
  dailylift: { label: "Daily mobility + strength, lift-day version (18 min)", when: "Tue and Thu at 6:10; block 3 throws skipped because the strength primer has throws", start: 6 + 10 / 60, moves: DAILY_LIFT_MOVES },
  warmup: { label: "5-min dynamic warm-up", when: "Before the Mon round (12:55) and Fri round (3:00), and on Testing Day", start: 12 + 55 / 60, moves: WARMUP_MOVES },
  sunday: { label: "Sunday long stretch", when: "Sunday at 7:30, optional", start: 7.5, moves: SUNDAY_MOVES },
};
function routineSecs(r: RoutineKey): number { return ROUTINES[r].moves.reduce((a, m) => a + m.secs, 0); }
function at(s: Omit<Session, "start">, start: number): Session { return { ...s, start }; }
function sessMin(s: Session): number { return s.items.reduce((a, e) => a + e.min, 0); }

const SPEED: Omit<Session, "start"> = {
  name: "TheStack speed", key: "speed",
  goal: "The 20-min daily routine plus the hip mini-block is your warm-up. Follow the TheStack app's session for your stage: full intent, full rest. Stop if speed falls off hard or anything pinches. Score: best club speed.",
  items: [
    { name: "Build-up swings", dose: "5 swings", rest: "15 s", load: "Driver or lightest Stack weight, 60% to 90%", min: 3 },
    { name: "TheStack session as prescribed in the app", dose: "Per app", rest: "Per app (full rest between max swings)", load: "Stack weights for your stage", min: 20 },
    { name: "Speed-to-course transfer on Rapsodo", dose: "5 max drives with a ball", rest: "30-60 s", load: "Driver, shoes on", min: 5 },
    { name: "Log best club speed + ball speed", dose: "2 entries", rest: "-", load: "Log tab", min: 2 },
  ],
};
const STRENGTH_A: Omit<Session, "start"> = {
  name: "Strength A: trap bar + bench", key: "strength",
  goal: "Injury safety: warm up first (daily routine + ramp-up sets), stop 2 reps short of failure, flat back on every hinge, no pain. Trap bar deadlift is the main hinge; the RDL stays light. Power primer first (19 min): max effort on every rep, full rest, stop a set when reps slow down. Then lift at RPE 6-7 and add weight only when every rep is clean. Hamstrings: add a little load or 1 rep every 1-2 weeks; stop if you cramp or feel sharp pain.",
  items: [
    { name: "Primer: light trap bar jump", dose: "3 x 3-5", rest: "90 s", load: "Empty trap bar or bar + 10 lb plates; max intent, soft landing", min: 5 },
    { name: "Primer: lateral bound / skater", dose: "3 x 4/side", rest: "60 s", load: "Bodyweight; stick each landing 2 s", min: 4 },
    { name: "Primer: single-leg RDL to knee drive + small hop", dose: "3 x 5/side", rest: "45 s", load: "Bodyweight weeks 1-2, then a light KB", min: 5 },
    { name: "Primer: step-behind rotational shot-put throw", dose: "3 x 4/side", rest: "60 s", load: "6-10 lb slam ball into a wall, max intent", min: 5 },
    { name: "Ramp-up sets (trap bar + bench)", dose: "2 x 5 each", rest: "30 s", load: "Empty bar", min: 3 },
    { name: "Trap bar deadlift", dose: "3 x 5", rest: "2 min", load: "95-115 lb total in week 1, RPE 5-6; +10 lb/week", min: 9 },
    { name: "Bench press (superset: RDL in the rest)", dose: "3 x 5", rest: "2 min", load: "90-95 lb (65-70% of 135), RPE 6-7; +5 lb/week", min: 10 },
    { name: "Hamstrings: barbell Romanian deadlift, 3 s lowering", dose: "3 x 8", rest: "In bench rest (about 90 s)", load: "Bar + 10 lb total (5 lb per side), RPE 5; flat back, bar close to the legs, lower only to a hamstring stretch. +5-10 lb every 1-2 weeks only if form is perfect and no pain. Alternative: single 25-35 lb KB RDL, same rules", min: 4 },
    { name: "Hamstrings: band-assisted eccentric Nordic curl (or slider/banded curl)", dose: "3 x 4-6", rest: "60 s", load: "Kneel on a pad, feet anchored; lower over 3-5 s with a band from above for help, push back up with hands. Slider curl if Nordics are too much", min: 5 },
    { name: "Goblet lateral lunge", dose: "2 x 5-6/side", rest: "45 s", load: "Light KB (12-16 kg), sit into the hip", min: 4 },
  ],
};
const STRENGTH_B: Omit<Session, "start"> = {
  name: "Strength B: upper + rotational power (moderate legs)", key: "strength",
  goal: "Injury safety: warm up first (daily routine + ramp-up sets), stop 2 reps short of failure, flat back, no pain. Round tomorrow, so lower-body volume is cut: 2 sets of jumps and light split squats. Upper body and rotational power stay full. Max effort on power reps, full rest.",
  items: [
    { name: "Primer: step-in overhead throw (Greg Rose lead-leg progression)", dose: "3 x 5", rest: "60 s", load: "6-10 lb slam ball; weeks 1-2 kneeling, 3-4 standing, then step-in", min: 4 },
    { name: "Primer: golf-swing scoop toss into wall", dose: "3 x 4/side", rest: "60 s", load: "6-10 lb slam ball, max intent", min: 5 },
    { name: "Primer: kneeling jump to squat (swap if knees/landing feel off)", dose: "2 x 4", rest: "60 s", load: "Bodyweight, pad under knees. Swaps, same 2 min: pause squat jump 2 x 4 (2 s pause at the bottom); countermovement jump 2 x 5 (stick the landing); light trap bar jump 2 x 4 (bar + about 20 lb); KB swing 2 x 8 (snap the hips); half-kneeling slam ball scoop toss 2 x 4/side (rotate from the hips)", min: 2 },
    { name: "Primer: low box/bench jump holding slam ball", dose: "2 x 3", rest: "60 s", load: "Light slam ball; low box; step down", min: 2 },
    { name: "Ramp-up bench sets", dose: "2 x 5", rest: "30 s", load: "Empty bar", min: 3 },
    { name: "Bench press", dose: "3 x 6", rest: "2 min", load: "85-90 lb, RPE 6", min: 10 },
    { name: "Seated/supine slam ball chest pass (in bench rest)", dose: "3 x 5", rest: "Rest of the 2 min", load: "6-10 lb slam ball, max intent", min: 2 },
    { name: "Barbell bent-over row", dose: "3 x 8", rest: "90 s", load: "65-75 lb, flat back", min: 7 },
    { name: "Barbell split squat (light)", dose: "2 x 6/side", rest: "90 s", load: "Bodyweight or empty bar, RPE 6 max", min: 5 },
    { name: "Plyo push-up", dose: "3 x 5", rest: "60 s", load: "Hands on a bench to start; floor once easy", min: 3 },
    { name: "Hamstrings: single-leg glute bridge or hamstring bridge walkouts", dose: "2 x 8/side (walkouts: 2 x 8 steps)", rest: "45 s", load: "Bodyweight only; no heavy hinge today (round tomorrow); lower slowly", min: 4 },
  ],
};
const HIP_SAFETY = "Stop if you feel pinching or pain in the front of the hip.";
const HIP_BLOCK: Omit<Session, "start"> = {
  name: "Hip block (10 min)", key: "hips",
  goal: `Active hip rotation and control, from the hip videos you shared. Slow, controlled reps. ${HIP_SAFETY}`,
  items: [
    { name: "Active half-kneeling hip internal rotation (skip if done in morning)", dose: "2 x 8/side, 2 s hold at end", rest: "-", load: "Bodyweight; pelvis still, feel the outer glute. If skipped, use the time for banded rockbacks 1 x 10/side", min: 2 },
    { name: "Quadruped band-resisted hip internal rotation (skip if done in morning)", dose: "2 x 10/side", rest: "-", load: "Light band at the ankle; tuck tailbone slightly, no low-back twist. If skipped, use the time for the anti-valgus split squat 2 x 6/side", min: 2 },
    { name: "Supine 90/90 active hip internal rotation (skip if done in morning)", dose: "2 x 10", rest: "-", load: "Bodyweight; knees together, feet fan out. If skipped, finish early", min: 2 },
    { name: "Counterbalanced banded squat", dose: "2 x 8", rest: "-", load: "Mini band at knees, light KB or plate held out front; push knees out", min: 2 },
    { name: "Copenhagen side plank on bench (short lever)", dose: "2 x 15-20 s/side", rest: "-", load: "Knee on bench first, progress to foot later", min: 2 },
  ],
};
const HIP_MINI: Omit<Session, "start"> = {
  name: "Daily hip mini-block (4 min)", key: "hipmini",
  goal: `Right after the daily mobility routine, every day. 1 set each, slow and controlled. ${HIP_SAFETY}`,
  items: [
    { name: "Active half-kneeling hip internal rotation", dose: "1 x 8/side, 2 s hold at end", rest: "-", load: "Bodyweight; pelvis still, feel the outer glute", min: 1 },
    { name: "Quadruped band-resisted hip internal rotation", dose: "1 x 10/side", rest: "-", load: "Light band at the ankle; no low-back twist", min: 1 },
    { name: "Supine 90/90 active hip internal rotation", dose: "1 x 10", rest: "-", load: "Bodyweight; knees together, feet fan out", min: 1 },
    { name: "Supine isometric hip flexion (knee into hands)", dose: "1 round: 3 x 10 s/side", rest: "-", load: "Bodyweight; no movement", min: 1 },
  ],
};
const HIP_PRIMER: Omit<Session, "start"> = {
  name: "Pre-round hip primer (4 min)", key: "hips",
  goal: `Wakes up hip rotation before the round. ${HIP_SAFETY}`,
  items: [
    { name: "Active half-kneeling hip internal rotation", dose: "1 x 8/side, 2 s hold", rest: "-", load: "Bodyweight", min: 1.5 },
    { name: "Supine 90/90 active hip internal rotation", dose: "1 x 10", rest: "-", load: "Bodyweight (use a mat or towel)", min: 1 },
    { name: "Supine isometric hip flexion (knee into hands)", dose: "3 x 10 s/side", rest: "-", load: "Bodyweight", min: 1.5 },
  ],
};
const HAM_SAT: Omit<Session, "start"> = {
  name: "Optional hamstring add-on (10 min)",
  goal: "Optional, after TheStack. Slow 3 s lowering on every rep. Add a little load or reps every 1-2 weeks; stop if you cramp or feel sharp pain.",
  items: [
    { name: "KB single-leg RDL, 3 s lowering", dose: "2 x 6/side", rest: "45 s", load: "Light to moderate KB (12-20 kg), hips square", min: 5 },
    { name: "Banded hamstring curl", dose: "2 x 12", rest: "45 s", load: "Lying face down, band anchored low around the ankle; 3 s return", min: 5 },
  ],
};
const WEDGE_LADDERS: Record<"A" | "B", { targets: number[]; shots: number }> = {
  A: { targets: [10, 30, 50, 70, 90, 110], shots: 5 },
  B: { targets: [20, 40, 60, 80, 100], shots: 6 },
};
const winOf = (y: number): string => `${Math.round(y * 0.9)}-${Math.round(y * 1.1)}`;
const WEDGE30: Omit<Session, "start"> = {
  name: "Rapsodo wedge ladder (30 min, A/B alternating)", key: "wedges",
  goal: "Sessions alternate Ladder A (10, 30, 50, 70, 90, 110 yd) and Ladder B (20, 40, 60, 80, 100 yd); the app picks the next one. A hit is a carry within 10% of the target (50 yd = 45-55). Score: hits out of 30 shots (session %), saved on Today and shown on the Log tab.",
  items: [
    { name: "Warm-up wedges", dose: "8-10 easy balls", rest: "-", load: "Wedges, build to full speed", min: 5 },
    { name: "Ladder A or B with the hit counter", dose: "A: 6 targets x 5 shots; B: 5 targets x 6 shots (30 shots either way)", rest: "Full routine each ball, about 50 s per shot", load: "Hit = carry within ±10% of target; tap Hit or Miss on Today", min: 25 },
  ],
};
const PUTT20: Omit<Session, "start"> = {
  name: "Putting (20 min)", key: "putting",
  goal: "Score: attempts needed to make 10 in a row from 3 ft (10 is perfect).",
  items: [
    { name: "Gate drill", dose: "3-4 ft through a tee gate", rest: "-", load: "Putter, 2 tees", min: 5 },
    { name: "Lag ladder 10, 20, 30 ft", dose: "Rounds of 3 balls per distance", rest: "-", load: "Finish within 18 in", min: 10 },
    { name: "Make 10 in a row from 3 ft", dose: "Restart the count on a miss", rest: "-", load: "Log attempts", min: 5 },
  ],
};
const SIM18: Omit<Session, "start"> = {
  name: "GSPro sim 18 (light, front tees, no driver)", key: "sim",
  goal: "Low-stress approach and putting practice. Track greens hit and average proximity, not score. Now and then move back a tee or add driver for a challenge. Saturday works as a swap day.",
  items: [
    { name: "18 holes, front tees, no driver", dose: "18 holes, one ball", rest: "-", load: "Irons, wedges, putter; full routine on approaches", min: 75 },
    { name: "Log GIR + average proximity", dose: "2 entries", rest: "-", load: "Today tab", min: 5 },
  ],
};
const ROUND18: Omit<Session, "start"> = {
  name: "Monday 18 holes (tee about 1:15 PM)", key: "eighteen",
  goal: "One focus all round. Snack at the turn and keep drinking water. Done about 5:15; light dinner after and nothing else this evening. Score: your 18-hole score.",
  items: [
    { name: "Putts + easy swings", dose: "10 putts, 10 swings", rest: "-", load: "Putter, wedge to driver", min: 11 },
    { name: "18 holes", dose: "18 holes", rest: "-", load: "One focus; track GIR and putts if you like", min: 240 },
    { name: "Save round score", dose: "1 entry", rest: "-", load: "Today tab", min: 2 },
  ],
};
const ROUND9: Omit<Session, "start"> = {
  name: "Friday 9 holes (tee about 3:15 PM)", key: "nine",
  goal: "9 holes until spring: sunset is about 5 PM after the Nov 1 clock change. Switch back to 18 when daylight allows (around mid-March). One focus. Score: your 9-hole score.",
  items: [
    { name: "Putts + easy swings", dose: "10 putts, 10 swings", rest: "-", load: "Putter, wedge to driver", min: 6 },
    { name: "9 holes", dose: "9 holes", rest: "-", load: "One focus; track GIR and putts if you like", min: 120 },
    { name: "Save round score", dose: "1 entry", rest: "-", load: "Today tab", min: 2 },
  ],
};
const WALK: Omit<Session, "start"> = { name: "Recovery walk", key: "recovery", goal: "Easy pace, no hard training today.", items: [{ name: "Easy walk", dose: "1 x 30 min", rest: "-", load: "Conversational pace", min: 30 }] };
const REVIEW: Omit<Session, "start"> = {
  name: "Weekly review + meal prep", key: "review",
  goal: "Answer the three review questions on the Today tab, then cook ahead for Monday and Tuesday.",
  items: [
    { name: "Weekly review (Today tab)", dose: "3 questions", rest: "-", load: "-", min: 10 },
    { name: "Book next week's tee times", dose: "Mon 18 at about 1:15 PM; Fri 9 at about 3:15 PM (18 again from about mid-March)", rest: "-", load: "-", min: 5 },
    { name: "Meal prep", dose: "Protein + carbs for 2-3 days", rest: "-", load: "-", min: 45 },
  ],
};
const TESTS_AM: Omit<Session, "start"> = {
  name: "Testing Day tests", key: "speed",
  goal: "Same order, same ball and same setup every Testing Day so the numbers compare. Measure throws and jumps with a tape. Enter everything on the Tests tab.",
  items: [
    { name: "TheStack R-Speed test", dose: "8 swings", rest: "30-60 s", load: "GT2, barefoot, air swings (same as baseline)", min: 8 },
    { name: "Rapsodo drives with a ball", dose: "5 max drives", rest: "30-60 s", load: "Driver, shoes on; best club + ball speed", min: 7 },
    { name: "Broad jump", dose: "3 attempts", rest: "60 s", load: "Bodyweight; best distance in inches", min: 5 },
    { name: "Rotational slam ball throw for distance", dose: "3/side", rest: "60 s", load: "Same slam ball every test; best each side in feet", min: 7 },
    { name: "Seated chest pass for distance", dose: "3 attempts", rest: "60 s", load: "Same slam ball; best in feet", min: 5 },
    { name: "Toe touch + active straight-leg raise", dose: "1 check each, ASLR both sides", rest: "-", load: "Phone angle app for ASLR degrees", min: 3 },
    { name: "Enter results", dose: "1 entry", rest: "-", load: "Tests tab", min: 3 },
  ],
};
const MOBTEST: Omit<Session, "start"> = {
  name: "Mobility score test (Pliability or GOWOD)", key: "mobility",
  goal: "GOWOD advises testing at least 2 hours after waking with no mobility work beforehand, so today's routine is only the 5-min warm-up.",
  items: [{ name: "Phone-app mobility test", dose: "1 test", rest: "-", load: "Pliability (about 3 min) or GOWOD (about 12-15 min)", min: 15 }],
};
const T = (h: number, m: number): number => h + m / 60;

const PLAN: Record<DayKey, DayPlan> = {
  Mon: {
    key: "Mon", focus: "TheStack + 18 holes",
    am: "6:10-6:30 mobility, 6:30-6:34 hip mini-block, 6:34-7:04 TheStack",
    pm: "Free from 1 PM: 12:55 warm-up, 1:00 hip primer, tee about 1:15, 18 holes done about 5:15, light dinner, quiet evening",
    checks: ["wake", "mobility", "hipmini", "speed", "hips", "eighteen", "protein", "water", "screens", "bed"],
    labels: { hipmini: "Daily hip mini-block, 4 min (6:30)", speed: "TheStack (6:34)", hips: "Pre-round hip primer, 4 min (1:00)", eighteen: "18 holes, tee about 1:15 PM (warm-up 12:55)" },
    parts: [
      { kind: "stretch", routine: "daily", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 30)) },
      { kind: "session", s: at(SPEED, T(6, 34)) },
      { kind: "stretch", routine: "warmup", start: T(12, 55) },
      { kind: "session", s: at(HIP_PRIMER, T(13, 0)) },
      { kind: "session", s: at(ROUND18, T(13, 4)) },
    ],
  },
  Tue: {
    key: "Tue", focus: "Strength A + putting + sim 18",
    am: "6:10-6:28 mobility (no throws), 6:28-6:32 hip mini-block, 6:32-7:26 Strength A (with hamstrings)",
    pm: "4:30-4:50 putting, 6:45-8:05 GSPro sim 18",
    checks: ["wake", "mobility", "hipmini", "strength", "putting", "sim", "protein", "water", "screens", "bed"],
    labels: { mobility: "Mobility + strength, 18 min (6:10, no throws)", hipmini: "Daily hip mini-block, 4 min (6:28)", strength: "Strength A + power primer (6:32)", putting: "Putting 20 min (4:30)", sim: "GSPro sim 18, front tees, no driver (6:45)" },
    parts: [
      { kind: "stretch", routine: "dailylift", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 28)) },
      { kind: "session", s: at(STRENGTH_A, T(6, 32)) },
      { kind: "session", s: at(PUTT20, T(16, 30)) },
      { kind: "session", s: at(SIM18, T(18, 45)) },
    ],
  },
  Wed: {
    key: "Wed", focus: "TheStack + wedges + putting",
    am: "6:10-6:30 mobility, 6:30-6:34 hip mini-block, 6:34-7:04 TheStack, 7:04-7:14 hip block",
    pm: "4:30-5:00 wedges, 5:00-5:20 putting",
    checks: ["wake", "mobility", "hipmini", "speed", "hips", "wedges", "putting", "protein", "water", "screens", "bed"],
    labels: { hipmini: "Daily hip mini-block, 4 min (6:30)", speed: "TheStack (6:34; lower effort if legs are sore)", hips: "Hip block, 10 min (7:04)", wedges: "Wedge ladder 30 min (4:30)", putting: "Putting 20 min (5:00)" },
    parts: [
      { kind: "stretch", routine: "daily", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 30)) },
      { kind: "session", s: at(SPEED, T(6, 34)) },
      { kind: "session", s: at(HIP_BLOCK, T(7, 4)) },
      { kind: "session", s: at(WEDGE30, T(16, 30)) },
      { kind: "session", s: at(PUTT20, T(17, 0)) },
    ],
  },
  Thu: {
    key: "Thu", focus: "Strength B (moderate legs) + wedges + sim 18",
    am: "6:10-6:28 mobility (no throws), 6:28-6:32 hip mini-block, 6:32-7:19 Strength B",
    pm: "4:30-5:00 wedges, 6:45-8:05 GSPro sim 18",
    checks: ["wake", "mobility", "hipmini", "strength", "wedges", "sim", "protein", "water", "screens", "bed"],
    labels: { mobility: "Mobility + strength, 18 min (6:10, no throws)", hipmini: "Daily hip mini-block, 4 min (6:28)", strength: "Strength B, moderate legs (6:32)", wedges: "Wedge ladder 30 min (4:30)", sim: "GSPro sim 18, front tees, no driver (6:45)" },
    parts: [
      { kind: "stretch", routine: "dailylift", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 28)) },
      { kind: "session", s: at(STRENGTH_B, T(6, 32)) },
      { kind: "session", s: at(WEDGE30, T(16, 30)) },
      { kind: "session", s: at(SIM18, T(18, 45)) },
    ],
  },
  Fri: {
    key: "Fri", focus: "Light morning + 9 holes",
    am: "6:10-6:30 mobility, 6:30-6:34 hip mini-block (no TheStack, no extra lifting)",
    pm: "Free from 3 PM: 3:00 warm-up, 3:05 hip primer, tee about 3:15, 9 holes done about 5:15 (back to 18 around mid-March)",
    checks: ["wake", "mobility", "hipmini", "hips", "nine", "protein", "water", "screens", "bed"],
    labels: { hipmini: "Daily hip mini-block, 4 min (6:30)", hips: "Pre-round hip primer, 4 min (3:05)", nine: "9 holes, tee about 3:15 PM (warm-up 3:00)" },
    parts: [
      { kind: "stretch", routine: "daily", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 30)) },
      { kind: "stretch", routine: "warmup", start: T(15, 0) },
      { kind: "session", s: at(HIP_PRIMER, T(15, 5)) },
      { kind: "session", s: at(ROUND9, T(15, 9)) },
    ],
  },
  Sat: {
    key: "Sat", focus: "TheStack + wedges + putting",
    am: "6:10-6:30 mobility, 6:30-6:34 hip mini-block, 6:34-7:04 TheStack, 7:04-7:14 hip block, 7:14-7:24 optional hamstrings, 7:30-8:20 wedges + putting",
    pm: "Free (swap option: one GSPro sim 18 here instead of Tue or Thu)",
    checks: ["wake", "mobility", "hipmini", "speed", "hips", "wedges", "putting", "protein", "water", "screens", "bed"],
    labels: { hipmini: "Daily hip mini-block, 4 min (6:30)", speed: "TheStack (6:34)", hips: "Hip block, 10 min (7:04)", wedges: "Wedge ladder 30 min (7:30)", putting: "Putting 20 min (8:00)" },
    parts: [
      { kind: "stretch", routine: "daily", start: T(6, 10) },
      { kind: "session", s: at(HIP_MINI, T(6, 30)) },
      { kind: "session", s: at(SPEED, T(6, 34)) },
      { kind: "session", s: at(HIP_BLOCK, T(7, 4)) },
      { kind: "session", s: at(HAM_SAT, T(7, 14)) },
      { kind: "session", s: at(WEDGE30, T(7, 30)) },
      { kind: "session", s: at(PUTT20, T(8, 0)) },
    ],
  },
  Sun: {
    key: "Sun", focus: "Rest + review",
    am: "7:00 walk, 7:30-7:56 long stretch, 7:56-8:00 hip mini-block",
    pm: "4:30-5:30 weekly review + meal prep",
    checks: ["wake", "mobility", "hipmini", "recovery", "review", "protein", "water", "screens", "bed"],
    labels: { wake: "Up by 6:30 (weekend grace)", mobility: "Sunday long stretch (7:30)", hipmini: "Daily hip mini-block, 4 min (7:56)" },
    parts: [
      { kind: "session", s: at(WALK, T(7, 0)) },
      { kind: "stretch", routine: "sunday", start: T(7, 30) },
      { kind: "session", s: at(HIP_MINI, T(7, 56)) },
      { kind: "session", s: at(REVIEW, T(16, 30)) },
    ],
  },
};
const TEST_PLAN: DayPlan = {
  key: "Wed", focus: "Testing Day + wedges + putting",
  am: "6:25 warm-up, 6:30-7:08 tests, 9:00 mobility score, 9:15 hip mini-block",
  pm: "4:30-5:00 wedges, 5:00-5:20 putting",
  checks: ["wake", "mobility", "hipmini", "speed", "wedges", "putting", "protein", "water", "screens", "bed"],
  labels: { hipmini: "Daily hip mini-block, 4 min (9:15, after the mobility test)", speed: "Testing Day tests (6:30)", mobility: "Mobility score test (9:00, Pliability or GOWOD)", wedges: "Wedge ladder 30 min (4:30)", putting: "Putting 20 min (5:00)" },
  testing: true,
  parts: [
    { kind: "stretch", routine: "warmup", start: T(6, 25) },
    { kind: "session", s: at(TESTS_AM, T(6, 30)) },
    { kind: "session", s: at(MOBTEST, T(9, 0)) },
    { kind: "session", s: at(HIP_MINI, T(9, 15)) },
    { kind: "session", s: at(WEDGE30, T(16, 30)) },
    { kind: "session", s: at(PUTT20, T(17, 0)) },
  ],
};
function planFor(dateIso: string, key: DayKey): DayPlan { return TESTING_DATES.indexOf(dateIso) >= 0 ? TEST_PLAN : PLAN[key]; }
const DAY_ORDER: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const JS_DAYS: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BASE_LABELS: Record<string, string> = {
  nine: "9 holes", hips: "Hip block", hipmini: "Daily hip mini-block, 4 min", wake: "Up by 6:00",
  mobility: "Mobility + strength routine, 20 min (6:10)", strength: "Strength session", speed: "TheStack speed (6:34)",
  wedges: "Wedge ladder 30 min", putting: "Putting 20 min", sim: "GSPro sim 18 (light)", eighteen: "18 holes",
  recovery: "Recovery walk 30 min", review: "Weekly review + meal prep", protein: "Protein at every meal",
  water: "Water: 3 bottles", screens: "Screens off by 9:45 (after check-in)", bed: "In bed by 10:00",
};

function partStart(p: Part): number { return p.kind === "stretch" ? p.start : p.s.start; }
function partEnd(p: Part): number { return p.kind === "stretch" ? p.start + routineSecs(p.routine) / 3600 : p.s.start + sessMin(p.s) / 60; }
function partBlock(p: Part): Block {
  if (p.kind === "stretch") return { s: p.start, e: partEnd(p), t: ROUTINES[p.routine].label, k: p.routine === "warmup" ? undefined : "mobility", routine: p.routine };
  return { s: p.s.start, e: partEnd(p), t: p.s.name, k: p.s.key };
}
function nightBlocks(): Block[] {
  return [
    { s: 21, e: 21.5, t: "Wind-down: lights low, gear out for tomorrow" },
    { s: 21.5, e: 21.75, t: "Evening check-in in this app (chat reminder about 9:30 PM)" },
    { s: 21.75, e: 22, t: "Screens off; read or breathe", k: "screens" },
    { s: 22, e: 22.5, t: "Lights out", k: "bed" },
  ];
}
function fillGaps(bs: Block[], from: number, to: number, label: string): Block[] {
  const inside = bs.filter((b) => b.e > from && b.s < to).sort((a, b) => a.s - b.s);
  const out: Block[] = [];
  let t = from;
  inside.forEach((b) => { if (b.s - t > 0.08) out.push({ s: t, e: b.s, t: label }); t = Math.max(t, b.e); });
  if (to - t > 0.08) out.push({ s: t, e: to, t: label });
  return out;
}
function buildBlocks(p: DayPlan): Block[] {
  const parts = p.parts.map(partBlock);
  const am = p.parts.filter((x) => partStart(x) < 7.4);
  const pm = p.parts.filter((x) => partStart(x) >= 12);
  const amEnd = am.reduce((m, x) => Math.max(m, partEnd(x)), 6.5);
  const pmEnd = pm.reduce((m, x) => Math.max(m, partEnd(x)), 16.5);
  let fixed: Block[] = [];
  if (p.key === "Sat") {
    fixed = [
      { s: 6, e: T(6, 10), t: "Wake: water, daylight (morning plan reminder about 6:00 AM)", k: "wake" },
      { s: T(7, 24), e: 7.5, t: "Protein breakfast (quick: shake or yogurt; eat more after putting)", k: "protein" },
    ];
    const all = [...fixed, ...parts];
    fixed = [...fixed, ...fillGaps(all, 8 + 20 / 60, 21, "Free day (swap option: GSPro sim 18 this evening); refill water")];
  } else if (p.key === "Sun") {
    fixed = [
      { s: 6.5, e: T(6, 40), t: "Wake by 6:30: water, daylight (reminder about 6:00 AM)", k: "wake" },
      { s: T(6, 40), e: 7, t: "Protein breakfast", k: "protein" },
      { s: 8, e: 16.5, t: "Free day; refill water through the day", k: "water" },
      { s: 17.5, e: 21, t: "Free time" },
    ];
  } else {
    fixed = [
      { s: 6, e: T(6, 10), t: "Wake: water, daylight, open Today (reminder about 6:00 AM)", k: "wake" },
      { s: amEnd, e: 8, t: "Shower + protein breakfast", k: "protein" },
    ];
    if (p.testing) {
      fixed.push({ s: 8, e: 9, t: "Open time: errands, prep lunch" });
      fixed.push({ s: T(9, 19), e: 9.75, t: "Open time" });
    } else {
      fixed.push({ s: 8, e: 9.75, t: "Open time: errands, a walk, prep lunch" });
    }
    fixed.push({ s: 9.75, e: 10, t: "Refill water bottle, settle in" });
    const pmBlocks = pm.map(partBlock);
    let freeFrom = 16.5;
    let freeLabel = "Free time";
    let dinner: Block = { s: 18, e: 18.75, t: "Dinner" };
    if (p.key === "Mon") {
      fixed.push({ s: 10, e: T(12, 55), t: "Work until about 1:00 (early lunch with protein, fill 2 water bottles for the round)", k: "water" });
      dinner = { s: 17.5, e: T(18, 15), t: "Light dinner" };
      freeFrom = T(12, 55);
      freeLabel = "Quiet evening: nothing else planned";
    } else if (p.key === "Fri") {
      fixed.push({ s: 10, e: 15, t: "Work until 3:00 (protein lunch, refill water at lunch)", k: "water" });
      freeFrom = 15;
    } else {
      fixed.push({ s: 10, e: 16, t: "Work: protein lunch, refill water at lunch and 2:00", k: "water" });
      fixed.push({ s: 16, e: 16.5, t: "Snack + change for the evening" });
      const coversDinner = pmBlocks.some((b) => b.s < 18.75 && b.e > 18);
      if (coversDinner) dinner = { s: pmEnd, e: Math.min(pmEnd + 0.4, 21), t: "Light dinner" };
    }
    fixed.push(dinner);
    fixed = [...fixed, ...fillGaps([...pmBlocks, dinner], freeFrom, 21, freeLabel)];
  }
  return [...fixed, ...parts, ...nightBlocks()].sort((a, b) => a.s - b.s);
}

const LOG_KINDS: { value: LogKind; label: string; unit: string }[] = [
  { value: "speed", label: "Driver club speed (mph)", unit: "mph" },
  { value: "ball", label: "Driver ball speed, Rapsodo (mph)", unit: "mph" },
  { value: "bench", label: "Bench working weight (lb)", unit: "lb" },
  { value: "trap", label: "Trap bar working weight (lb)", unit: "lb" },
  { value: "score18", label: "18-hole score", unit: "" },
  { value: "score9", label: "9-hole score", unit: "" },
  { value: "hcp", label: "Handicap index", unit: "" },
];

const REELS = "From reels you shared";
const HIPV1 = "From the hip videos you shared";
const HIPV2 = HIPV1;
const PWR = "Max effort, full rest";
const ALL7: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DRILLS: Drill[] = [
  { id: "trapjump", group: "Power", name: "Light trap bar jump", days: ["Tue"], when: "Strength A primer, 6:32", time: "5 min", reps: "3 x 3-5, 90 s rest", cue: "Empty bar or bar + 10s; jump tall, land soft with hips back, reset each rep.", pass: `All sets fast and soft. ${PWR}.` },
  { id: "bound", group: "Power", name: "Lateral bound / skater", days: ["Tue"], when: "Strength A primer, 6:37", time: "4 min", reps: "3 x 4/side, 60 s rest", cue: "Push off the outside foot, land on the other, stick it for 2 s.", pass: `Every landing stuck with the knee over the foot. ${PWR}.` },
  { id: "slrdl", group: "Power", name: "Single-leg RDL to knee drive + small hop", days: ["Tue"], when: "Strength A primer, 6:41", time: "5 min", reps: "3 x 5/side, 45 s rest", cue: "Hinge on one leg, drive the back knee up, add a small hop. Bodyweight or a light KB first.", pass: "All reps balanced with quiet landings.", credit: REELS },
  { id: "shotput", group: "Power", name: "Step-behind rotational shot-put throw", days: ["Tue"], when: "Strength A primer, 6:46", time: "5 min", reps: "3 x 4/side, 60 s rest", cue: "Step the back foot behind, load the back hip, throw the slam ball into a wall from the chest.", pass: `All throws at full speed. ${PWR}.` },
  { id: "hamrdl", group: "Power", name: "Hamstrings: barbell Romanian deadlift, 3 s lowering", days: ["Tue"], when: "Strength A, in the bench rests (about 7:03)", time: "4 min", reps: "3 x 8, RPE 5, bar + 10 lb (5 lb per side)", cue: "Bar close to the legs, soft knees, push hips back, lower over 3 s only to a hamstring stretch with a flat back. Add 5-10 lb every 1-2 weeks only if form is perfect and nothing hurts. Alternative: single 25-35 lb KB RDL.", pass: "All sets with a flat back and 3 s lowering. Stop if you cramp or feel sharp pain." },
  { id: "hamnordic", group: "Power", name: "Hamstrings: band-assisted eccentric Nordic curl (or slider/banded curl)", days: ["Tue"], when: "Strength A, after the RDLs (about 7:17)", time: "5 min", reps: "3 x 4-6, 60 s rest", cue: "Kneel on a pad, feet anchored, band from above for help; lower over 3-5 s, catch with your hands, push back up. Use slider or banded curls if Nordics are too much.", pass: "All reps lowered under control. Stop if you cramp or feel sharp pain." },
  { id: "latlunge", group: "Power", name: "Goblet lateral lunge", days: ["Tue"], when: "Strength A, last exercise (about 7:22)", time: "4 min", reps: "2 x 5-6/side, 45 s rest", cue: "Sit into one hip, other leg straight, chest tall; push back to the middle.", pass: "All reps to a comfortable depth with heels down." },
  { id: "stepin", group: "Power", name: "Step-in overhead throw (Greg Rose lead-leg drill)", days: ["Thu"], when: "Strength B primer, 6:32", time: "4 min", reps: "3 x 5, 60 s rest", cue: "Progress kneeling, then standing, then a step-in with the lead leg; throw the slam ball overhead into a wall.", pass: `15 fast throws at your current stage. ${PWR}.` },
  { id: "scoop", group: "Power", name: "Golf-swing scoop toss into wall", days: ["Thu"], when: "Strength B primer, 6:36", time: "5 min", reps: "3 x 4/side, 60 s rest", cue: "Golf posture, load the trail hip, rotate hard and release the ball into the wall.", pass: `All tosses at full speed, both sides. ${PWR}.` },
  { id: "kneeljump", group: "Power", name: "Kneeling jump to squat (or a swap below)", days: ["Thu"], when: "Strength B primer, 6:41 (2 sets: round tomorrow)", time: "2 min", reps: "2 x 4, 60 s rest", cue: "Pad under knees. Kneel tall, swing arms, pop feet under you into a squat. Swap if knees/landing feel off: pause squat jump, countermovement jump, light trap bar jump, KB swing, or half-kneeling scoop toss (each is tickable under Drills > Power); tick this drill too when the swap is done.", pass: "8 reps landing balanced in a squat, or one swap done.", credit: REELS },
  { id: "swap_pause", group: "Power", name: "Swap option: pause squat jump", days: [], when: "Swap option, Thu 6:41: instead of the kneeling jump (same 2 min); 3 x 4 when used as a full primer", time: "2 min", reps: "2 x 4 Thu (3 x 4 full), 60 s rest", cue: "Squat down, pause 2 s at the bottom, then jump straight up and land soft.", pass: "Swap if knees/landing feel off. All reps landed quietly." },
  { id: "swap_cmj", group: "Power", name: "Swap option: countermovement jump", days: [], when: "Swap option, Thu 6:41: instead of the kneeling jump (same 2 min); 3 x 5 when used as a full primer", time: "2 min", reps: "2 x 5 Thu (3 x 5 full), 60 s rest", cue: "Quick dip, arms swing, jump tall; stick the landing for 2 s.", pass: "Swap if knees/landing feel off. Every landing stuck." },
  { id: "swap_trap", group: "Power", name: "Swap option: light trap bar jump", days: [], when: "Swap option, Thu 6:41: instead of the kneeling jump (same 2 min); 3 x 4 when used as a full primer", time: "2 min", reps: "2 x 4 Thu (3 x 4 full), bar + about 20 lb (20-30% of trap bar working weight)", cue: "Hips back, jump tall, land soft and reset every rep.", pass: "Swap if knees/landing feel off. All reps fast and soft." },
  { id: "swap_swing", group: "Power", name: "Swap option: kettlebell swing (no landing)", days: [], when: "Swap option, Thu 6:41: instead of the kneeling jump (same 2 min); 3 x 8 when used as a full primer", time: "2 min", reps: "2 x 8 Thu (3 x 8 full), 12-16 kg KB", cue: "Hinge, then snap the hips forward; the bell floats to chest height, flat back.", pass: "Swap if knees/landing feel off. All reps crisp with a flat back." },
  { id: "swap_scoop", group: "Power", name: "Swap option: half-kneeling slam ball scoop toss", days: [], when: "Swap option, Thu 6:41: instead of the kneeling jump (same 2 min), for rotation with no landing", time: "2 min", reps: "2 x 4/side, 60 s rest, 6-8 lb slam ball", cue: "Half-kneeling, side to the wall; rotate from the hips and throw the ball into the wall.", pass: "Swap if knees/landing feel off. All tosses fast, both sides." },
  { id: "boxjump", group: "Power", name: "Low box/bench jump holding a slam ball", days: ["Thu"], when: "Strength B primer, 6:43 (never on TheStack days)", time: "2 min", reps: "2 x 3, 60 s rest", cue: "Slam ball at chest, jump onto a low box or bench, land soft, then step down.", pass: "6 soft, quiet landings.", credit: REELS },
  { id: "chestpass", group: "Power", name: "Seated/supine slam ball chest pass", days: ["Thu"], when: "Strength B, in the rest after each bench set", time: "2 min", reps: "3 x 5", cue: "Seated against a wall or lying down; push the ball up or out as fast as you can.", pass: `15 fast passes. ${PWR}.` },
  { id: "splitsq", group: "Power", name: "Barbell split squat (light)", days: ["Thu"], when: "Strength B, moderate legs (about 7:07)", time: "5 min", reps: "2 x 6/side, 90 s rest", cue: "Torso tall, front heel down, back knee lowers under the hip. Bodyweight or empty bar only.", pass: "Both sets at RPE 6 or easier.", credit: REELS },
  { id: "plyopush", group: "Power", name: "Plyo push-up", days: ["Thu"], when: "Strength B finisher (about 7:12)", time: "3 min", reps: "3 x 5, 60 s rest", cue: "Hands on a bench to start; push hard enough that the hands leave, land soft.", pass: `15 explosive reps. ${PWR}.` },
  { id: "hambridge", group: "Power", name: "Hamstrings: single-leg glute bridge or bridge walkouts", days: ["Thu"], when: "Strength B, last exercise (about 7:15)", time: "4 min", reps: "2 x 8/side, 45 s rest", cue: "Bodyweight only, no heavy hinge (round tomorrow); hips level, lower slowly.", pass: "Both sets done without cramping." },
  { id: "hamslrdl", group: "Power", name: "Optional: KB single-leg RDL, 3 s lowering", days: ["Sat"], when: "After the hip block, 7:14", time: "5 min", reps: "2 x 6/side, 45 s rest", cue: "Hips square, slow lowering; add load every 1-2 weeks.", pass: "Both sets balanced. Stop if you cramp or feel sharp pain." },
  { id: "hamcurl", group: "Power", name: "Optional: banded hamstring curl", days: ["Sat"], when: "After the hip block, 7:19", time: "5 min", reps: "2 x 12, 45 s rest", cue: "Face down, band anchored low around the ankle; curl, then 3 s return.", pass: "24 smooth reps. Stop if you cramp or feel sharp pain." },
  { id: "hip1", group: "Hips", name: "Active half-kneeling hip internal rotation", days: ALL7, when: "Daily hip mini-block (1 x 8/side, after the 6:10 routine); also Mon/Fri pre-round primer. Wed/Sat hip block: skip if done in morning", time: "2 min (primer: 1 x 8/side)", reps: "2 x 8/side, 2 s hold at end", cue: "Keep the pelvis still and feel the outer glute working.", pass: "All reps with a 2 s end hold and no pinching.", credit: HIPV1 },
  { id: "hip2", group: "Hips", name: "Quadruped band-resisted hip internal rotation", days: ALL7, when: "Daily hip mini-block (1 x 10/side). Wed/Sat hip block: skip if done in morning", time: "1 min daily (2 min in the hip block)", reps: "1 x 10/side daily (2 x 10/side in the hip block), light band at the ankle", cue: "Tuck the tailbone slightly first; no low-back twist.", pass: "All reps with a quiet low back.", credit: HIPV1 },
  { id: "hip3", group: "Hips", name: "Supine 90/90 active hip internal rotation", days: ALL7, when: "Daily hip mini-block (1 x 10); also Mon/Fri pre-round primer. Wed/Sat hip block: skip if done in morning", time: "2 min (primer: 1 x 10)", reps: "2 x 10", cue: "Knees together, feet fan out to the sides.", pass: "All reps smooth with no pinching.", credit: HIPV1 },
  { id: "hip5", group: "Hips", name: "Counterbalanced banded squat", days: ["Wed", "Sat"], when: "Hip block, 7:10", time: "2 min", reps: "2 x 8, mini band at knees, light KB or plate out front", cue: "Push the knees out into the band all the way down.", pass: "All reps with knees tracking over the toes.", credit: HIPV2 },
  { id: "hip8", group: "Hips", name: "Copenhagen side plank on bench (short lever)", days: ["Wed", "Sat"], when: "Hip block, 7:12 (never Thu or Sun)", time: "2 min", reps: "2 x 15-20 s/side", cue: "Knee on the bench first; progress to the foot only when easy.", pass: "All holds with hips level, no groin pain.", credit: HIPV2 },
  { id: "hip6", group: "Hips", name: "Supine isometric hip flexion (knee into hands)", days: ALL7, when: "Daily hip mini-block; also Mon/Fri pre-round primer (Mon 1:02, Fri 3:07)", time: "1.5 min", reps: "3 x 10 s/side", cue: "Drive the knee into your hands while your hands push back; no movement.", pass: "All holds done with no front-of-hip pinch.", credit: HIPV2 },
  { id: "hip4", group: "Hips", name: "Banded hip rockbacks (half-kneel or lizard)", days: [], when: "Optional swap in the Wed/Sat hip block", time: "2 min", reps: "1 x 10/side, band pulling the thigh back", cue: "Lean away from the band as you rock back.", pass: "10 smooth rocks each side, no pinching.", credit: HIPV2 },
  { id: "hip7", group: "Hips", name: "Banded anti-valgus split squat", days: [], when: "Optional swap in the Wed/Sat hip block (never Thu or Sun)", time: "2 min", reps: "2 x 6/side, bodyweight", cue: "Don't let the knee cave into the band; weight on the front foot.", pass: "All reps with the knee over the foot.", credit: HIPV2 },
  { id: "transfer", group: "Golf", name: "Speed-to-course transfer", days: ["Mon", "Wed", "Sat"], when: "Right after TheStack, about 6:57", time: "5 min", reps: "5 max drives on Rapsodo with a ball", cue: "Shoes on, real ball, full routine, max intent.", pass: "Best club speed and ball speed logged on the Log tab." },
  { id: "wladder", group: "Golf", name: "Wedge ladder A/B (alternates each session)", days: ["Wed", "Thu", "Sat"], when: "Wedge session, after 5 min of warm-up balls", time: "25 min", reps: "A: 10, 30, 50, 70, 90, 110 yd x 5 shots; B: 20, 40, 60, 80, 100 yd x 6 shots (30 shots)", cue: "Full routine every ball; read the carry on Rapsodo. Hit = carry within 10% of the target (50 yd = 45-55). Tap Hit or Miss on Today.", pass: "All 30 shots logged; session % saved (shown on the Log tab)." },
  { id: "gate", group: "Golf", name: "Gate drill 3-4 ft", days: ["Tue", "Wed", "Sat"], when: "Start of putting", time: "5 min", reps: "Continuous putts through a tee gate", cue: "Two tees just wider than the putter head; start the ball through the gate.", pass: "5 minutes of clean starts through the gate." },
  { id: "lagladder", group: "Golf", name: "Lag ladder 10-20-30 ft", days: ["Tue", "Wed", "Sat"], when: "Middle of putting", time: "10 min", reps: "Rounds of 3 balls at each distance", cue: "Pace first; picture the ball dying at the hole.", pass: "Most putts finish within 18 in." },
  { id: "make10", group: "Golf", name: "Make 10 in a row from 3 ft", days: ["Tue", "Wed", "Sat"], when: "End of putting", time: "5 min", reps: "Restart on any miss", cue: "Same routine on every putt.", pass: "10 in a row made; attempts saved on Today." },
  { id: "sim18", group: "Golf", name: "GSPro sim 18: front tees, no driver", days: ["Tue", "Thu"], when: "6:45 PM (swap option: Saturday)", time: "80 min", reps: "18 holes, irons/wedges/putter", cue: "Light and low-stress: full routine on every approach. For a challenge, move back a tee or add driver.", pass: "GIR out of 18 and average proximity saved on Today." },
  { id: "round18", group: "Golf", name: "Monday 18 holes", days: ["Mon"], when: "Warm-up 12:55, tee about 1:15 PM, done about 5:15", time: "About 4 h", reps: "18 holes, one focus", cue: "Steady pace, snack at the turn, one focus all round.", pass: "Score saved on Today." },
  { id: "round9", group: "Golf", name: "Friday 9 holes (18 again from about mid-March)", days: ["Fri"], when: "Warm-up 3:00, tee about 3:15 PM, done about 5:15", time: "About 2 h", reps: "9 holes, one focus", cue: "Beat the 5 PM sunset: keep a steady pace, one focus.", pass: "Score saved on Today." },
];
const GAMES: GameDef[] = [
  { id: "make10", name: "Make 10 in a row", scoring: "Attempts needed (10 is perfect, lower is better)", higher: false, days: ["Tue", "Wed", "Sat"] },
  { id: "simgir", name: "Sim 18 greens hit", scoring: "Greens in regulation, out of 18", higher: true, days: ["Tue", "Thu"] },
  { id: "simprox", name: "Sim 18 proximity", scoring: "Average approach proximity in feet (lower is better)", higher: false, days: ["Tue", "Thu"] },
];
const SCREENS = [
  { id: "squat", name: "Overhead deep squat", how: "Club overhead, feet shoulder width, squat as deep as you can", good: "Arms stay over feet, heels down, hips below knees", fix: "Spiderman stretch with reach, KB single-leg RDL (slow), knee-to-wall ankle rock and child's pose side reach (Sunday)" },
  { id: "toe", name: "Toe touch", how: "Feet together, legs straight, reach down slowly", good: "Fingertips reach toes with no strain", fix: "Banded lying hamstring stretch and banded active straight-leg raise (daily), KB single-leg RDL (slow lower), Tuesday RDL + Nordic curls" },
  { id: "aslr", name: "Active straight-leg raise", how: "Lie on your back, both legs straight; lift one leg as high as you can, other leg stays flat", good: "Raised leg gets near vertical without the other knee bending; measure the angle each side", fix: "Banded active straight-leg raise and banded lying hamstring stretch (daily), slow RDLs and curls" },
  { id: "tilt", name: "Pelvic tilt", how: "Golf posture, hands on hips, tilt pelvis forward and back", good: "Smooth both ways, upper body stays still", fix: "Spiderman stretch, half-kneeling Pallof press, half-kneeling hip flexor stretch (Sunday)" },
  { id: "prot", name: "Pelvic rotation", how: "Golf posture, arms crossed, turn hips while shoulders stay still", good: "Hips turn freely without the chest moving", fix: "90/90 hip switches, 90/90 hip lift-offs, seated banded hip internal rotation, daily hip mini-block, windshield wipers (Sunday)" },
  { id: "trunk", name: "Seated trunk rotation", how: "Sit, club across chest, knees together, turn each way", good: "Even turn both sides; measure the angle", fix: "Open books, Pallof press with rotation, thread the needle (Sunday)" },
  { id: "er", name: "90/90 shoulder external rotation", how: "Golf posture, upper arm out at 90, elbow 90, rotate back", good: "Even both sides, no pain; measure the angle", fix: "90/90 band external rotation, child's pose side reach (Sunday)" },
  { id: "bal", name: "Single-leg balance", how: "Stand on one leg, eyes closed, time it", good: "Record seconds each leg; compare sides", fix: "KB single-leg RDL, banded lateral step-overs, single-leg glute bridge (Sunday)" },
];
const RESULT_OPTS = ["Not tested", "Pass", "Limited", "Pain (see a physio)"];

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function iso(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(d: Date, n: number): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
function shortDate(s: string): string { const p = s.split("-"); if (p.length < 3) return s; return `${Number(p[1])}/${Number(p[2])}`; }
function clockParts(h: number) { const total = Math.round(h * 60); const hh = Math.floor(total / 60) % 24; const mm = total % 60; const h12 = hh % 12 === 0 ? 12 : hh % 12; return { c: `${h12}:${pad(mm)}`, mer: hh < 12 ? "AM" : "PM" }; }
function fmtHour(h: number): string { const p = clockParts(h); return `${p.c} ${p.mer}`; }
function fmtRange(a: number, b: number): string { const x = clockParts(a); const y = clockParts(b); return x.mer === y.mer ? `${x.c}-${y.c} ${y.mer}` : `${x.c} ${x.mer}-${y.c} ${y.mer}`; }
function mmss(s: number): string { const v = Math.max(0, Math.round(s)); return `${Math.floor(v / 60)}:${pad(v % 60)}`; }
function emptyStore(): Store { return { days: {}, logs: [SEED_LOG], assess: [], games: [], tests: [], wedge: [], seeded: true }; }
function normalize(parsed: Partial<Store>): Store {
  const logs = parsed.logs || [];
  return { days: parsed.days || {}, logs: parsed.seeded ? logs : [SEED_LOG, ...logs], assess: parsed.assess || [], games: parsed.games || [], tests: parsed.tests || [], wedge: Array.isArray(parsed.wedge) ? parsed.wedge : [], startDate: parsed.startDate, seeded: true };
}
function loadStore(): { store: Store; ok: boolean } {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { store: emptyStore(), ok: true };
    return { store: normalize(JSON.parse(raw)), ok: true };
  } catch (_e) { return { store: emptyStore(), ok: false }; }
}
function dayScore(store: Store, d: Date): number {
  const rec = store.days[iso(d)];
  if (!rec) return 0;
  const plan = planFor(iso(d), JS_DAYS[d.getDay()]);
  return plan.checks.filter((k) => rec.c[k]).length / plan.checks.length;
}
function streakOf(test: (d: Date) => boolean, today: Date): number {
  let d = test(today) ? today : addDays(today, -1);
  let n = 0;
  while (n < 500 && test(d)) { n += 1; d = addDays(d, -1); }
  return n;
}
function thinLabels(labels: string[]): string[] {
  if (labels.length <= 8) return labels;
  const step = (labels.length - 1) / 5; const keep = new Set<number>();
  for (let i = 0; i <= 5; i++) keep.add(Math.round(i * step));
  return labels.map((l, i) => (keep.has(i) ? l : ""));
}
function stretchRows(r: RoutineKey, start: number): string[][] {
  let t = start;
  return ROUTINES[r].moves.map((m) => { const s = t; t += m.secs / 3600; return [fmtRange(s, t), m.name, doseOf(m), m.cue]; });
}
function sessionRows(s: Session): string[][] {
  let t = s.start;
  return s.items.map((e) => { const a = t; t += e.min / 60; return [fmtRange(a, t), e.name, `${e.dose}, rest ${e.rest}`, e.load]; });
}

function TapItem(props: { label: string; done: boolean; onTap: () => void; openLabel?: string; onOpen?: () => void; first?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "8px 0", borderTop: props.first ? "none" : "1px solid var(--border)" }}>
      <Tick done={props.done} onClick={props.onTap} label={props.done ? `Untick ${props.label}` : `Tick ${props.label}`} size={28} />
      <button onClick={props.onTap} style={{ flex: 1, minHeight: 38, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", fontSize: 15, lineHeight: "20px", color: props.done ? "var(--text3)" : "var(--text)", textDecoration: props.done ? "line-through" : "none", textDecorationColor: "var(--text3)" }}>{props.label}</button>
      {props.onOpen && (
        <button onClick={props.onOpen} style={{ flex: "0 0 auto", height: 34, padding: "0 14px 0 11px", borderRadius: 999, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>{I("play", 12)}{props.openLabel === "Start timer" ? "Timer" : props.openLabel || "Open"}</button>
      )}
    </div>
  );
}
function TapList(props: { items: { key: CheckKey; label: string; done: boolean }[]; onTap: (k: CheckKey) => void; onOpenMobility?: () => void }) {
  return (
    <div style={{ display: "grid", marginTop: -6, marginBottom: -6 }}>
      {props.items.map((it, i) => <TapItem key={it.key} first={i === 0} label={it.label} done={it.done} onTap={() => props.onTap(it.key)} openLabel="Start timer" onOpen={it.key === "mobility" ? props.onOpenMobility : undefined} />)}
    </div>
  );
}
function ProgressBar(props: { value: number; label: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, color: "var(--text3)" }}>{props.label}</div>
      <Bar value={props.value} height={6} />
    </div>
  );
}
function Rating(props: { label: string; value?: number; onPick: (n: number) => void }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, color: "var(--text3)" }}>{props.label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, padding: 4, borderRadius: 16, background: "var(--fill2)" }}>
        {[1, 2, 3, 4, 5].map((n) => { const on = props.value === n; return (
          <button key={n} onClick={() => props.onPick(n)} aria-pressed={on} style={{ height: 42, borderRadius: 12, cursor: "pointer", border: "none", background: on ? "var(--ink)" : "transparent", color: on ? "var(--on-ink)" : "var(--text2)", fontSize: 16, fontWeight: on ? 600 : 500, fontVariantNumeric: "tabular-nums" }}>{n}</button>
        ); })}
      </div>
    </div>
  );
}
function DrillList(props: { drills: Drill[]; done: Record<string, boolean>; onTap: (id: string) => void; showDays: boolean }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {props.drills.map((d) => { const on = !!props.done[d.id]; return (
        <div key={d.id} style={{ display: "grid", gap: 10, padding: 14, borderRadius: 18, background: on ? "var(--accent-subtle)" : "var(--bg)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Tick done={on} onClick={() => props.onTap(d.id)} label={on ? `Untick ${d.name}` : `Tick ${d.name}`} size={28} />
            <button onClick={() => props.onTap(d.id)} style={{ flex: 1, display: "grid", gap: 4, border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", color: "var(--text)" }}>
              <span style={{ fontSize: 15, lineHeight: "20px", fontWeight: 600, paddingTop: 4, color: on ? "var(--text3)" : "var(--text)" }}>{d.name}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "2px 0" }}><Chip icon={I("clock", 13)} label={d.time} /><span style={{ fontSize: 13, lineHeight: "18px", color: "var(--text)", paddingTop: 5 }}>{d.reps}</span></span>
              <span style={{ fontSize: 13.5, lineHeight: "19px", color: "var(--text2)" }}>{d.cue}</span>
              <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--text3)" }}>{`Done when: ${d.pass}`}</span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>{`${props.showDays && d.days.length > 0 ? `${d.days.length === 7 ? "Daily" : d.days.join(", ")} · ` : ""}${d.when}${d.credit ? ` · ${d.credit}` : ""}`}</span>
            </button>
          </div>
          {DEMOS[d.id] && <div style={{ paddingLeft: 40 }}><DemoBlock id={d.id} /></div>}
        </div>
      ); })}
    </div>
  );
}
function GoalText(props: { text: string }) {
  const [open, setOpen] = useState<boolean>(false);
  const long = props.text.length > 150;
  return (
    <div style={{ fontSize: 14, lineHeight: "20px", color: "var(--text2)" }}>
      <div className={long && !open ? "clamp3" : undefined}>{props.text}</div>
      {long && <button onClick={() => setOpen(!open)} style={{ border: "none", background: "transparent", padding: "4px 0 0", color: "var(--text)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>{open ? "Show less" : "Read more"}</button>}
    </div>
  );
}
function buzz() { try { if (navigator.vibrate) navigator.vibrate([200, 80, 200]); } catch (_e) {} }
function StretchPlayer(props: { moves: Move[]; done: Record<string, boolean>; onSet: (id: string, v: boolean) => void }) {
  const t = useGrokTheme();
  const moves = props.moves;
  const first = moves.findIndex((m) => !props.done[m.id]);
  const i0 = first < 0 ? 0 : first;
  const [idx, setIdx] = useState<number>(i0);
  const [left, setLeft] = useState<number>(moves[i0].secs);
  const [running, setRunning] = useState<boolean>(false);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setLeft((x) => x - 1), 1000); return () => window.clearInterval(id); }, [running]);
  useEffect(() => {
    if (running && left <= 0) {
      buzz();
      props.onSet(moves[idx].id, true);
      if (idx < moves.length - 1) { setIdx(idx + 1); setLeft(moves[idx + 1].secs); } else { setRunning(false); setLeft(0); }
    }
  }, [left, running]);
  const go = (i: number) => { const j = Math.max(0, Math.min(moves.length - 1, i)); setIdx(j); setLeft(moves[j].secs); setRunning(false); };
  const finish = () => { props.onSet(moves[idx].id, true); if (idx < moves.length - 1) { setIdx(idx + 1); setLeft(moves[idx + 1].secs); } else { setRunning(false); } };
  const m = moves[idx];
  const elapsed = m.secs - left;
  let phase = "";
  if (m.hold) {
    const per = m.sides ? 2 : 1;
    const seg = Math.min(m.rounds * per - 1, Math.floor(elapsed / m.hold));
    const round = Math.floor(seg / per) + 1;
    const side = m.sides ? (seg % 2 === 0 ? " · Left side" : " · Right side") : "";
    const segLeft = m.hold - (elapsed - seg * m.hold);
    phase = `Round ${round} of ${m.rounds}${side} · ${Math.max(0, Math.ceil(segLeft))} s in this hold`;
  } else {
    const sideTxt = m.sides ? (elapsed < m.secs / 2 ? " · Left side first" : " · Now the right side") : "";
    phase = `${m.rounds} x ${m.reps || ""}${sideTxt}`;
  }
  const doneN = moves.filter((x) => props.done[x.id]).length;
  const btn = (primary: boolean) => ({ minHeight: 48, padding: "0 16px", flex: primary ? "1 1 100%" : "1 1 0", cursor: "pointer", borderRadius: 999, border: "none", background: primary ? "var(--ink)" : "var(--card)", color: primary ? "var(--on-ink)" : "var(--text)", fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap" as any });
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ borderRadius: 20, padding: 16, display: "grid", gap: 10, background: "var(--bg)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Chip label={`Move ${idx + 1} of ${moves.length}`} tone="ink" /><Chip label={m.area} /></div>
        <div style={{ fontSize: 20, lineHeight: "26px", fontWeight: 600, letterSpacing: -0.3 }}>{m.name}</div>
        <div style={{ fontSize: 14, color: "var(--text)" }}>{doseOf(m)}</div>
        <div style={{ fontSize: 13.5, lineHeight: "19px", color: "var(--text2)" }}>{m.cue}</div>
        {DEMOS[m.id] && <DemoBlock key={m.id} id={m.id} />}
        <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
          <div style={{ fontSize: 52, lineHeight: "58px", fontWeight: 600, letterSpacing: -1.5, fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{mmss(left)}</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>{phase}</div>
        </div>
        <Bar value={m.secs > 0 ? elapsed / m.secs : 0} height={6} track="var(--border)" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <button style={btn(true)} onClick={() => setRunning(!running)}>{running ? "Pause" : left < m.secs ? "Resume" : "Start"}</button>
          <button style={btn(false)} onClick={finish}>Done, next</button>
          <button style={btn(false)} onClick={() => go(idx - 1)}>Back</button>
          <button style={btn(false)} onClick={() => go(idx)}>Restart</button>
        </div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--text3)" }}>{`${doneN} of ${moves.length} moves done. Tap a move to jump to it, or the circle to tick it. Keep the screen on while the timer runs.`}</div>
      <div style={{ display: "grid", marginTop: -4 }}>
        {moves.map((x, i) => { const d = !!props.done[x.id]; const cur = i === idx; return (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px", margin: "0 -8px", borderRadius: 14, background: cur ? "var(--accent-subtle)" : "transparent" }}>
            <Tick done={d} onClick={() => props.onSet(x.id, !d)} label={d ? `Untick ${x.name}` : `Tick ${x.name}`} size={26} />
            <button onClick={() => go(i)} style={{ flex: 1, minHeight: 40, textAlign: "left", padding: 0, cursor: "pointer", border: "none", background: "transparent", color: d ? "var(--text3)" : "var(--text)", fontSize: 14, lineHeight: "19px" }}>{x.name}<span style={{ color: "var(--text3)" }}>{` · ${doseOf(x)}`}</span></button>
          </div>
        ); })}
      </div>
    </div>
  );
}

function BackupBox(props: { store: Store; onImport: (s: Store) => void }) {
  const t = useGrokTheme();
  const [msg, setMsg] = useState<string>("");
  const doExport = () => {
    const blob = new Blob([JSON.stringify({ app: "golf-speed-plan", version: 1, exportedAt: new Date().toISOString(), data: props.store }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `golfplan-backup-${iso(nyNow())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Backup file saved. Keep it in Files, iCloud Drive or Google Drive.");
  };
  const doImport = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        const data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || typeof data !== "object" || !("days" in data || "logs" in data)) throw new Error("bad");
        if (!window.confirm("Replace everything in the app with this backup?")) return;
        props.onImport(normalize(data));
        setMsg("Backup restored.");
      } catch (_e) { setMsg("That file isn't a Golf Plan backup."); }
    };
    r.readAsText(f);
  };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button onClick={doExport} style={{ minHeight: 50, borderRadius: 999, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Export backup (JSON)</button>
      <label style={{ minHeight: 50, borderRadius: 999, border: "none", background: "var(--fill2)", color: t.text.primary, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        Import backup
        <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { doImport(e.target.files ? e.target.files[0] : undefined); e.target.value = ""; }} />
      </label>
      {msg && <div style={{ fontSize: 13.5, color: t.text.link }}>{msg}</div>}
    </div>
  );
}

const LIFTS: { id: string; name: string; why?: string }[] = [
  { id: "trapdl", name: "Trap bar deadlift (Tue)" },
  { id: "bench", name: "Bench press (Tue, Thu)" },
  { id: "row", name: "Barbell bent-over row (Thu)" },
  { id: "broad", name: "Broad jump (Testing Day)" },
  { id: "thestack", name: "TheStack speed session (Mon, Wed, Sat)" },
];
const uniqMoves = (ms: Move[]) => ms.map((m) => ({ id: m.id, name: m.name }));
const HOWTO_GROUPS: { title: string; open: boolean; items: { id: string; name: string; why?: string }[] }[] = [
  { title: "Daily mobility + strength", open: true, items: uniqMoves(DAILY_MOVES) },
  { title: "Strength lifts + speed", open: false, items: LIFTS },
  { title: "Power drills", open: false, items: DRILLS.filter((d) => d.group === "Power").map((d) => ({ id: d.id, name: d.name })) },
  { title: "Hips", open: false, items: DRILLS.filter((d) => d.group === "Hips").map((d) => ({ id: d.id, name: d.name })) },
  { title: "5-min warm-up", open: false, items: uniqMoves(WARMUP_MOVES) },
  { title: "Sunday long stretch", open: false, items: uniqMoves(SUNDAY_MOVES) },
  { title: "Golf + home practice", open: false, items: DRILLS.filter((d) => d.group === "Golf").map((d) => ({ id: d.id, name: d.name, why: d.id === "transfer" ? "Just 5 max drives on Rapsodo with a ball, shoes on" : d.id === "sim18" ? "Just play a sim round (front tees, no driver)" : d.id.startsWith("round") ? "Your real round, no demo needed" : undefined })) },
];
const CREDIT_CHANNELS: string[] = Array.from(new Set(Object.values(DEMOS).flatMap((d: any) => (d.videos || []).map((v: any) => v.channel)))).sort();

function WedgeCounter(props: { rec: WedgeRec; canSwitch: boolean; onShot: (i: number, hit: boolean) => void; onUndo: () => void; onSwitch: () => void; onFinish: () => void }) {
  const t = useGrokTheme();
  const L = WEDGE_LADDERS[props.rec.ladder];
  const hits = props.rec.hits.reduce((a, b) => a + b, 0);
  const shots = props.rec.shots.reduce((a, b) => a + b, 0);
  const total = L.targets.length * L.shots;
  const nextIdx = L.targets.findIndex((_y, i) => (props.rec.shots[i] || 0) < L.shots);
  const small = (bg: string, fg: string) => ({ height: 42, minWidth: 64, padding: "0 14px", borderRadius: 999, border: "none", background: bg, color: fg, fontSize: 14.5, fontWeight: 600, cursor: "pointer" });
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13.5, color: "var(--text3)" }}>{`Ladder ${props.rec.ladder} · ${L.targets.length} targets × ${L.shots} shots`}</div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, fontVariantNumeric: "tabular-nums" }}>{`${hits}/${shots}${shots ? ` · ${Math.round((hits / shots) * 100)}%` : ""}`}</div>
      </div>
      <ProgressBar value={shots / total} label={`${shots} of ${total} shots${nextIdx >= 0 ? ` · next: ${L.targets[nextIdx]} yd (hit ${winOf(L.targets[nextIdx])})` : " · all done"}`} />
      {L.targets.map((y, i) => {
        const sh = props.rec.shots[i] || 0; const h = props.rec.hits[i] || 0; const full = sh >= L.shots; const cur = i === nextIdx;
        return (
          <div key={y} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 14px", borderRadius: 16, background: cur ? "var(--accent-subtle)" : "var(--bg)", opacity: full && !cur ? 0.6 : 1 }}>
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{`${y} yd`}</div>
              <div style={{ fontSize: 12, color: t.text.tertiary }}>{`Hit = ${winOf(y)} yd carry · ${h} hits · ${sh}/${L.shots} shots`}</div>
            </div>
            <button aria-label={`Hit at ${y} yards`} disabled={full} onClick={() => props.onShot(i, true)} style={{ ...small("var(--ink)", "var(--on-ink)"), opacity: full ? 0.35 : 1 }}>Hit</button>
            <button aria-label={`Miss at ${y} yards`} disabled={full} onClick={() => props.onShot(i, false)} style={{ ...small("var(--card)", t.text.primary), opacity: full ? 0.35 : 1 }}>Miss</button>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button label="Undo last shot" onClick={props.onUndo} />
        {props.canSwitch && <Button label={`Switch to Ladder ${props.rec.ladder === "A" ? "B" : "A"}`} onClick={props.onSwitch} />}
      </div>
      <Button variant="primary" label={props.rec.done ? "Session saved · tap to re-save" : "Finish + save session"} onClick={props.onFinish} />
    </div>
  );
}

// ---------- Redesign: categories + workouts ----------
const DAILY_KEYS: CheckKey[] = ["wake", "mobility", "hipmini", "protein", "water", "screens", "bed", "recovery", "review"];
const WORK_KEYS: CheckKey[] = ["strength", "speed", "hips"];
const GOLF_KEYS: CheckKey[] = ["wedges", "putting", "sim", "eighteen", "nine"];
const TRAIN_KEYS: CheckKey[] = ["mobility", "hipmini", "strength", "speed", "hips", "wedges", "putting", "sim", "eighteen", "nine", "recovery"];
const UI_KEY = "golf-speed-plan-ui";
const DAILY_ACCENT = "#f5b800";
const DAILY_INK = "#e5ab00";
const HOME_BG = "#131315";
const HOME_VARS: any = { "--bg": HOME_BG, "--card": "#1d1e22", "--elev": "#1d1e22", "--fill2": "#26282e", "--border": "#2c2e35", "--border-strong": "#4d515b", "--text": "#f1f3f6", "--text2": "#adb3bd", "--text3": "#80868f", "--glass": "rgba(24,25,30,0.72)", "--nav": "rgba(16,16,19,0.94)", "--shadow": "0 6px 22px rgba(0,0,0,0.45)", "--accent-subtle": "rgba(92,201,138,0.14)", "--zebra": "rgba(255,255,255,0.03)", "--link": "#8fe0b0", colorScheme: "dark" };
const DEMO_RULES: [RegExp, string][] = [
  [/trap bar jump/i, "trapjump"], [/lateral bound/i, "bound"], [/single-leg RDL to knee/i, "slrdl"], [/shot-put/i, "shotput"],
  [/^Trap bar deadlift/i, "trapdl"], [/^Bench press/i, "bench"], [/Romanian deadlift/i, "hamrdl"], [/Nordic/i, "hamnordic"],
  [/lateral lunge/i, "latlunge"], [/step-in overhead/i, "stepin"], [/scoop toss into wall/i, "scoop"], [/kneeling jump/i, "kneeljump"],
  [/box\/bench jump/i, "boxjump"], [/chest pass/i, "chestpass"], [/bent-over row/i, "row"], [/split squat/i, "splitsq"],
  [/plyo push/i, "plyopush"], [/glute bridge/i, "hambridge"], [/Build-up swings/i, "buildup"], [/TheStack session/i, "thestack"],
  [/TheStack R-Speed/i, "thestack"], [/Broad jump/i, "broad"], [/Rotational slam ball throw/i, "rotthrow"],
  [/half-kneeling hip internal/i, "hip1"], [/Quadruped band/i, "hip2"], [/Supine 90\/90/i, "hip3"], [/Counterbalanced/i, "hip5"],
  [/Copenhagen/i, "hip8"], [/isometric hip flexion/i, "hip6"], [/KB single-leg RDL/i, "hamslrdl"], [/Banded hamstring curl/i, "hamcurl"],
];
const demoFor = (e: any): string | undefined => { if (e.demo) return e.demo; const r = DEMO_RULES.find((x) => x[0].test(e.name)); return r ? r[1] : undefined; };
const DRILL_IDS = new Set(DRILLS.map((d) => d.id));
interface Workout { id: string; title: string; sub: string; s: Omit<Session, "start">; days: DayKey[]; key?: CheckKey; fallback: string; optional?: boolean; testing?: boolean; when: string; }
const SWAPS: Omit<Session, "start"> = {
  name: "Kneel-jump swaps", goal: "Swap if knees/landing feel off: pick ONE of these for Thursday's 2-min kneeling-jump slot (same time). Max intent, soft landings.",
  items: DRILLS.filter((d) => d.id.startsWith("swap_")).map((d) => ({ name: d.name.replace("Swap option: ", ""), dose: d.reps, rest: "-", load: d.cue, min: 2, demo: d.id } as any)),
};
const WORKOUTS: Workout[] = [
  { id: "tests", title: "Testing Day tests", sub: "Speed, jumps, throws, hamstring retest", s: TESTS_AM, days: [], key: "speed", fallback: "ruler", testing: true, when: "Testing Day, 6:30 AM" },
  { id: "strA", title: "Strength A", sub: "Power primer, trap bar, bench, hamstrings", s: STRENGTH_A, days: ["Tue"], key: "strength", fallback: "workout", when: "Tue 6:32 AM" },
  { id: "strB", title: "Strength B", sub: "Upper + rotational power, moderate legs", s: STRENGTH_B, days: ["Thu"], key: "strength", fallback: "workout", when: "Thu 6:32 AM" },
  { id: "stack", title: "TheStack speed", sub: "Speed session + Rapsodo transfer", s: SPEED, days: ["Mon", "Wed", "Sat"], key: "speed", fallback: "gauge", when: "Mon/Wed/Sat 6:34 AM" },
  { id: "hipmini", title: "Daily hip mini-block", sub: "4 min after the morning routine", s: HIP_MINI, days: ALL7, key: "hipmini", fallback: "layers", when: "Every day, 6:30 (6:28 Tue/Thu)" },
  { id: "hipblock", title: "Hip block", sub: "10 min after TheStack", s: HIP_BLOCK, days: ["Wed", "Sat"], key: "hips", fallback: "layers", when: "Wed/Sat 7:04 AM" },
  { id: "primer", title: "Pre-round hip primer", sub: "4 min before the round", s: HIP_PRIMER, days: ["Mon", "Fri"], key: "hips", fallback: "golf", when: "Mon 1:00 PM, Fri 3:05 PM" },
  { id: "ham", title: "Hamstring add-on", sub: "Optional, after the hip block", s: HAM_SAT, days: ["Sat"], fallback: "layers", optional: true, when: "Sat 7:14 AM (optional)" },
  { id: "swaps", title: "Kneel-jump swaps", sub: "Swap if knees/landing feel off", s: SWAPS, days: ["Thu"], fallback: "trend", optional: true, when: "Thu, in place of the kneeling jump" },
];
function loadUi(): { name?: string; dark?: boolean } { try { return JSON.parse(window.localStorage.getItem(UI_KEY) || "{}"); } catch (_e) { return {}; } }

export default function App() {
  const initial = useMemo(() => loadStore(), []);
  const [store, setStore] = useState<Store>(initial.store);
  const [saved, setSaved] = useState<boolean>(initial.ok);
  const [now, setNow] = useState<Date>(nyNow());
  const [tab, setTab] = useState<string>("menu");
  const [nav, setNav] = useState<string>("home");
  const [detail, setDetail] = useState<string | null>(null);
  const [player, setPlayer] = useState<number | null>(null);
  const [openEx, setOpenEx] = useState<number | null>(null);
  const [ui, setUi] = useState<{ name?: string; dark?: boolean }>(loadUi());
  const [speedDraft, setSpeedDraft] = useState<string>("");
  const [nameSheet, setNameSheet] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>("");
  const [planDay, setPlanDay] = useState<string>(JS_DAYS[nyNow().getDay()]);
  const [routine, setRoutine] = useState<RoutineKey>(nyNow().getDay() === 0 ? "sunday" : "daily");
  const [drillView, setDrillView] = useState<string>("Today");
  const [logKind, setLogKind] = useState<LogKind>("speed");
  const [logValue, setLogValue] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(iso(nyNow()));
  const [draftAssess, setDraftAssess] = useState<Record<string, string>>({});
  const [assessNote, setAssessNote] = useState<Record<string, string>>({});
  const [gameDraft, setGameDraft] = useState<Record<string, string>>({});
  const [testDraft, setTestDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(nyNow()), 30000);
    const onVis = () => { if (document.visibilityState === "visible") setNow(nyNow()); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); setSaved(true); } catch (_e) { setSaved(false); }
  }, [store]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, nav, detail]);
  useEffect(() => { try { window.localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_e) {} document.documentElement.setAttribute("data-theme", ui.dark ? "dark" : "light"); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", nav === "home" || nav === "daily" ? HOME_BG : ui.dark ? "#0e100f" : "#f4f6f5"); document.body.style.background = ""; }, [ui, nav]);
  const go = (where: string) => { setDetail(null); setPlayer(null); if (where === "stretch") { setNav("daily"); window.setTimeout(() => { const el = document.getElementById("timer"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120); } else if (["home", "daily", "workout", "golf"].indexOf(where) >= 0) setNav(where); else { setNav("more"); setTab(where); } };

  const todayIso = iso(now);
  const todayKey = JS_DAYS[now.getDay()];
  const plan = planFor(todayIso, todayKey);
  const isTestingDay = !!plan.testing;
  const blocks = useMemo(() => buildBlocks(plan), [todayIso]);
  const rec: DayRec = store.days[todayIso] || { c: {} };
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const liftDay = todayKey === "Tue" || todayKey === "Thu";
  const roundDay = todayKey === "Mon" || todayKey === "Fri";
  const nineDay = todayKey === "Fri";
  const effRoutine: RoutineKey = routine === "daily" && liftDay ? "dailylift" : routine;

  const updateToday = (patch: Partial<DayRec>) => setStore((s) => { const cur = s.days[todayIso] || { c: {} }; return { ...s, days: { ...s.days, [todayIso]: { ...cur, ...patch } } }; });
  const toggle = (k: CheckKey) => setStore((s) => { const cur = s.days[todayIso] || { c: {} }; return { ...s, days: { ...s.days, [todayIso]: { ...cur, c: { ...cur.c, [k]: !cur.c[k] } } } }; });
  const setStretch = (r: RoutineKey, id: string, v: boolean) => setStore((s) => {
    const cur = s.days[todayIso] || { c: {} };
    const st = { ...(cur.stretch || {}), [`${r}:${id}`]: v };
    const all = ROUTINES[r].moves.every((m) => st[`${r}:${m.id}`]);
    const c = r !== "warmup" && all ? { ...cur.c, mobility: true } : cur.c;
    return { ...s, days: { ...s.days, [todayIso]: { ...cur, stretch: st, c } } };
  });
  const openStretch = (r?: RoutineKey) => { setRoutine(r ? (r === "dailylift" ? "daily" : r) : todayKey === "Sun" ? "sunday" : "daily"); go("stretch"); };
  const toggleDrill = (id: string) => setStore((s) => { const cur = s.days[todayIso] || { c: {} }; const dr = { ...(cur.drills || {}), [id]: !(cur.drills && cur.drills[id]) }; return { ...s, days: { ...s.days, [todayIso]: { ...cur, drills: dr } } }; });
  const updateRound = (patch: RoundStats) => setStore((s) => { const cur = s.days[todayIso] || { c: {} }; return { ...s, days: { ...s.days, [todayIso]: { ...cur, round: { ...(cur.round || {}), ...patch } } } }; });

  const todayDrills = DRILLS.filter((d) => d.days.indexOf(todayKey) >= 0 && !(isTestingDay && d.id === "transfer"));
  const drillDone: Record<string, boolean> = rec.drills || {};
  const todayDrillsDone = todayDrills.filter((d) => drillDone[d.id]).length;
  const drillStreak = streakOf((d) => {
    const ds = DRILLS.filter((x) => x.days.indexOf(JS_DAYS[d.getDay()]) >= 0);
    const r = store.days[iso(d)];
    if (ds.length === 0) return !!(r && Object.values(r.c).some((v) => !!v));
    return !!(r && r.drills && ds.some((x) => r.drills && r.drills[x.id]));
  }, now);
  const round: RoundStats = rec.round || {};

  const gameRecs = (id: string): GameRec[] => store.games.filter((g) => g.id === id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const bestOf = (g: GameDef): number | undefined => { const rs = gameRecs(g.id); if (rs.length === 0) return undefined; return rs.reduce((m, r) => (g.higher ? Math.max(m, r.score) : Math.min(m, r.score)), rs[0].score); };
  const saveGame = (g: GameDef) => {
    const v = Number(gameDraft[g.id]);
    if (!gameDraft[g.id] || isNaN(v)) return;
    setStore((s) => ({ ...s, games: [...s.games.filter((x) => !(x.id === g.id && x.date === todayIso)), { date: todayIso, id: g.id, score: v }] }));
    setGameDraft({ ...gameDraft, [g.id]: "" });
  };
  const todayGames = GAMES.filter((g) => g.days.indexOf(todayKey) >= 0);
  const todayScore = (id: string) => store.games.find((x) => x.id === id && x.date === todayIso);
  const saveRound = () => {
    const v = Number(round.score);
    if (!round.score || isNaN(v)) return;
    const note = [round.gir ? `GIR ${round.gir}` : "", round.putts ? `${round.putts} putts` : "", round.focus ? `focus: ${round.focus}` : ""].filter((x) => x).join(", ");
    const kind: LogKind = nineDay ? "score9" : "score18";
    const ck: CheckKey = nineDay ? "nine" : "eighteen";
    setStore((s) => { const cur = s.days[todayIso] || { c: {} }; return { ...s, logs: [...s.logs.filter((l) => !(l.kind === kind && l.date === todayIso)), { date: todayIso, kind, value: v, note: note || undefined }], days: { ...s.days, [todayIso]: { ...cur, c: { ...cur.c, [ck]: true } } } }; });
  };
  const nextTest = TESTING_DATES.find((d) => d >= todayIso);
  const saveTests = () => {
    const v: Record<string, string> = {};
    TEST_FIELDS.forEach((f) => { if (testDraft[f.id]) v[f.id] = testDraft[f.id]; });
    if (Object.keys(v).length === 0) return;
    setStore((s) => {
      const extra: LogEntry[] = [];
      if (v.rspeed && !isNaN(Number(v.rspeed))) extra.push({ date: todayIso, kind: "speed", value: Number(v.rspeed), note: "Testing Day: TheStack R-Speed max" });
      if (v.rball && !isNaN(Number(v.rball))) extra.push({ date: todayIso, kind: "ball", value: Number(v.rball), note: "Testing Day: Rapsodo" });
      return { ...s, tests: [...s.tests.filter((x) => x.date !== todayIso), { date: todayIso, v }], logs: [...s.logs.filter((l) => !(l.date === todayIso && (l.note || "").startsWith("Testing Day"))), ...extra] };
    });
  };
  const testHistory: TestRec[] = [BASELINE_TEST, ...[...store.tests].sort((a, b) => (a.date < b.date ? -1 : 1))].slice(-5);

  // ----- Wedge ladder A/B -----
  const wedgeToday: WedgeRec | undefined = store.wedge.find((w) => w.date === todayIso);
  const wedgePrev = [...store.wedge].filter((w) => w.date < todayIso && w.shots.some((x) => x > 0)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const nextLadder: "A" | "B" = wedgeToday ? wedgeToday.ladder : wedgePrev ? (wedgePrev.ladder === "A" ? "B" : "A") : "A";
  const blankWedge = (l: "A" | "B"): WedgeRec => ({ date: todayIso, ladder: l, hits: WEDGE_LADDERS[l].targets.map(() => 0), shots: WEDGE_LADDERS[l].targets.map(() => 0), seq: [] } as any);
  const wedgeRec: WedgeRec = wedgeToday || blankWedge(nextLadder);
  const putWedge = (w: WedgeRec) => setStore((s) => ({ ...s, wedge: [...s.wedge.filter((x) => x.date !== todayIso), w] }));
  const wedgeShot = (i: number, hit: boolean) => { const w: any = JSON.parse(JSON.stringify(wedgeRec)); w.shots[i] += 1; if (hit) w.hits[i] += 1; w.seq = [...(w.seq || []), i * 2 + (hit ? 1 : 0)]; putWedge(w); };
  const wedgeUndo = () => { const w: any = JSON.parse(JSON.stringify(wedgeRec)); const q = w.seq || []; if (!q.length) return; const last = q.pop(); const i = Math.floor(last / 2); w.shots[i] = Math.max(0, w.shots[i] - 1); if (last % 2) w.hits[i] = Math.max(0, w.hits[i] - 1); w.seq = q; putWedge(w); };
  const wedgeShotsN = wedgeRec.shots.reduce((a, b) => a + b, 0);
  const wedgeSwitch = () => { if (wedgeShotsN > 0 && !window.confirm("Switch ladders and clear today's shots?")) return; putWedge(blankWedge(wedgeRec.ladder === "A" ? "B" : "A")); };
  const wedgeFinish = () => { if (wedgeShotsN === 0) return; putWedge({ ...wedgeRec, done: true }); setStore((s) => { const cur = s.days[todayIso] || { c: {} }; return { ...s, days: { ...s.days, [todayIso]: { ...cur, c: { ...cur.c, wedges: true } } } }; }); };
  const wedgeHist = [...store.wedge].filter((w) => w.shots.some((x) => x > 0)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const wPct = (w: WedgeRec) => { const sh = w.shots.reduce((a, b) => a + b, 0); return sh ? Math.round((w.hits.reduce((a, b) => a + b, 0) / sh) * 100) : 0; };
  const labelFor = (p: DayPlan, k: CheckKey): string => `${p.labels[k] || BASE_LABELS[k]}${k === "wedges" && p === plan ? ` · Ladder ${nextLadder}` : ""}`;
  const items = plan.checks.map((k) => ({ key: k, label: labelFor(plan, k), done: !!rec.c[k] }));
  const doneCount = items.filter((i) => i.done).length;
  const currentBlock = blocks.find((b) => hourNow >= b.s && hourNow < b.e);
  const nextBlock = blocks.find((b) => b.s > hourNow);
  const firstOpen = items.find((i) => !i.done);
  const dayStreak = streakOf((d) => dayScore(store, d) >= 0.7, now);
  const mobStreak = streakOf((d) => !!(store.days[iso(d)] && store.days[iso(d)].c.mobility), now);
  const bedStreak = streakOf((d) => !!(store.days[iso(d)] && store.days[iso(d)].c.bed), now);
  const checkInDays = Object.keys(store.days).filter((k) => Object.values(store.days[k].c).some((v) => !!v)).length;
  const mondayOffset = (now.getDay() + 6) % 7;
  const weekStart = addDays(now, -mondayOffset);
  const weekPoints = DAY_ORDER.map((dk, i) => { const sc = dayScore(store, addDays(weekStart, i)); return { label: dk, value: Math.round(sc * 100), display: `${Math.round(sc * 100)}%` }; });
  const weekHasData = weekPoints.some((p) => p.value > 0);
  const heatDays = Array.from({ length: 42 }, (_v, i) => { const d = addDays(now, i - 41); return { date: iso(d), value: Math.round(dayScore(store, d) * 100) }; });
  const heatHasData = heatDays.some((d) => d.value > 0);
  let programWeek = 0;
  if (store.startDate) {
    const p = store.startDate.split("-").map((x) => Number(x));
    const start = new Date(p[0], p[1] - 1, p[2]);
    const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start.getTime()) / 86400000);
    programWeek = Math.floor(diff / 7) + 1;
  }
  const phaseName = programWeek <= 0 ? "" : programWeek <= 4 ? "Phase 1: Foundation + baseline" : programWeek <= 8 ? "Phase 2: Build" : programWeek <= 12 ? "Phase 3: Power + speed" : "Past week 12: retest and plan the next block";
  const logsOf = (k: LogKind) => store.logs.filter((l) => l.kind === k).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const speedLogs = logsOf("speed");
  const bestSpeed = speedLogs.reduce((m, l) => Math.max(m, l.value), 0);
  const benchLogs = logsOf("bench");
  const trapLogs = logsOf("trap");
  const scoreLogs = store.logs.filter((l) => l.kind === "score18" || l.kind === "score9" || l.kind === "hcp").sort((a, b) => (a.date < b.date ? 1 : -1));
  const addLog = () => { const v = Number(logValue); if (!logValue || isNaN(v)) return; setStore((s) => ({ ...s, logs: [...s.logs, { date: logDate || todayIso, kind: logKind, value: v }] })); setLogValue(""); };
  const undoLog = () => setStore((s) => ({ ...s, logs: s.logs.slice(0, -1) }));
  const saveAssess = () => {
    const results: Record<string, string> = {};
    SCREENS.forEach((sc) => { const r = draftAssess[sc.id] || "Not tested"; const n = assessNote[sc.id] ? ` (${assessNote[sc.id]})` : ""; results[sc.id] = `${r}${n}`; });
    setStore((s) => ({ ...s, assess: [...s.assess, { date: todayIso, results }] }));
  };
  const unitOf = (k: LogKind) => { const f = LOG_KINDS.find((x) => x.value === k); return f ? f.unit : ""; };
  const nameOf = (k: LogKind) => { const f = LOG_KINDS.find((x) => x.value === k); return f ? f.label : k; };
  const lineFrom = (logs: LogEntry[]) => { const labels = thinLabels(logs.map((l) => shortDate(l.date))); return logs.map((l, i) => ({ label: labels[i], value: l.value })); };
  const lastAssess = store.assess.length > 0 ? store.assess[store.assess.length - 1] : undefined;
  const limited = lastAssess ? SCREENS.filter((s) => { const r = lastAssess.results[s.id] || ""; return r.startsWith("Limited") || r.startsWith("Pain"); }) : [];
  const routineEvents = blocks.filter((b) => b.s >= 6).map((b) => ({ start: b.s, end: b.e, title: b.t, selected: currentBlock === b, flag: !!(b.k && rec.c[b.k]) }));
  const stretchDone: Record<string, boolean> = {};
  ROUTINES[effRoutine].moves.forEach((m) => { stretchDone[m.id] = !!(rec.stretch && rec.stretch[`${effRoutine}:${m.id}`]); });
  const stretchDoneN = ROUTINES[effRoutine].moves.filter((m) => stretchDone[m.id]).length;
  const planList: DayPlan[] = planDay === "Test" ? [TEST_PLAN] : planDay === "All" ? DAY_ORDER.map((k) => PLAN[k]) : [PLAN[planDay as DayKey]];

  // ----- Redesign derived values -----
  const itemsIn = (keys: CheckKey[]) => items.filter((i) => keys.indexOf(i.key) >= 0);
  const dailyItems = itemsIn(DAILY_KEYS); const workItems = itemsIn(WORK_KEYS); const golfItems = itemsIn(GOLF_KEYS);
  const fracOf = (arr: { done: boolean }[]) => (arr.length ? arr.filter((i) => i.done).length / arr.length : 0);
  const dayPct = Math.round((items.length ? doneCount / items.length : 0) * 100);
  const seenK: Record<string, boolean> = {};
  const minutesDone = Math.round(blocks.filter((b) => b.k && TRAIN_KEYS.indexOf(b.k) >= 0 && rec.c[b.k]).reduce((a, b) => a + (b.e - b.s) * 60, 0));
  const minutesPlanned = Math.round(blocks.filter((b) => b.k && TRAIN_KEYS.indexOf(b.k) >= 0 && plan.checks.indexOf(b.k) >= 0).reduce((a, b) => a + (b.e - b.s) * 60, 0));
  const lastSpeed = speedLogs.length ? speedLogs[speedLogs.length - 1].value : 98;
  const catOf = (k: CheckKey) => (WORK_KEYS.indexOf(k) >= 0 ? "workout" : GOLF_KEYS.indexOf(k) >= 0 ? "golf" : "daily");
  const blockFor = (k: CheckKey) => blocks.find((b) => b.k === k && b.e > hourNow) || blocks.find((b) => b.k === k);
  const openItems = items.filter((i) => !i.done).map((i) => ({ ...i, b: blockFor(i.key) })).sort((a, b) => ((a.b ? a.b.s : 30) - (b.b ? b.b.s : 30)));
  const upNext = openItems.find((i) => i.b && i.b.e > hourNow) || openItems[0];
  const greetWord = hourNow < 12 ? "Good morning" : hourNow < 17 ? "Good afternoon" : "Good evening";
  const wIsToday = (w: Workout) => (w.testing ? isTestingDay : w.days.indexOf(todayKey) >= 0 && !(isTestingDay && w.id === "stack"));
  const wRowKey = (w: Workout, i: number) => `w:${w.id}:${i}`;
  const wRowDone = (w: Workout, i: number) => { const id = demoFor(w.s.items[i]); return !!(drillDone[wRowKey(w, i)] || (id && DRILL_IDS.has(id) && drillDone[id])); };
  const wDoneN = (w: Workout) => w.s.items.filter((_e, i) => wRowDone(w, i)).length;
  const setRow = (w: Workout, i: number, v: boolean) => setStore((st) => { const cur = st.days[todayIso] || { c: {} }; const dr = { ...(cur.drills || {}), [wRowKey(w, i)]: v }; const id = demoFor(w.s.items[i]); if (id && DRILL_IDS.has(id)) dr[id] = v; return { ...st, days: { ...st.days, [todayIso]: { ...cur, drills: dr } } }; });
  const finishWorkout = (w: Workout) => { setPlayer(null); if (w.key) setStore((st) => { const cur = st.days[todayIso] || { c: {} }; return { ...st, days: { ...st.days, [todayIso]: { ...cur, c: { ...cur.c, [w.key as string]: true } } } }; }); };
  const wThumb = (w: Workout) => { for (const e of w.s.items) { const t2 = demoThumb(demoFor(e)); if (t2) return t2; } return null; };
  const todayWorkouts = WORKOUTS.filter(wIsToday);
  const otherWorkouts = WORKOUTS.filter((w) => !wIsToday(w) && !w.testing);
  const curW = detail ? WORKOUTS.find((w) => w.id === detail) : undefined;
  const golfDrillsToday = todayDrills.filter((d) => d.group === "Golf");
  const workDrillsToday = todayDrills.filter((d) => d.group !== "Golf");
  const addSpeed = () => { const v = Number(speedDraft); if (!speedDraft || isNaN(v)) return; setStore((st) => ({ ...st, logs: [...st.logs, { date: todayIso, kind: "speed", value: v }] })); setSpeedDraft(""); };
  const moreTitles: Record<string, string> = { plan: "Weekly plan", phases: "12 weeks", log: "Log + backup", assess: "Tests", food: "Food", drills: "Drills + how-to", settings: "Settings", today: "Full day view" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main key={nav + (detail || "") + tab} className="fadein" style={{ ...(nav === "daily" ? { "--accent": DAILY_INK, "--on-accent": "#111312", "--accent-subtle": "rgba(245,184,0,0.14)" } : {}), maxWidth: 760, margin: "0 auto", padding: `0 16px calc(${NAV_BOTTOM} + ${NAV_H + 28}px)`, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
      {nav === "home" && (
        <Fragment>
          <div style={{ position: "relative", margin: "0 -16px", background: HOME_BG, height: "calc(min(100vw, 400px) * 1.70)", overflow: "hidden" }}>
            <img src={PHOTO.dontSleep} alt="Don't sleep. Jalen Brunson, number 11, hand raised" width={335} height={597} style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "min(100vw, 400px)", height: "auto", display: "block" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${HOME_BG} 0%, rgba(19,19,21,0) calc(50% - 200px), rgba(19,19,21,0) calc(50% + 200px), ${HOME_BG} 100%), linear-gradient(180deg, rgba(19,19,21,0.55) 0%, rgba(19,19,21,0) 16%, rgba(19,19,21,0) 58%, rgba(19,19,21,0.75) 86%, ${HOME_BG} 100%)` }} />
            <div style={{ position: "relative", height: "100%", padding: "calc(env(safe-area-inset-top) + 14px) 20px 44px", color: "#fff", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, lineHeight: "30px" }}>{`Hi, ${ui.name || "Golfer"}`}</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 1 }}>{`${greetWord} · ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()]} ${shortDate(todayIso)}`}</div>
                </div>
                <button onClick={() => { setNameDraft(ui.name || ""); setNameSheet(true); }} aria-label="Edit your name" style={{ width: 48, height: 48, flex: "0 0 auto", borderRadius: 24, border: "2px solid rgba(255,255,255,0.9)", background: "#d9d6cf", padding: 0, overflow: "hidden", cursor: "pointer" }}><img src={PHOTO.avatar} alt="" width={44} height={44} style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} /></button>
              </div>
              <button onClick={() => go(upNext ? catOf(upNext.key) : "daily")} style={{ marginTop: "auto", alignSelf: "flex-start", border: "none", background: "transparent", padding: 0, color: "#fff", textAlign: "left", cursor: "pointer", width: 170 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Today</div>
                <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: -1.5, lineHeight: "54px", fontVariantNumeric: "tabular-nums" }}>{`${dayPct}%`}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>{`${doneCount} of ${items.length} tasks done`}</div>
                <Bar value={doneCount / Math.max(1, items.length)} color="#ffffff" track="rgba(255,255,255,0.22)" />
              </button>
            </div>
          </div>
          <div style={{ marginTop: -36, position: "relative", zIndex: 2, display: "grid", gap: 12 }}>
            {upNext ? (
              <button onClick={() => { if (upNext.key === "mobility" && !isTestingDay) openStretch(); else go(catOf(upNext.key)); }} style={{ ...CARD, display: "flex", alignItems: "center", gap: 14, padding: 16, cursor: "pointer", textAlign: "left", color: "var(--text)" }}>
                <IconDot name="target" tone="ink" size={42} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--text3)" }}>{`Up next${upNext.b ? ` · ${fmtHour(upNext.b.s)}` : ""}`}</span>
                  <span style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: "21px", marginTop: 1 }}>{upNext.label}</span>
                </span>
                <span style={{ color: "var(--text3)" }}>{Icon.chev}</span>
              </button>
            ) : (
              <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 14, padding: 16 }}><IconDot name="check" tone="accent" size={42} /><span style={{ fontSize: 15.5, fontWeight: 600 }}>Everything done today. Nice work.</span></div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <StatCard icon="flame" label="Streak" value={`${dayStreak}`} unit={dayStreak === 1 ? "day" : "days"} detail="70%+ days in a row" />
              <StatCard icon="timer" label="Time spent" value={`${minutesDone}`} unit={`/ ${minutesPlanned} min`} detail="Training today" />
            </div>
            <StatCard icon="gauge" label="Swing speed" value={`${lastSpeed}`} unit="mph" onClick={() => go("golf")}>
              <div style={{ display: "grid", gap: 8 }}>
                <Bar value={(lastSpeed - 90) / 20} height={6} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)" }}><span>90</span><span>{`${Math.max(0, Math.round((110 - lastSpeed) * 10) / 10)} mph to goal`}</span><span>110</span></div>
              </div>
            </StatCard>
          </div>
          <SectionTitle>Today</SectionTitle>
          <div className="hscroll" style={{ margin: "-4px -16px 0", padding: "4px 16px 10px", scrollPaddingLeft: 16 }}>
            <CategoryCard title="Daily" photo={PHOTO.daily} photoPos="50% 22%" photoBg="#000" meta={`${dailyItems.filter((i) => i.done).length}/${dailyItems.length}`} lines={["Mobility, hips, sleep, food"]} value={fracOf(dailyItems)} ink={DAILY_INK} onClick={() => go("daily")} />
            <CategoryCard title="Workout" photo={PHOTO.bunker} photoPos="50% 40%" meta={workItems.length ? `${workItems.filter((i) => i.done).length}/${workItems.length}` : "Rest"} lines={[todayWorkouts.filter((w) => !w.optional).map((w) => w.title).join(" · ") || "Mobility only"]} value={workItems.length ? fracOf(workItems) : 1} onClick={() => go("workout")} />
            <CategoryCard title="Golf" photo={PHOTO.range} photoPos="40% 40%" meta={golfItems.length ? `${golfItems.filter((i) => i.done).length}/${golfItems.length}` : "Off"} lines={[golfItems.length ? plan.focus : "No golf today"]} value={golfItems.length ? fracOf(golfItems) : 1} onClick={() => go("golf")} />
          </div>
          <Section heading={`Right now · ${todayKey} ${fmtHour(hourNow)}`} collapsible defaultOpen={false}>
            <Properties items={[
              { label: "Now", value: currentBlock ? `${fmtRange(currentBlock.s, currentBlock.e)}: ${currentBlock.t}` : hourNow < 6 ? "Sleep. Up at 6:00." : "Sleep. Lights out." },
              { label: "Next", value: nextBlock ? `${fmtHour(nextBlock.s)}: ${nextBlock.t}` : "Tomorrow, 6:00 wake" },
              { label: "Today's focus", value: plan.focus },
              { label: "Program week", value: programWeek > 0 ? `Week ${programWeek} of 12 · ${phaseName}` : "Not started" },
              { label: "Next Testing Day", value: nextTest ? (nextTest === todayIso ? "Today" : `${shortDate(nextTest)} (Wednesday)`) : "Set new dates after Feb 10" },
              { label: "Reminders", value: "Chat reminders: about 6:00 AM (morning plan) and about 9:30 PM (evening check-in)" },
            ]} />
            {currentBlock && currentBlock.routine && <Button variant="primary" label={`Start guided ${ROUTINES[currentBlock.routine].label.toLowerCase()}`} onClick={() => openStretch(currentBlock.routine)} />}
            {currentBlock && !currentBlock.routine && currentBlock.k && !rec.c[currentBlock.k] && <Button variant="primary" label={`Done: ${labelFor(plan, currentBlock.k)}`} onClick={() => toggle(currentBlock.k as CheckKey)} />}
            {!store.startDate && <Button label="Start week 1 today" onClick={() => setStore((s) => ({ ...s, startDate: todayIso }))} />}
          </Section>

          {isTestingDay && (
            <Section heading="Testing Day today">
              <Text>Only the 5-min warm-up this morning, then the tests at 6:30. Mobility score at 9:00 AM (Pliability or GOWOD), then the hip mini-block at 9:15. No TheStack training session today.</Text>
              <Button variant="primary" label="Open Testing Day on the Tests tab" onClick={() => go("assess")} />
            </Section>
          )}

          <Section heading="Streaks">
            <Metrics metrics={[
              { value: `${dayStreak}`, label: "Day streak", detail: "Days with 70% or more done" },
              { value: `${mobStreak}`, label: "Mobility streak", detail: "Days in a row" },
              { value: `${bedStreak}`, label: "Bed by 10 streak", detail: "Nights in a row" },
              { value: `${drillStreak}`, label: "Drill streak", detail: "Drill days with at least one drill ticked" },
            ]} />
            {checkInDays > 0 && <Text>{`${checkInDays} check-in days logged so far. A missed day resets a streak, not your progress.`}</Text>}
          </Section>

          {weekHasData && <Section heading="This week, % of checklist done"><Columns points={weekPoints} emphasis={mondayOffset} /></Section>}
          {heatHasData && <Section heading="Last 6 weeks"><CalendarHeatmap days={heatDays} max={100} note="Share of each day's checklist done" /></Section>}

          <Section heading={`Today's timeline (${todayKey})`} caption="Suggested times; shift any block to fit your day." collapsible defaultOpen={false}>
            <DayView start={6} end={23} events={routineEvents} mark={hourNow >= 6 && hourNow <= 23 ? { at: hourNow, label: "Now" } : undefined} />
          </Section>

          <Section heading="Safety note">
            <Callout tone="info">This is general fitness guidance, not medical advice. Check with a doctor or physio before ramping up intensity, especially after a long lifting layoff. Pain (not effort) means stop and get it checked.</Callout>
            <Text>{saved ? "Your check-ins are saved on this phone only. Export a backup now and then (Log tab)." : "This browser is not allowing storage here, so check-ins last only while the app stays open."}</Text>
          </Section>
        </Fragment>
      )}

      {nav === "daily" && (
        <Fragment>
          <div style={{ margin: "0 -16px", padding: "calc(env(safe-area-inset-top) + 12px) 20px 20px", borderRadius: "0 0 28px 28px", background: "#000", color: "#fff", display: "flex", alignItems: "flex-end", gap: 18 }}>
            <img src={PHOTO.daily} alt="Quote: You are allowed to think about the worst possible scenario. But then you got to go out there and do something about it. Jalen Brunson" width={389} height={514} style={{ display: "block", height: 210, width: "auto", aspectRatio: "389 / 514", flex: "0 0 auto", borderRadius: 14 }} />
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: "34px" }}>Daily</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "2px 0 18px" }}>Mobility, hips, sleep, food</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.8, color: DAILY_ACCENT, fontVariantNumeric: "tabular-nums" }}>{`${dailyItems.filter((i) => i.done).length}/${dailyItems.length}`}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>done</span>
              </div>
              <Bar value={fracOf(dailyItems)} color={DAILY_ACCENT} track="rgba(255,255,255,0.16)" />
            </div>
          </div>
          {isTestingDay && (
            <Section heading="Testing Day today">
              <Text>Only the 5-min warm-up this morning, then the tests at 6:30. Mobility score at 9:00 AM (Pliability or GOWOD), then the hip mini-block at 9:15. No TheStack training session today.</Text>
              <Button variant="primary" label="Open Testing Day on the Tests tab" onClick={() => go("assess")} />
            </Section>
          )}

          <Section heading="Daily habits">
            <TapList items={dailyItems} onTap={toggle} onOpenMobility={isTestingDay ? undefined : () => openStretch()} />
          </Section>
          <div id="timer" style={{ scrollMarginTop: 12 }} />

          <Section heading="Pick a routine">
            <Segmented<RoutineKey> options={[{ value: "daily", label: liftDay ? "Daily · 18 min" : "Daily · 20 min" }, { value: "warmup", label: "Warm-up · 5" }, { value: "sunday", label: "Sunday · 26" }]} value={routine === "dailylift" ? "daily" : routine} onChange={(v) => setRoutine(v)} />
            <Text>{`${ROUTINES[effRoutine].when}. Total ${mmss(routineSecs(effRoutine))}. Press Start; the timer moves through each move by itself, shows which side to do, and buzzes (Android) at each change.`}</Text>
          </Section>
          {(effRoutine === "daily" || effRoutine === "dailylift") && (
            <Section heading="Daily rules">
              <BulletList items={[
                "Tue and Thu: skip the block 3 throws (the strength primer has throws).",
                "TheStack days (Mon, Wed, Sat): this routine plus the 4-min hip mini-block is your warm-up; TheStack starts at 6:34.",
                "Right after this routine: the 4-min daily hip mini-block (Today checklist / Drills > Hips).",
                "Sore today: drop the kettlebell single-leg RDL.",
              ]} />
            </Section>
          )}
          <Section heading={`${ROUTINES[effRoutine].label} · ${stretchDoneN} of ${ROUTINES[effRoutine].moves.length} done`}>
            <StretchPlayer key={effRoutine} moves={ROUTINES[effRoutine].moves} done={stretchDone} onSet={(id, v) => setStretch(effRoutine, id, v)} />
          </Section>
          {limited.length > 0 && <Section heading="Extra focus from your last test"><Table columns={["Limited screen", "Give these extra time"]} rows={limited.map((s) => [s.name, s.fix])} align={["start", "start"]} /></Section>}
          <Section heading="Mobility routines (print version)" collapsible defaultOpen={false}>
            <Section heading={`Daily mobility + strength · ${fmtRange(ROUTINES.daily.start, ROUTINES.daily.start + routineSecs("daily") / 3600)}`}><Table columns={["Time", "Move", "Sets x reps", "Cue"]} rows={stretchRows("daily", ROUTINES.daily.start)} /></Section>
            <Section heading={`Daily hip mini-block · 6:30-6:34 AM (6:28 Tue/Thu)`}><Table columns={["Time", "Exercise", "Sets x reps, rest", "Load"]} rows={sessionRows(at(HIP_MINI, T(6, 30)))} /></Section>
            <Section heading={`5-min dynamic warm-up · ${fmtRange(ROUTINES.warmup.start, ROUTINES.warmup.start + routineSecs("warmup") / 3600)} before rounds`}><Table columns={["Time", "Move", "Sets x reps", "Cue"]} rows={stretchRows("warmup", ROUTINES.warmup.start)} /></Section>
            <Section heading={`Sunday long stretch · ${fmtRange(ROUTINES.sunday.start, ROUTINES.sunday.start + routineSecs("sunday") / 3600)}`}><Table columns={["Time", "Stretch", "Rounds x hold", "Cue"]} rows={stretchRows("sunday", ROUTINES.sunday.start)} /></Section>
            <Text>Block 1 opens the range, block 2 builds strength in it, block 3 uses it at speed. Holds are seconds per side unless marked; back off if anything pinches.</Text>
          </Section>
          <Section heading="Energy, focus, notes">
            <Rating label="Energy (1 low, 5 high)" value={rec.energy} onPick={(n) => updateToday({ energy: n })} />
            <Rating label="Focus (1 low, 5 high)" value={rec.focus} onPick={(n) => updateToday({ focus: n })} />
            <Input label="One line about today" value={rec.notes || ""} placeholder="Sore back, great wedges, slept badly..." onChange={(v) => updateToday({ notes: v })} />
          </Section>

          {todayKey === "Sun" && (
            <Section heading="Weekly review (5 min)">
              <Input label="1. What went well this week?" value={rec.win || ""} onChange={(v) => updateToday({ win: v })} />
              <Input label="2. What got in the way?" value={rec.fix || ""} onChange={(v) => updateToday({ fix: v })} />
              <Input label="3. One thing to change next week" value={rec.next || ""} onChange={(v) => updateToday({ next: v })} />
              <Text>Then book next week's tee times: Monday 18 holes at about 1:15 PM and Friday 9 holes at about 3:15 PM (back to 18 on Fridays from about mid-March). Prep food for Monday and Tuesday. Good moment to export a backup (Log tab).</Text>
            </Section>
          )}

          <MenuRow icon="food" title="Food + water guide" sub="Protein, water, meal timing" onClick={() => go("food")} />
          {!store.startDate && <Button label="Start week 1 today" onClick={() => setStore((st) => ({ ...st, startDate: todayIso }))} />}
        </Fragment>
      )}

      {nav === "workout" && !curW && (
        <Fragment>
          <Hero photo={PHOTO.bunker} height={240} position="50% 40%" fade={false}>
            <HeroTitle title="Workouts" sub={workItems.length ? `${workItems.filter((i) => i.done).length} of ${workItems.length} ${workItems.length === 1 ? "session" : "sessions"} done today` : "No main session today: mobility and hips only"} />
          </Hero>
          {workItems.length > 0 && <Section heading="Today's sessions"><TapList items={workItems} onTap={toggle} /></Section>}
          <SectionTitle>Today</SectionTitle>
          {todayWorkouts.map((w) => { const n = w.s.items.length; const d = wDoneN(w); return <WorkoutCard key={w.id} title={w.title} badge={w.optional ? "Optional" : undefined} chips={[`${Math.round(sessMin(w.s as any))} min`, `${n} exercises`]} lines={[w.when]} value={d / n} progressLabel={`${d}/${n}`} thumb={wThumb(w)} fallback={w.fallback} onClick={() => { setDetail(w.id); setOpenEx(null); }} />; })}
          <SectionTitle>All workouts</SectionTitle>
          {otherWorkouts.map((w) => { const n = w.s.items.length; return <WorkoutCard key={w.id} title={w.title} badge={w.optional ? "Optional" : undefined} chips={[`${Math.round(sessMin(w.s as any))} min`, `${n} exercises`]} lines={[w.when]} value={0} progressLabel={`0/${n}`} thumb={wThumb(w)} fallback={w.fallback} onClick={() => { setDetail(w.id); setOpenEx(null); }} />; })}
          {workDrillsToday.length > 0 && (
            <Section heading={`Today's power + hip drills · ${workDrillsToday.filter((d) => drillDone[d.id]).length} of ${workDrillsToday.length}`} caption="Same drills as inside the sessions, with cues and finish lines." collapsible defaultOpen={false}>
              <DrillList drills={workDrillsToday} done={drillDone} onTap={toggleDrill} showDays={false} />
            </Section>
          )}
          <MenuRow icon="book" title="All drills + how-to demos" sub="Power, hips, golf, scores" onClick={() => go("drills")} />
        </Fragment>
      )}

      {nav === "workout" && curW && (() => { const w = curW; const n = w.s.items.length; const d = wDoneN(w); const pi = player; const pe = pi !== null ? w.s.items[pi] : null; return (
        <Fragment>
          <Hero photo={pi !== null && demoThumb(demoFor(pe)) ? demoThumb(demoFor(pe)) : wThumb(w) || PHOTO.bunker} height={280} position="center" onBack={() => { if (player !== null) setPlayer(null); else setDetail(null); }} />
          <div style={{ position: "relative", zIndex: 2, background: "var(--bg)", borderRadius: "28px 28px 0 0", margin: "-40px -16px 0", padding: "12px 16px 0", display: "grid", gap: 12 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto 2px" }} />
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, lineHeight: "32px" }}>{w.title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
              <Chip icon={I("clock", 13)} label={`${Math.round(sessMin(w.s as any))} min`} tone="accent" />
              <Chip icon={I("list", 13)} label={`${n} exercises`} tone="accent" />
              <Chip icon={I("calendar", 13)} label={w.when} />
              {d > 0 && <Chip icon={I("check", 13, 2.5)} label={`${d}/${n} done`} tone="ink" />}
            </div>
            {pi === null && <GoalText text={w.s.goal} />}
            {pi !== null && pe && (
              <Section heading={`Exercise ${pi + 1} of ${n}: ${pe.name}`}>
                <Properties items={[{ label: "Sets x reps", value: pe.dose }, { label: "Rest", value: pe.rest }, { label: "Load + cues", value: pe.load }]} />
                {DEMOS[demoFor(pe)] && <DemoBlock key={`p${pi}`} id={demoFor(pe)} defaultOpen={true} />}
                <Button variant="primary" label={pi < n - 1 ? "Done, next exercise" : "Done, finish workout"} onClick={() => { setRow(w, pi, true); if (pi < n - 1) setPlayer(pi + 1); else finishWorkout(w); }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button label="Back" onClick={() => setPlayer(Math.max(0, pi - 1))} />
                  <Button label="Skip" onClick={() => (pi < n - 1 ? setPlayer(pi + 1) : setPlayer(null))} />
                </div>
              </Section>
            )}
            {w.s.items.map((e, i) => { const id = demoFor(e); return (
              <Fragment key={i}>
                <ExerciseRow title={e.name} sub={`${e.dose}${e.rest && e.rest !== "-" ? ` · rest ${e.rest}` : ""} · ${e.min} min`} done={wRowDone(w, i)} active={pi === i || openEx === i} thumb={demoThumb(id)} fallback={id && DEMOS[id] ? "play" : w.fallback} onTap={() => setRow(w, i, !wRowDone(w, i))} onOpen={() => setOpenEx(openEx === i ? null : i)} />
                {openEx === i && pi === null && (
                  <div style={{ display: "grid", gap: 8, padding: "2px 6px 8px" }}>
                    <Text>{e.load}</Text>
                    {id && DEMOS[id] ? <DemoBlock key={`o${i}`} id={id} defaultOpen={!!demoThumb(id)} /> : null}
                  </div>
                )}
              </Fragment>
            ); })}
            {w.id === "strA" || w.id === "strB" ? <Callout tone="warning">Warm up first, stop 2 reps short of failure, flat back on every hinge, no pain.</Callout> : null}
            {w.id.startsWith("hip") || w.id === "primer" ? <Callout tone="warning">{HIP_SAFETY}</Callout> : null}
            <div style={{ height: 76 }} />
          </div>
          {pi === null && (
            <div style={{ position: "fixed", left: 0, right: 0, bottom: `calc(${NAV_BOTTOM} + ${NAV_H + 10}px)`, zIndex: 40, padding: "0 24px", pointerEvents: "none" }}>
              <button onClick={() => { const f = w.s.items.findIndex((_e, i) => !wRowDone(w, i)); setPlayer(f < 0 ? 0 : f); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", maxWidth: 420, margin: "0 auto", minHeight: 54, borderRadius: 27, border: "none", background: "var(--accent)", color: "#fff", fontSize: 16, fontWeight: 600, boxShadow: "0 8px 24px rgba(30,158,98,0.32)", cursor: "pointer" }}>{I("play", 14)}{d === 0 ? "Start" : d < n ? "Continue" : "Start again"}</button>
            </div>
          )}
        </Fragment>
      ); })()}

      {nav === "golf" && (
        <Fragment>
          <Hero photo={PHOTO.range} height={240} position="40% 40%" fade={false}>
            <HeroTitle title="Golf" sub={golfItems.length ? `${golfItems.filter((i) => i.done).length} of ${golfItems.length} golf sessions done today` : "No golf session today"} />
          </Hero>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard icon="gauge" label="Swing speed" value={`${lastSpeed}`} unit="mph" detail={`Best ${bestSpeed || lastSpeed} · goal 110`} />
            <StatCard icon="target" label="Wedge hits" value={wedgeHist.length ? `${wPct(wedgeHist[wedgeHist.length - 1])}%` : "-"} detail={wedgeHist.length ? `Last: Ladder ${wedgeHist[wedgeHist.length - 1].ladder}` : `Next: Ladder ${nextLadder}`} />
          </div>
          {golfItems.length > 0 && <Section heading="Today's golf"><TapList items={golfItems} onTap={toggle} /></Section>}
          {plan.checks.indexOf("wedges") >= 0 && (
            <Section heading={`Wedge ladder ${wedgeRec.ladder} · 30 min`} caption={`Alternates A/B each session (last: ${wedgePrev ? `${wedgePrev.ladder} on ${shortDate(wedgePrev.date)}` : "none yet, so A first"}). 5 min warm-up, then 30 shots. Hit = carry within 10% of the target.`}>
              <WedgeCounter rec={wedgeRec} canSwitch={true} onShot={wedgeShot} onUndo={wedgeUndo} onSwitch={wedgeSwitch} onFinish={wedgeFinish} />
            </Section>
          )}

          {todayGames.length > 0 && (
            <Section heading="Today's session scores">
              {todayGames.map((g) => { const b = bestOf(g); const ts = todayScore(g.id); return (
                <Fragment key={g.id}>
                  <Input label={`${g.name}: ${g.scoring}${b !== undefined ? ` · Best ${b}` : ""}${ts ? ` · Today ${ts.score}` : ""}`} type="number" value={gameDraft[g.id] || ""} onChange={(v) => setGameDraft({ ...gameDraft, [g.id]: v })} />
                  <Button label={`Save ${g.name}`} onClick={() => saveGame(g)} />
                </Fragment>
              ); })}
            </Section>
          )}

          {roundDay && (
            <Section heading={nineDay ? "Today's round · 9 holes, tee about 3:15 PM" : "Today's round · 18 holes, tee about 1:15 PM"}>
              {nineDay && <Callout tone="info">9 holes until spring because sunset is about 5 PM after the Nov 1 clock change. Switch back to 18 when daylight allows, around mid-March.</Callout>}
              {!nineDay && <Text>Done about 5:15, then a light dinner and nothing else tonight.</Text>}
              <Input label="One focus for this round" value={round.focus || ""} placeholder="Tempo, small target, commit to the club..." onChange={(v) => updateRound({ focus: v })} />
              <Input label={nineDay ? "9-hole score" : "18-hole score"} type="number" value={round.score || ""} onChange={(v) => updateRound({ score: v })} />
              <Input label="Greens in regulation (optional)" value={round.gir || ""} onChange={(v) => updateRound({ gir: v })} />
              <Input label="Total putts (optional)" value={round.putts || ""} onChange={(v) => updateRound({ putts: v })} />
              <Button variant="primary" label="Save round score" onClick={saveRound} />
            </Section>
          )}

          {golfDrillsToday.length > 0 && (
            <Section heading={`Today's golf drills · ${golfDrillsToday.filter((d) => drillDone[d.id]).length} of ${golfDrillsToday.length}`}>
              <DrillList drills={golfDrillsToday} done={drillDone} onTap={toggleDrill} showDays={false} />
            </Section>
          )}
          <Section heading="Log swing speed" caption="TheStack or Rapsodo max club speed (mph)">
            <Input label="Club speed (mph)" type="number" value={speedDraft} placeholder={`${lastSpeed}`} onChange={(v) => setSpeedDraft(v)} />
            <Button variant="primary" label="Save speed" onClick={addSpeed} />
            {speedLogs.length >= 2 && <LineChart points={lineFrom(speedLogs)} floor={Math.min(90, ...speedLogs.map((l) => l.value))} ceiling={Math.max(112, ...speedLogs.map((l) => l.value))} unit="mph" labels={["Club speed"]} secondary={{ label: "Goal 110", values: speedLogs.map(() => 110) }} format={(v) => `${v} mph`} />}
          </Section>
          <Section heading="Weekly golf" collapsible defaultOpen={false}>
            <Rows rows={ALL7.map((k) => { const pk = planFor(todayIso, k); const g = pk.checks.filter((c) => GOLF_KEYS.indexOf(c) >= 0); return { lead: k, title: g.length ? g.map((c) => labelFor(pk, c)).join(" · ") : "No golf", detail: pk.focus }; })} />
          </Section>
          <MenuRow icon="trend" title="Full log" sub="Speed, scores, wedge sessions, backup" onClick={() => go("log")} />
          <MenuRow icon="book" title="Golf drills + how-to" sub="Wedges, putting, sim" onClick={() => go("drills")} />
        </Fragment>
      )}

      {nav === "more" && tab === "menu" && (
        <Fragment>
          <ScreenTitle title="More" sub="Plan, history, tests and settings" />
          <MenuRow icon="calendar" title="Weekly plan" sub="Every day, minute by minute" onClick={() => setTab("plan")} />
          <MenuRow icon="trend" title="12 weeks" sub="Phases + progression rules" onClick={() => setTab("phases")} />
          <MenuRow icon="note" title="Log + backup" sub="Speed, lifts, scores, wedges, export/import, credits" onClick={() => setTab("log")} />
          <MenuRow icon="ruler" title="Tests" sub="Testing Days + mobility screens" onClick={() => setTab("assess")} />
          <MenuRow icon="food" title="Food" sub="Protein, water, meal timing" onClick={() => setTab("food")} />
          <MenuRow icon="book" title="Drills + how-to" sub="All drills, demos, scores" onClick={() => setTab("drills")} />
          <MenuRow icon="clock" title="Full day view" sub="Right now, timeline, full checklist" onClick={() => setTab("today")} />
          <MenuRow icon="settings" title="Settings" sub="Your name, dark mode" onClick={() => setTab("settings")} />
          <MenuRow icon="info" title="Credits + licenses" sub="Demo images and videos" onClick={() => setTab("log")} />
        </Fragment>
      )}
      {nav === "more" && tab !== "menu" && <ScreenTitle title={moreTitles[tab] || "More"} onBack={() => setTab("menu")} />}
      {nav === "more" && tab === "settings" && (
        <Fragment>
          <Section heading="Your name">
            <Input label="Shown on Home as 'Hi, ...'" value={ui.name || ""} placeholder="Golfer" onChange={(v) => setUi({ ...ui, name: v })} />
          </Section>
          <Section heading="Appearance">
            <Segmented<string> options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} value={ui.dark ? "dark" : "light"} onChange={(v) => setUi({ ...ui, dark: v === "dark" })} />
          </Section>
          <Section heading="About">
            <Text>Your plan data stays on this phone (Log + backup to export). Name and theme are stored separately and never touch your check-ins.</Text>
          </Section>
        </Fragment>
      )}
      {nav === "more" && tab === "today" && (
        <Fragment>
          <Section heading={`Right now · ${todayKey} ${fmtHour(hourNow)}`}>
            <Properties items={[
              { label: "Now", value: currentBlock ? `${fmtRange(currentBlock.s, currentBlock.e)}: ${currentBlock.t}` : hourNow < 6 ? "Sleep. Up at 6:00." : "Sleep. Lights out." },
              { label: "Next", value: nextBlock ? `${fmtHour(nextBlock.s)}: ${nextBlock.t}` : "Tomorrow, 6:00 wake" },
              { label: "Today's focus", value: plan.focus },
              { label: "Program week", value: programWeek > 0 ? `Week ${programWeek} of 12 · ${phaseName}` : "Not started" },
              { label: "Next Testing Day", value: nextTest ? (nextTest === todayIso ? "Today" : `${shortDate(nextTest)} (Wednesday)`) : "Set new dates after Feb 10" },
              { label: "Reminders", value: "Chat reminders: about 6:00 AM (morning plan) and about 9:30 PM (evening check-in)" },
            ]} />
            {currentBlock && currentBlock.routine && <Button variant="primary" label={`Start guided ${ROUTINES[currentBlock.routine].label.toLowerCase()}`} onClick={() => openStretch(currentBlock.routine)} />}
            {currentBlock && !currentBlock.routine && currentBlock.k && !rec.c[currentBlock.k] && <Button variant="primary" label={`Done: ${labelFor(plan, currentBlock.k)}`} onClick={() => toggle(currentBlock.k as CheckKey)} />}
            {!store.startDate && <Button label="Start week 1 today" onClick={() => setStore((s) => ({ ...s, startDate: todayIso }))} />}
          </Section>

          <Section heading={`Full checklist · ${doneCount} of ${items.length}`}>
            <ProgressBar value={doneCount / items.length} label={firstOpen ? `Next small win: ${firstOpen.label}` : "Everything done today. Nice work."} />
            <TapList items={items} onTap={toggle} onOpenMobility={isTestingDay ? undefined : () => openStretch()} />
          </Section>
        </Fragment>
      )}

      {nav === "more" && tab === "drills" && (
        <Fragment>
          <Section heading="Show">
            <Segmented<string>
              options={[{ value: "Today", label: `Today (${todayDrills.length})` }, { value: "Power", label: "Power" }, { value: "Hips", label: "Hips" }, { value: "Golf", label: "Golf + home" }, { value: "HowTo", label: "How-to" }, { value: "Scores", label: "Scores" }, { value: "All", label: "All" }]}
              value={drillView} onChange={(v) => setDrillView(v)}
            />
            <Text>Tap a drill when you reach its "done when" line. Ticks save to today's check-in.</Text>
          </Section>
          {drillView === "Today" && todayDrills.length > 0 && <Section heading={`${todayKey} drills · ${todayDrillsDone} of ${todayDrills.length}`}><DrillList drills={todayDrills} done={drillDone} onTap={toggleDrill} showDays={false} /></Section>}
          {drillView === "Today" && todayDrills.length === 0 && <Section heading={`${todayKey}: rest day`}><Text>No drills today by design. Do the Sunday long stretch and the weekly review.</Text></Section>}
          {(drillView === "Power" || drillView === "All") && (
            <Section heading="Power + athletic drills" caption="Max effort, full rest, conservative volume for the layoff; stop any rep that hurts.">
              <DrillList drills={DRILLS.filter((d) => d.group === "Power")} done={drillDone} onTap={toggleDrill} showDays={true} />
              <Text>Tuesday's primer is jumps, bounds, hops and the shot-put throw. Thursday keeps the upper-body and rotational power but cuts leg volume because Friday is a round. Box jumps never go on TheStack days. Kneeling-jump swaps are listed above as "Swap option".</Text>
            </Section>
          )}
          {(drillView === "Hips" || drillView === "All") && (
            <Section heading="Hips: internal rotation + control" caption="Conservative sets and reps; the videos didn't give any.">
              <Callout tone="warning">{HIP_SAFETY}</Callout>
              <BulletList items={[
                "Every day: 4-min hip mini-block right after the morning mobility routine (half-kneeling IR, quadruped band IR, supine 90/90 IR, isometric hip flexion; 1 set, about 1 min each). 6:30 most days, 6:28 Tue/Thu, 7:56 Sun, 9:15 on Testing Day (after the mobility test).",
                "Wed + Sat, 7:04-7:14 after TheStack: hip block. Skip the three IR drills if done in the morning and use the time for the counterbalanced squat, Copenhagen plank, banded rockbacks or anti-valgus split squat.",
                "Mon 1:00 + Fri 3:05, before the round: 4-min hip primer (a second dose, fine).",
                "No split squats or Copenhagens on Thu or Sun (the days before rounds).",
                "From the first video: band hip distractions mostly give temporary relief; active rotation work is the better use of your time.",
              ]} />
              <DrillList drills={DRILLS.filter((d) => d.group === "Hips")} done={drillDone} onTap={toggleDrill} showDays={true} />
              <LinkCards links={[
                { title: "Hip IR video", site: "youtube.com", href: "https://www.youtube.com/watch?v=PKDN2adjySY" },
                { title: "Hip rehab short", site: "youtube.com", href: "https://www.youtube.com/shorts/UiD0uKwbc10" },
              ]} />
            </Section>
          )}
          {(drillView === "Golf" || drillView === "All") && <Section heading="Golf + home practice"><DrillList drills={DRILLS.filter((d) => d.group === "Golf")} done={drillDone} onTap={toggleDrill} showDays={true} /></Section>}
          {(drillView === "Scores" || drillView === "All") && (
            <Section heading="Session scores and bests">
              <Table columns={["Score", "How it's scored", "Last", "Best", "Sessions"]} rows={GAMES.map((g) => { const rs = gameRecs(g.id); const b = bestOf(g); return [g.name, g.scoring, rs.length > 0 ? `${rs[rs.length - 1].score}` : "-", b !== undefined ? `${b}` : "-", `${rs.length}`]; })} align={["start", "start", "end", "end", "end"]} />
              <Text>One score per session: wedges (ladder hit %, on Today and the Log tab), putting (make 10), sim (GIR and proximity), rounds (score, on the Log tab), TheStack (best speed).</Text>
            </Section>
          )}
          {drillView === "HowTo" && (
            <Fragment>
              <Section heading="How-to demos" caption="Every exercise in the plan. Tap a thumbnail for a looping demo, or Watch how for a short video. Drill cards on the other views have the same demos.">
                <Text>Looping demos are bundled in the app and work offline. Videos open YouTube and need a connection.</Text>
              </Section>
              {HOWTO_GROUPS.map((g) => (
                <Section key={g.title} heading={g.title} collapsible defaultOpen={g.open}>
                  {g.items.map((it) => (
                    <div key={g.title + it.id} style={{ display: "grid", gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{it.name}</div>
                      {DEMOS[it.id] ? <DemoBlock id={it.id} /> : <div style={{ fontSize: 13, color: "var(--text3)" }}>{it.why || "No demo needed"}</div>}
                    </div>
                  ))}
                </Section>
              ))}
            </Fragment>
          )}
          <Section heading="Drills by day" collapsible defaultOpen={false}>
            <Table columns={["Day", "Drills"]} rows={DAY_ORDER.map((k) => { const ds = DRILLS.filter((d) => d.days.indexOf(k) >= 0).map((d) => d.name); return [k, ds.length > 0 ? ds.join(", ") : "Rest day"]; })} emphasis={DAY_ORDER.indexOf(todayKey)} align={["start", "start"]} />
          </Section>
        </Fragment>
      )}

      {nav === "more" && tab === "plan" && (
        <Fragment>
          <Section heading="The week at a glance">
            <Table columns={["Day", "Morning", "Evening"]} rows={DAY_ORDER.map((k) => [k, PLAN[k].am, PLAN[k].pm])} emphasis={DAY_ORDER.indexOf(todayKey)} />
            <Text>{`Real rounds: Monday 18 holes (free from 1 PM, tee about 1:15, done about 5:15, quiet evening) and Friday 9 holes (free from 3 PM, tee about 3:15, done about 5:15). Friday stays at 9 until spring because of the 5 PM sunset after the Nov 1 clock change; switch back to 18 around mid-March. TheStack runs Mon, Wed and Sat: never on consecutive days, never the day before a round, and Thursday's legs stay moderate before Friday's round. GSPro sim 18s are light (front tees, no driver), so Tuesday and Thursday evenings are fine; Saturday is the swap option. Testing Days (${TESTING_DATES.map(shortDate).join(", ")}) replace that Wednesday's TheStack session. Evenings finish by about 8:30.`}</Text>
          </Section>
          <Section heading="Workout plan">
            <Segmented<string> options={[...DAY_ORDER, { value: "All", label: "All 7 days" }, { value: "Test", label: "Testing Day" }]} value={planDay} onChange={(v) => setPlanDay(v)} />
            <Text>Opens on today. Pick "All 7 days" for the full plain version to screenshot or print.</Text>
          </Section>
          {planList.map((p) => (
            <Section key={p.testing ? "test" : p.key} heading={`${p.testing ? "Testing Day (Wed)" : p.key} · ${p.focus}`}>
              <Table columns={["Time", "Block"]} rows={buildBlocks(p).map((b) => [fmtRange(b.s, b.e), b.t])} />
              {[...p.parts].sort((a, b) => partStart(a) - partStart(b)).map((pt, i) => pt.kind === "stretch" ? (
                <Section key={`${p.key}-${i}`} heading={`${fmtRange(pt.start, partEnd(pt))} · ${ROUTINES[pt.routine].label}`}><Table columns={["Time", "Move", "Sets x reps", "Cue"]} rows={stretchRows(pt.routine, pt.start)} /></Section>
              ) : (
                <Section key={`${p.key}-${i}`} heading={`${fmtRange(pt.s.start, partEnd(pt))} · ${pt.s.name}`}><Table columns={["Time", "Exercise", "Sets x reps, rest", "Load"]} rows={sessionRows(pt.s)} /><Text>{pt.s.goal}</Text></Section>
              ))}
            </Section>
          ))}
        </Fragment>
      )}

      {nav === "more" && tab === "phases" && (
        <Fragment>
          <Section heading="Three 4-week phases">
            <Table columns={["Phase", "Lifting + power", "Speed work", "Speed goal"]} rows={[
              ["1. Foundation (wk 1-4)", "Bench 3x5 at 90-100 lb; trap bar light, +10 lb/week; power primers at bodyweight or light balls", "Restart TheStack; baseline 98 mph on 10/21/26; Testing Day 11/18", "Re-establish 98-100 mph"],
              ["2. Build (wk 5-8)", "Bench 4x5 at 100-110 lb; trap bar 4x5; standing then step-in overhead throws", "Next TheStack stage; Testing Day 12/16", "About 102 mph"],
              ["3. Power + speed (wk 9-12)", "Bench 3x3-5 at 110-120 lb; trap bar 3x3; light barbell for SL RDL hops if clean", "TheStack at full intent; Testing Day 1/13", "About 105 mph"],
              ["Beyond week 12", "Repeat the cycle from your new numbers", "Testing Day 2/10, then every 4 weeks", "Push toward 110 mph"],
            ]} />
          </Section>
          <Section heading="Speed goal path" caption="Goals, not guarantees. Progress varies; 110 mph may take longer than 12 weeks.">
            <LineChart points={[{ label: "10/21 baseline", value: 98 }, { label: "Wk 4", value: 100 }, { label: "Wk 8", value: 102 }, { label: "Wk 12", value: 105 }, { label: "Later", value: 110 }]} floor={95} ceiling={112} unit="mph" labels={["Goal"]} format={(v) => `${v} mph`} />
          </Section>
          <Section heading="Progression rules">
            <Steps steps={[
              { title: "Add weight only when it is easy", detail: "Bench +5 lb or trap bar +10 lb next week when every set felt RPE 7 or easier with clean form." },
              { title: "Hold or drop when it is not", detail: "Missed reps, bad sleep, or joint aches: repeat the weight, or drop 10% for a week." },
              { title: "Fresh legs for rounds", detail: "Thursday legs stay moderate and Friday morning is mobility only, because Friday is a round." },
              { title: "Testing Day every 4 weeks", detail: `${TESTING_DATES.map(shortDate).join(", ")}: club speed, broad jump, throws, chest pass, mobility score (Tests tab). That week, one less set per lift.` },
              { title: "Hamstrings: weak and tight, so go slow", detail: "3 s lowering on RDLs and curls builds strength through length. Add a little load or a rep every 1-2 weeks; stop if you cramp or feel sharp pain. Retest toe touch and active straight-leg raise every Testing Day." },
              { title: "Power is max effort, full rest", detail: "Stop a power set as soon as reps slow down; quality over volume." },
              { title: "No max-out testing needed", detail: "Track working weights; skip 1-rep maxes, especially after the layoff." },
            ]} />
          </Section>
          <Section heading="Before you ramp up"><Callout tone="info">General fitness guidance only. Get a doctor or physio to clear you before heavy, jumping or max-intent work, and stop any exercise that causes pain.</Callout></Section>
        </Fragment>
      )}

      {nav === "more" && tab === "log" && (
        <Fragment>
          <Section heading="Add an entry">
            <Select<LogKind> label="What" options={LOG_KINDS.map((k) => ({ value: k.value, label: k.label }))} value={logKind} onChange={(v) => setLogKind(v)} />
            <Input label="Value" type="number" value={logValue} placeholder={logKind === "speed" ? "98" : logKind === "hcp" ? "16" : ""} onChange={(v) => setLogValue(v)} />
            <Input label="Date (YYYY-MM-DD)" value={logDate} onChange={(v) => setLogDate(v)} />
            <Button variant="primary" label="Save entry" onClick={addLog} />
            {store.logs.length > 0 && <Button label="Undo last entry" onClick={undoLog} />}
          </Section>
          {speedLogs.length >= 2 ? (
            <Section heading="Driver club speed">
              <LineChart points={lineFrom(speedLogs)} floor={Math.min(90, ...speedLogs.map((l) => l.value))} ceiling={Math.max(115, ...speedLogs.map((l) => l.value))} unit="mph" labels={["Club speed"]} secondary={{ label: "Goal 110", values: speedLogs.map(() => 110) }} format={(v) => `${v} mph`} />
              <Text>{`Best so far: ${bestSpeed} mph. The first point is the 10/21/26 baseline: ${BASELINE_NOTE}`}</Text>
            </Section>
          ) : (
            <Section heading="Speed baseline · TheStack R-Speed, 10/21/26">
              <LineChart points={BASELINE_SWINGS} floor={88} ceiling={100} unit="mph" labels={["Swing speed"]} format={(v) => `${v} mph`} />
              <Text>{`Logged as your first speed entry: 98 mph max, 95 average. ${BASELINE_NOTE} Your trend chart starts here once you log the next session.`}</Text>
            </Section>
          )}
          {benchLogs.length >= 2 && <Section heading="Bench working weight"><LineChart points={lineFrom(benchLogs)} floor={0} ceiling={Math.max(225, ...benchLogs.map((l) => l.value))} unit="lb" labels={["Bench"]} format={(v) => `${v} lb`} /></Section>}
          {trapLogs.length >= 2 && <Section heading="Trap bar working weight"><LineChart points={lineFrom(trapLogs)} floor={0} ceiling={Math.max(225, ...trapLogs.map((l) => l.value))} unit="lb" labels={["Trap bar"]} format={(v) => `${v} lb`} /></Section>}
          <Section heading="Wedge ladder sessions" caption="Hit = carry within 10% of the target. Ladders alternate A (10-110 yd) and B (20-100 yd).">
            {wedgeHist.length >= 2 && <LineChart points={wedgeHist.slice(-12).map((w) => ({ label: `${shortDate(w.date)} ${w.ladder}`, value: wPct(w) }))} floor={0} ceiling={100} unit="%" labels={["Hit %"]} format={(v) => `${v}%`} />}
            {wedgeHist.length > 0 ? (
              <Table columns={["Date", "Ladder", "Hits", "%", "By target"]} rows={[...wedgeHist].reverse().slice(0, 12).map((w) => [shortDate(w.date), w.ladder, `${w.hits.reduce((a, b) => a + b, 0)}/${w.shots.reduce((a, b) => a + b, 0)}`, `${wPct(w)}%`, WEDGE_LADDERS[w.ladder].targets.map((y, i) => `${y}: ${w.hits[i] || 0}/${w.shots[i] || 0}`).join(", ")])} align={["start", "start", "end", "end", "start"]} />
            ) : <Text>{`No wedge sessions yet. The next one is Ladder ${nextLadder}; log shots on the Today tab on Wed, Thu or Sat.`}</Text>}
            <Table columns={["Ladder", "Targets (hit window)", "Shots"]} rows={(["A", "B"] as ("A" | "B")[]).map((l) => [l, WEDGE_LADDERS[l].targets.map((y) => `${y} (${winOf(y)})`).join(", "), `${WEDGE_LADDERS[l].shots} each = ${WEDGE_LADDERS[l].shots * WEDGE_LADDERS[l].targets.length}`])} align={["start", "start", "start"]} />
          </Section>
          {scoreLogs.length > 0 && <Section heading="Round scores and handicap"><Table columns={["Date", "Type", "Value"]} rows={scoreLogs.slice(0, 12).map((l) => [shortDate(l.date), l.note ? `${nameOf(l.kind)} · ${l.note}` : nameOf(l.kind), `${l.value}`])} /></Section>}
          {store.logs.length > 0 && <Section heading="Recent entries"><Table columns={["Date", "Type", "Value"]} rows={[...store.logs].reverse().slice(0, 10).map((l) => [shortDate(l.date), l.note ? `${nameOf(l.kind)} · ${l.note}` : nameOf(l.kind), `${l.value}${unitOf(l.kind) ? ` ${unitOf(l.kind)}` : ""}`])} /></Section>}
          <Section heading="Backup" caption="Everything lives on this phone only. Export now and then; import to restore or move to a new phone.">
            <Callout tone="info">Moving from the old flypod.page link? Each web address keeps its own data. On the old link, tap Export first, then open the new link (soulztek.github.io/golf-plan) and Import that file. The old link stops working on Nov 5.</Callout>
            <BackupBox store={store} onImport={(s) => setStore(s)} />
          </Section>
          <Section heading="Credits + licenses" collapsible defaultOpen={false}>
            <Text>{`Looping exercise demos: built from the start and end photos in free-exercise-db by yuhonas (github.com/yuhonas/free-exercise-db), released into the public domain under the Unlicense; data originally from wrkout/exercises.json (also Unlicense). Frames were resized and combined into animations for this app. Exercises used (${FEDB_USED.length}): ${FEDB_USED.join(", ")}.`}</Text>
            <Text>{`"Watch how" buttons only link to videos on YouTube; nothing is copied or embedded, and each video belongs to its channel: ${CREDIT_CHANNELS.join(", ")}. The two hip videos (Garrett Kuljian; Dr. Caleb Burgess, DPT) are the ones you shared.`}</Text>
            <Text>App icon and code made for this app. Demos show the general movement; follow the cues and loads in your plan, and stop if anything hurts.</Text>
          </Section>
        </Fragment>
      )}

      {nav === "more" && tab === "assess" && (
        <Fragment>
          <Section heading="Testing Day · every 4 weeks">
            <Properties items={[
              { label: "Next", value: nextTest ? (nextTest === todayIso ? "Today" : `${shortDate(nextTest)}/${nextTest.slice(2, 4)} (Wednesday)`) : "Pick new dates" },
              { label: "Schedule", value: TESTING_DATES.map(shortDate).join(", ") },
              { label: "Morning", value: "6:25 warm-up, 6:30-7:08 tests (replaces TheStack)" },
              { label: "Mobility score", value: "9:00 AM, Pliability or GOWOD; hip mini-block after, at 9:15" },
            ]} />
            <Steps steps={[
              { title: "TheStack R-Speed test", detail: "8 swings, GT2, barefoot air swings, same as the 10/21 baseline." },
              { title: "Rapsodo with a ball", detail: "5 max drives in shoes; record best club and ball speed." },
              { title: "Broad jump", detail: "3 attempts, measure heel to the start line, keep the best (inches)." },
              { title: "Rotational slam ball throw", detail: "Same ball every time; 3 per side, best distance each side (feet)." },
              { title: "Seated chest pass", detail: "Back against a wall, same ball, 3 attempts, best distance (feet)." },
              { title: "Toe touch + active straight-leg raise", detail: "Hamstring retest: how far from your toes, and ASLR degrees on each side (phone angle app)." },
              { title: "Mobility score at 9:00", detail: "Pliability or GOWOD; use the same app each time." },
            ]} />
          </Section>
          <Section heading="Record Testing Day results">
            {TEST_FIELDS.map((f) => <Input key={f.id} label={f.label} value={testDraft[f.id] || ""} onChange={(v) => setTestDraft({ ...testDraft, [f.id]: v })} />)}
            <Button variant="primary" label="Save Testing Day results" onClick={saveTests} />
            <Text>Saving also adds the R-Speed max and ball speed to the Log tab.</Text>
          </Section>
          <Section heading="Testing Day history">
            <Table columns={["Test", ...testHistory.map((r) => (r.date === BASELINE_TEST.date ? "10/21 base" : shortDate(r.date)))]} rows={TEST_FIELDS.map((f) => [f.label, ...testHistory.map((r) => r.v[f.id] || "-")])} align={["start", "end", "end", "end", "end", "end"]} />
          </Section>
          <Section heading="Baseline speed · 10/21/26" collapsible defaultOpen={false}>
            <Properties items={[
              { label: "Test", value: "TheStack app, R-Speed test" }, { label: "Driver", value: "Titleist GT2" }, { label: "Conditions", value: "Barefoot, indoors, air swings (no ball)" },
              { label: "Swings", value: "8" }, { label: "Max", value: "98 mph (swings 5 and 6)" }, { label: "Average", value: "95 mph" }, { label: "Min", value: "92 mph" },
            ]} />
            <LineChart points={BASELINE_SWINGS} floor={88} ceiling={100} unit="mph" labels={["Swing speed"]} format={(v) => `${v} mph`} />
            <Text>{`Swings 5-8 are exact from the app; swings 1-4 are estimates read off its chart. ${BASELINE_NOTE}`}</Text>
          </Section>
          <Section heading="Apps to measure mobility">
            <LinkCards links={[
              { title: "Pliability mobility test: phone-camera, full-body range-of-motion score in about 3 minutes", site: "home.pliability.com", href: "https://home.pliability.com/mobility-test" },
              { title: "GOWOD mobility test: guided 10-test self-assessment (about 12-15 min), overall score plus shoulders, overhead, thorax, hips, posterior chain and ankles", site: "gowod.app", href: "https://www.gowod.app/" },
              { title: "DRVN Golf Fitness Handicap: free, 5 golf-specific mobility tests", site: "drvngolf.com", href: "https://drvngolf.com/golf-fitness-handicap" },
            ]} />
            <Text>GOWOD's FAQ advises testing at least 2 hours after waking with no mobility work beforehand, and says a free account includes one test, so check the app for retest options. The official TPI screen needs a TPI-certified pro (MyTPI app). The screens below are a self-check you can film or measure with a phone angle app.</Text>
          </Section>
          <Section heading="Mobility screens (TPI-style)" caption="Retest on each Testing Day, filmed from the same spot.">
            <Table columns={["Screen", "How", "What good looks like"]} rows={SCREENS.map((s) => [s.name, s.how, s.good])} />
          </Section>
          <Section heading="If a screen is limited, these moves target it">
            <Table columns={["Screen", "Moves (Mobility tab)"]} rows={SCREENS.map((s) => [s.name, s.fix])} />
          </Section>
          <Section heading="Record today's screens">
            {SCREENS.map((s) => (
              <Fragment key={s.id}>
                <Select<string> label={s.name} options={RESULT_OPTS} value={draftAssess[s.id] || "Not tested"} onChange={(v) => setDraftAssess({ ...draftAssess, [s.id]: v })} />
                <Input label={`${s.name}: angle, seconds, or note`} value={assessNote[s.id] || ""} placeholder="e.g. L 40, R 30" onChange={(v) => setAssessNote({ ...assessNote, [s.id]: v })} />
              </Fragment>
            ))}
            <Button variant="primary" label={store.assess.length === 0 ? "Save as baseline" : "Save retest"} onClick={saveAssess} />
          </Section>
          {store.assess.length > 0 && (
            <Section heading="Screen history">
              <Table columns={["Screen", ...store.assess.slice(-3).map((a) => shortDate(a.date))]} rows={SCREENS.map((s) => [s.name, ...store.assess.slice(-3).map((a) => a.results[s.id] || "")])} />
            </Section>
          )}
        </Fragment>
      )}

      {nav === "more" && tab === "food" && (
        <Fragment>
          <Section heading="Protein"><BulletList items={["Aim for about 0.7-1.0 g of protein per lb of bodyweight per day, a common range for people strength training.", "Easiest way: a palm-to-hand-sized portion at every meal, plus one protein snack.", "Easy options: eggs, Greek yogurt, chicken, fish, lean beef, cottage cheese, a protein shake."]} /></Section>
          <Section heading="Water"><BulletList items={["Start the day with a full glass of water before coffee.", "Refill one bottle each morning, mid-work, and after work.", "Add a bottle on training days and during rounds; pale yellow urine is a simple check."]} /></Section>
          <Section heading="Meal timing around training">
            <Rows rows={[
              { lead: "6:00", title: "Before an early session", detail: "Something small if hungry: banana, toast, or yogurt." },
              { lead: "7:20", title: "After training", detail: "Real breakfast with protein and carbs by 8:00." },
              { lead: "4:00", title: "Before practice or a round", detail: "Snack: fruit plus protein, or a bar." },
              { lead: "Round", title: "Mon 18 (1:15) and Fri 9 (3:15)", detail: "Early lunch before Monday's round; snack at the turn and every few holes; light dinner after." },
              { lead: "Evening", title: "Dinner 2-3 hours before bed", detail: "On round nights keep it light so the 10:00 bedtime holds." },
            ]} />
          </Section>
          <Section heading="Simple rules, not a diet"><BulletList items={["Plate: half vegetables or fruit, a quarter protein, a quarter carbs.", "Keep caffeine to the morning and early afternoon so it does not fight bedtime.", "Keep alcohol light, especially the night before training or a round.", "Sunday meal prep makes Monday and Tuesday automatic.", "One off-plan meal is not a failure; the next meal is the reset."]} /></Section>
        </Fragment>
      )}
      </main>
      {nameSheet && (
        <div role="dialog" aria-modal="true" aria-label="Your name" onClick={() => setNameSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setUi({ ...ui, name: nameDraft.trim() }); setNameSheet(false); }} style={{ width: "100%", maxWidth: 520, background: "var(--card)", color: "var(--text)", borderRadius: "28px 28px 0 0", padding: "12px 20px calc(env(safe-area-inset-bottom) + 20px)", display: "grid", gap: 16, boxShadow: "0 -8px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)", margin: "0 auto" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={PHOTO.avatar} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: 28, display: "block" }} />
              <div><div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.3 }}>What should we call you?</div><div style={{ fontSize: 13, color: "var(--text3)" }}>{`Shown on Home as "Hi, ${nameDraft.trim() || "Golfer"}"`}</div></div>
            </div>
            <input autoFocus value={nameDraft} maxLength={30} placeholder="Golfer" aria-label="Your name" onChange={(e) => setNameDraft(e.target.value)} style={{ minHeight: 50, fontSize: 17, padding: "0 16px", borderRadius: 14, border: "none", background: "var(--fill2)", color: "var(--text)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setNameSheet(false)} style={{ minHeight: 50, borderRadius: 25, border: "none", background: "var(--fill2)", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button type="submit" style={{ minHeight: 50, borderRadius: 25, border: "none", background: "var(--ink)", color: "var(--on-ink)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Save</button>
            </div>
          </form>
        </div>
      )}
      <BottomNav value={nav} onChange={(v) => { setDetail(null); setPlayer(null); if (v === "more" && nav === "more") setTab("menu"); setNav(v); }} />
    </div>
  );
}
