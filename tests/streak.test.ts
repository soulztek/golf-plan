import { streakInfo, isoDay, plusDays, rollReward, levelOf, rotationBlock } from "../src/adhd";
let fail = 0;
const eq = (name: string, got: any, want: any) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
// Today = Thu 2026-10-29. Week Mon 10/26 - Sun 11/1.
const today = new Date(2026, 9, 29);
const mk = (done: string[]) => (d: Date) => done.indexOf(isoDay(d)) >= 0;
const days = (offs: number[]) => offs.map((o) => isoDay(plusDays(today, o)));
// 1. One miss keeps the chain: done -5..-2, miss -1, today pending
eq("one miss keeps chain (today pending)", streakInfo(mk(days([-5, -4, -3, -2])), today).streak, 4);
eq("one miss keeps chain + today done", streakInfo(mk(days([-5, -4, -3, -2, 0])), today).streak, 5);
eq("missRun after one miss", streakInfo(mk(days([-5, -4, -3, -2])), today).missRun, 1);
// 2. Two misses end it. Misses on -2 (Tue) and -1 (Wed) are the same week -> freeze covers the 2nd one.
eq("two misses, freeze available -> covered", streakInfo(mk(days([-6, -5, -4, -3, 0])), today).streak, 5);
eq("freeze used this week", streakInfo(mk(days([-6, -5, -4, -3, 0])), today).freezeLeft, false);
// freeze already used earlier this week (Mon -3 & ... ) : Week Mon 10/26 (-3). Use 10/19 week for setup.
// Misses Mon -3 and Tue -2 (freeze covers Tue), done Wed -1? Then misses... build: done -10..-4, miss -3, miss -2 (frozen), done -1, today done
eq("freeze covers miss pair", streakInfo(mk(days([-10, -9, -8, -7, -6, -5, -4, -1, 0])), today).streak, 9);
// Now a second pair of misses in the same week: done -10..-5 (Mon 10/19..Sat 10/24), miss Sun -4? Use same week 10/26: miss Mon -3, Tue -2 (freeze), Wed -1 done, then today... need another pair in same week -> use earlier week instead.
// Week 10/19-10/25: offsets -10 (10/19 Mon) .. -4 (10/25 Sun). Done -14..-11, miss -10,-9 (freeze), done -8, miss -7,-6 (no freeze) -> chain ends; done -5..0 -> 6
eq("second miss pair in same week ends chain", streakInfo(mk(days([-14, -13, -12, -11, -8, -5, -4, -3, -2, -1, 0])), today).streak, 6);
// Two misses across a week boundary where the new week's freeze covers: done ..., miss Sun -4, miss Mon -3 (new week freeze) -> alive
eq("cross-week misses, freeze covers", streakInfo(mk(days([-8, -7, -6, -5, -2, -1, 0])), today).streak, 7);
// Three misses in a row: miss, frozen, miss -> ends
eq("three misses in a row end chain", streakInfo(mk(days([-8, -7, -6, -5, 0])), today).streak, 1);
// last14
eq("last14 count", streakInfo(mk(days([-20, -13, -5, -1, 0])), today).last14, 4);
// empty
eq("no data", streakInfo(mk([]), today).streak, 0);
// rewards ~40%
let n = 0; const N = 20000; for (let i = 0; i < N; i++) if (rollReward([])) n++;
eq("reward rate ~40%", Math.abs(n / N - 0.4) < 0.02, true);
eq("level at 0", levelOf(0).cur.name, "98 Start");
eq("level at 2600", levelOf(2600).cur.name, "100");
eq("rotation block 2", rotationBlock("2026-10-01", new Date(2026, 9, 25)).num, 2);
if (fail) { console.log(`${fail} FAILED`); process.exit(1); } else console.log("ALL PASS");
