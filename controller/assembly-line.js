#!/usr/bin/env node

/**
 * Assembly Line Controller v0.2 — Production-Ready Spawn
 *
 * Orchestrates Claude Code instances as station workers on an assembly line.
 * The controller is a deterministic state machine. The intelligence is in the
 * station work instructions and the Claude instances that execute them.
 *
 * Commands:
 *   init                    Initialize .assembly-line directory
 *   add <title>             Add unit to backlog (--priority high|medium|low)
 *   start <id>              Move unit from backlog to Station 1
 *   advance <id>            Move unit to next station
 *   reject <id> <station>   Return unit to earlier station
 *   status                  Show board state with takt time warnings
 *   andon list|pull|resolve Manage escalation alerts
 *   metrics                 Show throughput and quality data
 *   spawn <station> [id]    Launch a Claude Code worker at a station
 *   spawn-all               Launch workers at all stations with pending work
 *   logs [station]          Tail worker logs
 *   workers                 Show active/completed workers
 */

const fs = require("fs");
const path = require("path");
const { spawn: cpSpawn, execSync } = require("child_process");

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  baseDir: ".assembly-line",
  stations: {
    1: { name: "Requirements Intake", wipLimit: 3, parallel: false },
    2: { name: "Architecture & Design", wipLimit: 2, parallel: false },
    3: { name: "Implementation", wipLimit: 3, parallel: true },
    4: { name: "Testing", wipLimit: 3, parallel: true },
    5: { name: "Code Review", wipLimit: 2, parallel: false },
    6: { name: "Integration & Merge", wipLimit: 1, parallel: false },
  },
  routes: {
    standard: { stations: [1, 2, 3, 4, 5, 6], description: "Full pipeline — features, large changes" },
    fast:     { stations: [1, 3, 4, 5, 6],    description: "Skip Design — bug fixes, small changes, config" },
    spike:    { stations: [1, 3],              description: "Explore only — produces a report, not a merge" },
  },
  targetCycleTimes: { 1: 15, 2: 30, 3: 60, 4: 30, 5: 15, 6: 10 },
  claude: {
    model: process.env.ASSEMBLY_LINE_MODEL || "sonnet",
    maxTurns: parseInt(process.env.ASSEMBLY_LINE_MAX_TURNS || "50", 10),
    permissionMode: process.env.ASSEMBLY_LINE_PERMISSION_MODE || "acceptEdits",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// File System
// ═══════════════════════════════════════════════════════════════════════════

const DIRS = {
  board: {
    backlog: "board/backlog", "station-1": "board/station-1",
    "station-2": "board/station-2", "station-3": "board/station-3",
    "station-4": "board/station-4", "station-5": "board/station-5",
    "station-6": "board/station-6", done: "board/done",
  },
  specs: "specs", plans: "plans", reviews: "reviews",
  andon: "andon", metrics: "metrics", stations: "stations",
  logs: "logs", workers: "workers",
};

function R(...p) { return path.join(CONFIG.baseDir, ...p); }
function ensureDir(d) { const f = R(d); if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true }); }
function ensureAllDirs() {
  for (const d of Object.values(DIRS.board)) ensureDir(d);
  for (const [, d] of Object.entries(DIRS)) { if (typeof d === "string") ensureDir(d); }
}
function ts() { return new Date().toISOString(); }

function readUnit(id) {
  for (const [key, dir] of Object.entries(DIRS.board)) {
    const p = path.join(R(dir), `${id}.json`);
    if (fs.existsSync(p)) return { unit: JSON.parse(fs.readFileSync(p, "utf8")), location: key, path: p };
  }
  return null;
}

function writeUnit(unit, loc) {
  ensureDir(DIRS.board[loc]);
  fs.writeFileSync(path.join(R(DIRS.board[loc]), `${unit.id}.json`), JSON.stringify(unit, null, 2));
}

function moveUnit(id, from, to) {
  const fromPath = path.join(R(DIRS.board[from]), `${id}.json`);
  ensureDir(DIRS.board[to]);
  const toPath = path.join(R(DIRS.board[to]), `${id}.json`);
  const unit = JSON.parse(fs.readFileSync(fromPath, "utf8"));
  unit.status = to;
  unit.history.push({ timestamp: ts(), from, to, event: "moved" });
  fs.writeFileSync(toPath, JSON.stringify(unit, null, 2));
  fs.unlinkSync(fromPath);
  return unit;
}

function genId() {
  const all = [];
  for (const dir of Object.values(DIRS.board)) {
    const d = R(dir);
    if (fs.existsSync(d)) all.push(...fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => f.replace(".json", "")));
  }
  const max = all.map(id => parseInt(id.replace("UNIT-", ""), 10)).filter(n => !isNaN(n)).reduce((m, n) => Math.max(m, n), 0);
  return `UNIT-${String(max + 1).padStart(3, "0")}`;
}

function stationWip(n) {
  const d = R(DIRS.board[`station-${n}`]);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(".json")).length : 0;
}

function stationUnits(n) {
  const d = R(DIRS.board[`station-${n}`]);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(d, f), "utf8")));
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompt Builder
// ═══════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(n) {
  const p = R("stations", `station-${n}.md`);
  if (!fs.existsSync(p)) { console.error(`Missing: ${p}`); process.exit(1); }
  return fs.readFileSync(p, "utf8");
}

function buildUserPrompt(n, unit) {
  const alDir = path.resolve(CONFIG.baseDir);

  const common = `ASSEMBLY LINE CONTEXT:
You are Station ${n} (${CONFIG.stations[n].name}) on the Assembly Line.
Processing unit ${unit.id}: "${unit.title}"
Unit JSON: ${path.join(alDir, DIRS.board[`station-${n}`], unit.id + ".json")}
Assembly Line dir: ${alDir}
Project root: ${process.cwd()}

RULES:
1. Read your work instruction (it is in your system prompt above). Follow it EXACTLY.
2. Read the root CLAUDE.md at ${path.join(process.cwd(), "CLAUDE.md")} if it exists.
3. If you hit an Andon trigger: STOP. Write an Andon report to ${path.join(alDir, "andon")}/ANDON-${unit.id}-station-${n}.json with fields: unit_id, station, trigger, question, context, timestamp, resolved(false). Then write ${path.join(alDir, "workers")}/ANDON-${unit.id}-station-${n}.json with the same data. Then STOP working.
4. When you complete ALL work for your station: update the unit JSON with your station's output fields, then write ${path.join(alDir, "workers")}/DONE-${unit.id}-station-${n}.json with: {"status":"done","unit":"${unit.id}","station":${n},"timestamp":"<ISO>"}
5. Do NOT advance the unit to the next station. The controller handles that.
`;

  const ctx = {
    1: `INPUT: Raw request: "${unit.title}" | Priority: ${unit.priority || "medium"}
TASK: Decompose into structured spec → write to ${path.join(alDir, "specs", unit.id + ".md")}
Update unit JSON station_1 fields: acceptance_criteria, edge_cases, dependencies, spec_file, completed.`,

    2: `INPUT: Spec at ${unit.station_1?.spec_file || path.join(alDir, "specs", unit.id + ".md")}
TASK: Produce implementation plan → write to ${path.join(alDir, "plans", unit.id + ".md")}
Read the spec. Read every file it references. Design the approach. Specify exact file changes with signatures.
Update unit JSON station_2 fields: files_to_change, interfaces, plan_file, completed.`,

    3: `INPUT: Spec at ${unit.station_1?.spec_file || path.join(alDir, "specs", unit.id + ".md")}
Plan at ${unit.station_2?.plan_file || path.join(alDir, "plans", unit.id + ".md")}
TASK: Implement following the plan's implementation order EXACTLY.
Branch: feature/${unit.id}-${unit.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}
Commit format: "${unit.id}: Step N — description"
Update unit JSON station_3 fields: branch, commits, started, completed.
GOLD-PLATING RULE: Do NOT add anything beyond what the plan specifies.`,

    4: `INPUT: Spec at ${unit.station_1?.spec_file || path.join(alDir, "specs", unit.id + ".md")}
Plan (test strategy) at ${unit.station_2?.plan_file || path.join(alDir, "plans", unit.id + ".md")}
Branch: ${unit.station_3?.branch || `feature/${unit.id}`}
TASK: git checkout ${unit.station_3?.branch || `feature/${unit.id}`}
Write tests for every acceptance criterion and edge case. Run them.
Write report to ${path.join(alDir, "reviews", unit.id + "-tests.md")} with verdict PASS or FAIL.
Commit tests to the branch.`,

    5: `INPUT: Spec at ${unit.station_1?.spec_file || path.join(alDir, "specs", unit.id + ".md")}
Plan at ${unit.station_2?.plan_file || path.join(alDir, "plans", unit.id + ".md")}
Test report at ${path.join(alDir, "reviews", unit.id + "-tests.md")}
Branch: ${unit.station_3?.branch || `feature/${unit.id}`}
TASK: Review the diff: git diff main...${unit.station_3?.branch || `feature/${unit.id}`}
Evaluate: correctness, security, performance, maintainability, conformance.
Write review to ${path.join(alDir, "reviews", unit.id + "-review.md")}
Verdict: APPROVED, CHANGES_REQUESTED (→ return to Station 3), or NEEDS_REDESIGN (→ return to Station 2).`,

    6: `INPUT: Branch ${unit.station_3?.branch || `feature/${unit.id}`} (APPROVED by Station 5)
TASK: Rebase onto main, run full CI, merge with --no-ff.
Write completion metrics to ${path.join(alDir, "metrics", unit.id + "-complete.json")}`,
  };

  return common + "\n" + (ctx[n] || "");
}

// ═══════════════════════════════════════════════════════════════════════════
// Spawn
// ═══════════════════════════════════════════════════════════════════════════

function spawnWorker(n, unitId, opts = {}) {
  const station = CONFIG.stations[n];

  // Find unit
  let result;
  if (unitId) {
    result = readUnit(unitId);
    if (!result) { console.error(`Unit ${unitId} not found.`); process.exit(1); }
    if (result.location !== `station-${n}`) {
      console.error(`${unitId} is at ${result.location}, not station-${n}.`); process.exit(1);
    }
  } else {
    const units = stationUnits(n);
    if (!units.length) { console.log(`No units at Station ${n}.`); return null; }
    result = { unit: units[0] };
    unitId = result.unit.id;
  }

  const unit = result.unit;
  const model = opts.model || CONFIG.claude.model;
  const maxTurns = opts.maxTurns || CONFIG.claude.maxTurns;

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  SPAWNING WORKER — Station ${n}: ${station.name}`);
  console.log(`  Unit: ${unitId} — ${unit.title}`);
  console.log(`  Model: ${model} | Max turns: ${maxTurns}`);
  console.log(`${"═".repeat(65)}\n`);

  // Build prompts
  const systemPrompt = buildSystemPrompt(n);
  const userPrompt = buildUserPrompt(n, unit);

  // Write system prompt to file for --append-system-prompt-file
  ensureDir("workers");
  const sysFile = R("workers", `SYS-${unitId}-S${n}.md`);
  fs.writeFileSync(sysFile, systemPrompt);

  // Write prompt to file for reference/interactive use
  const promptFile = R("workers", `PROMPT-${unitId}-S${n}.md`);
  fs.writeFileSync(promptFile,
    `# Station ${n} Prompt for ${unitId}\n\n` +
    `## Quick Start (Interactive)\n\n` +
    `\`\`\`bash\ncd ${process.cwd()}\nclaude --model ${model} --append-system-prompt-file ${path.resolve(sysFile)}\n\`\`\`\n\n` +
    `Then paste the prompt below.\n\n---\n\n${userPrompt}`
  );

  // ── Interactive Mode ──
  if (opts.interactive) {
    console.log("┌─ Interactive Mode ─────────────────────────────────────┐");
    console.log("│ Start claude and paste the prompt.                     │");
    console.log("└───────────────────────────────────────────────────────┘\n");
    console.log(`  cd ${process.cwd()}`);
    console.log(`  claude --model ${model} --append-system-prompt-file ${path.resolve(sysFile)}\n`);
    console.log(`  Prompt file: ${path.resolve(promptFile)}\n`);

    const workerFile = R("workers", `WORKER-${unitId}-S${n}.json`);
    fs.writeFileSync(workerFile, JSON.stringify({
      station: n, unit_id: unitId, started: ts(), status: "interactive", pid: "manual",
    }, null, 2));

    return { mode: "interactive", promptFile: path.resolve(promptFile) };
  }

  // ── Headless Mode ──
  ensureDir("logs");
  const logFile = R("logs", `${unitId}-S${n}-${Date.now()}.log`);

  const claudeArgs = [
    "-p", userPrompt,
    "--model", model,
    "--max-turns", String(maxTurns),
    "--output-format", "stream-json",
    "--verbose",
    "--permission-mode", CONFIG.claude.permissionMode,
    "--append-system-prompt-file", path.resolve(sysFile),
    "--allowedTools", "Read,Write,Edit,Bash,Grep,Glob",
  ];

  console.log(`  Log: ${logFile}`);
  console.log(`  Launching claude -p ...\n`);

  const logStream = fs.createWriteStream(logFile, { flags: "a" });
  logStream.write(`# Worker Log | Station ${n} | ${unitId} | ${ts()} | Model: ${model}\n\n`);

  const child = cpSpawn("claude", claudeArgs, {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  // Record worker
  const workerFile = R("workers", `WORKER-${unitId}-S${n}.json`);
  fs.writeFileSync(workerFile, JSON.stringify({
    station: n, unit_id: unitId, pid: child.pid, started: ts(), status: "running",
  }, null, 2));

  let sessionId = null, totalCost = 0, numTurns = 0;

  // Stream processing
  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      logStream.write(line + "\n");
      try {
        const ev = JSON.parse(line);

        if (ev.type === "result") {
          sessionId = ev.session_id;
          totalCost = ev.total_cost_usd;
          numTurns = ev.num_turns;

          // Update worker
          const w = JSON.parse(fs.readFileSync(workerFile, "utf8"));
          w.session_id = sessionId; w.status = "completed"; w.completed = ts();
          w.cost_usd = totalCost; w.num_turns = numTurns;
          fs.writeFileSync(workerFile, JSON.stringify(w, null, 2));
        }

        // Live progress
        if (!opts.quiet && ev.type === "assistant" && ev.message?.content) {
          for (const b of ev.message.content) {
            if (b.type === "tool_use") {
              const cmd = b.input?.command ? `: ${String(b.input.command).substring(0, 60)}` : "";
              process.stdout.write(`  [S${n}/${unitId}] 🔧 ${b.name}${cmd}\n`);
            } else if (b.type === "text" && b.text?.trim()) {
              const l = b.text.split("\n")[0].substring(0, 80);
              if (l.trim()) process.stdout.write(`  [S${n}/${unitId}] 💬 ${l}\n`);
            }
          }
        }
      } catch {}
    }
  });

  child.stderr.on("data", (chunk) => {
    logStream.write(`[STDERR] ${chunk}`);
    if (!opts.quiet) process.stderr.write(`  [S${n}/${unitId}] ⚠️  ${chunk}`);
  });

  child.on("close", (code) => {
    logStream.write(`\n# Exit: ${code} | Session: ${sessionId} | Cost: $${totalCost?.toFixed(4)} | Turns: ${numTurns} | ${ts()}\n`);
    logStream.end();

    console.log(`\n${"─".repeat(65)}`);
    console.log(`  Worker done: S${n}/${unitId} | Exit: ${code} | $${totalCost?.toFixed(4)} | ${numTurns} turns`);

    // Check signals
    const donePath = R("workers", `DONE-${unitId}-station-${n}.json`);
    const andonPath = R("workers", `ANDON-${unitId}-station-${n}.json`);

    if (fs.existsSync(donePath)) {
      console.log(`  ✓ Complete. Run: node ${process.argv[1]} advance ${unitId}`);
    } else if (fs.existsSync(andonPath)) {
      const a = JSON.parse(fs.readFileSync(andonPath, "utf8"));
      console.log(`  🚨 Andon: ${a.trigger}`);
      console.log(`  Question: ${a.question}`);
    } else {
      console.log(`  ⚠️  No signal. Check log: ${logFile}`);
      if (sessionId) console.log(`  Resume: claude --resume ${sessionId} -p "Continue work on ${unitId}"`);
    }
    console.log(`${"─".repeat(65)}\n`);
  });

  child.on("error", (err) => {
    if (err.code === "ENOENT") {
      console.error("\n  ✗ 'claude' not found. Install: https://code.claude.com");
      console.error(`  Or use: node ${process.argv[1]} spawn --interactive ${n}`);
    } else {
      console.error(`\n  ✗ Spawn failed: ${err.message}`);
    }
    logStream.end();
  });

  return { mode: "headless", pid: child.pid, logFile };
}

// ═══════════════════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════════════════

const commands = {
  init() {
    console.log("Initializing Assembly Line...\n");
    ensureAllDirs();
    for (const [n, s] of Object.entries(CONFIG.stations)) {
      const f = R("stations", `station-${n}.md`);
      console.log(`  ${fs.existsSync(f) ? "✓" : "✗"} Station ${n}: ${s.name}`);
    }
    let cv;
    try { cv = execSync("claude --version 2>/dev/null", { encoding: "utf8" }).trim(); } catch {}
    console.log(`\n  Claude Code: ${cv || "NOT FOUND"}`);
    console.log(`  Model: ${CONFIG.claude.model} (ASSEMBLY_LINE_MODEL)`);
    console.log(`\n✓ Initialized.\n`);
  },

  add(args, flags) {
    const title = args.join(" ");
    if (!title) { console.error("Usage: add <title> [--priority high|medium|low] [--route standard|fast|spike]"); process.exit(1); }
    const route = flags.route || "standard";
    if (!CONFIG.routes[route]) { console.error(`Unknown route: ${route}. Valid: ${Object.keys(CONFIG.routes).join(", ")}`); process.exit(1); }
    const id = genId();
    const mkStation = () => ({ rationale: [] });
    const unit = {
      id, title, status: "backlog", created: ts(),
      priority: flags.priority || "medium",
      route,
      station_1: mkStation(), station_2: mkStation(), station_3: mkStation(),
      station_4: mkStation(), station_5: mkStation(), station_6: mkStation(),
      history: [{ timestamp: ts(), event: "created" }],
    };
    writeUnit(unit, "backlog");
    console.log(`✓ ${id}: "${title}" (${unit.priority}, route: ${route})`);
  },

  start(args) {
    const id = args[0];
    if (!id) { console.error("Usage: start <unit-id>"); process.exit(1); }
    const r = readUnit(id);
    if (!r) { console.error(`${id} not found.`); process.exit(1); }
    if (r.location !== "backlog") { console.error(`${id} at ${r.location}.`); process.exit(1); }
    const w = stationWip(1);
    if (w >= CONFIG.stations[1].wipLimit) { console.error(`Station 1 at WIP limit.`); process.exit(1); }
    moveUnit(id, "backlog", "station-1");
    console.log(`✓ ${id} → Station 1 (${w + 1}/${CONFIG.stations[1].wipLimit})`);
  },

  advance(args) {
    const id = args[0];
    if (!id) { console.error("Usage: advance <unit-id>"); process.exit(1); }
    const r = readUnit(id);
    if (!r) { console.error(`${id} not found.`); process.exit(1); }
    const cur = parseInt(r.location.replace("station-", ""), 10);
    if (isNaN(cur)) { console.error(`${id} at ${r.location}.`); process.exit(1); }

    const route = r.unit.route || "standard";
    const routeStations = CONFIG.routes[route]?.stations || CONFIG.routes.standard.stations;
    const curIdx = routeStations.indexOf(cur);

    // Current station is the last in the route — move to done
    if (curIdx === routeStations.length - 1 || cur === 6) {
      moveUnit(id, `station-${cur}`, "done");
      if (route === "spike") {
        console.log(`✅ ${id} SPIKE COMPLETE. Output is a report, not a merge.`);
      } else {
        console.log(`✅ ${id} DONE.`);
      }
      // Clean up done signal
      const doneFile = R("workers", `DONE-${id}-station-${cur}.json`);
      if (fs.existsSync(doneFile)) fs.unlinkSync(doneFile);
      return;
    }

    // Find next station in the route
    const nxt = routeStations[curIdx + 1];
    if (!nxt) { console.error(`Cannot determine next station for ${id} (route: ${route}, current: S${cur}).`); process.exit(1); }
    const w = stationWip(nxt);
    if (w >= CONFIG.stations[nxt].wipLimit) { console.error(`Station ${nxt} at WIP limit.`); process.exit(1); }
    const skipped = nxt - cur > 1 ? ` (skipping S${Array.from({length: nxt - cur - 1}, (_, i) => cur + 1 + i).join(", S")})` : "";
    moveUnit(id, `station-${cur}`, `station-${nxt}`);
    console.log(`✓ ${id}: S${cur} → S${nxt} (${CONFIG.stations[nxt].name})${skipped} [${route}]`);
    // Clean up done signal from previous station
    const doneFile = R("workers", `DONE-${id}-station-${cur}.json`);
    if (fs.existsSync(doneFile)) fs.unlinkSync(doneFile);
  },

  reject(args) {
    const [id, tgt] = args;
    const t = parseInt(tgt, 10);
    if (!id || isNaN(t)) { console.error("Usage: reject <id> <station>"); process.exit(1); }
    const r = readUnit(id);
    if (!r) { console.error(`${id} not found.`); process.exit(1); }
    const cur = parseInt(r.location.replace("station-", ""), 10);
    if (t >= cur) { console.error(`Can't reject forward.`); process.exit(1); }
    moveUnit(id, `station-${cur}`, `station-${t}`);
    console.log(`↩ ${id}: S${cur} → S${t}`);
  },

  status() {
    console.log(`\n${"═".repeat(65)}\n  ASSEMBLY LINE STATUS\n${"═".repeat(65)}\n`);

    const bDir = R(DIRS.board.backlog);
    const bCount = fs.existsSync(bDir) ? fs.readdirSync(bDir).filter(f => f.endsWith(".json")).length : 0;
    console.log(`  📋 BACKLOG: ${bCount}\n`);

    for (const [n, s] of Object.entries(CONFIG.stations)) {
      const w = stationWip(n), lim = s.wipLimit;
      const bar = "█".repeat(w) + "░".repeat(lim - w);
      console.log(`  Station ${n}: ${s.name}  [${bar}] ${w}/${lim}`);

      for (const u of stationUnits(n)) {
        const last = u.history?.[u.history.length - 1];
        const mins = last ? Math.round((Date.now() - new Date(last.timestamp).getTime()) / 60000) : 0;
        const takt = mins > CONFIG.targetCycleTimes[n] ? " ⚠️ OVER" : "";
        const wf = R("workers", `WORKER-${u.id}-S${n}.json`);
        let ws = "";
        if (fs.existsSync(wf)) { const wd = JSON.parse(fs.readFileSync(wf, "utf8")); ws = ` 🤖 ${wd.status}`; }
        const rt = u.route && u.route !== "standard" ? ` [${u.route}]` : "";
        console.log(`    → ${u.id}: ${u.title} (${mins}m${takt})${ws}${rt}`);
      }
      console.log();
    }

    const dDir = R(DIRS.board.done);
    const dCount = fs.existsSync(dDir) ? fs.readdirSync(dDir).filter(f => f.endsWith(".json")).length : 0;
    console.log(`  ✅ DONE: ${dCount}\n`);

    // Pending signals
    const wDir = R("workers");
    if (fs.existsSync(wDir)) {
      const dones = fs.readdirSync(wDir).filter(f => f.startsWith("DONE-"));
      const andons = fs.readdirSync(wDir).filter(f => f.startsWith("ANDON-"));
      if (dones.length || andons.length) {
        console.log("  📬 PENDING SIGNALS:");
        for (const f of dones) {
          const d = JSON.parse(fs.readFileSync(path.join(wDir, f), "utf8"));
          console.log(`    ✓ ${d.unit} S${d.station} → run: advance ${d.unit}`);
        }
        for (const f of andons) {
          const d = JSON.parse(fs.readFileSync(path.join(wDir, f), "utf8"));
          console.log(`    🚨 ${d.unit} S${d.station}: ${d.trigger}`);
        }
        console.log();
      }
    }

    console.log(`${"═".repeat(65)}`);
  },

  spawn(args, flags) {
    const n = parseInt(args[0], 10);
    if (isNaN(n) || !CONFIG.stations[n]) {
      console.error("Usage: spawn <station> [unit-id] [--interactive] [--model X] [--quiet]");
      process.exit(1);
    }
    const uid = args[1] && !args[1].startsWith("-") ? args[1] : null;
    spawnWorker(n, uid, {
      interactive: flags.interactive || flags.i,
      model: flags.model,
      maxTurns: flags["max-turns"] ? parseInt(flags["max-turns"]) : undefined,
      force: flags.force,
      quiet: flags.quiet || flags.q,
    });
  },

  "spawn-all"(args, flags) {
    console.log("Scanning stations...\n");
    let count = 0;
    for (const [n, s] of Object.entries(CONFIG.stations)) {
      const units = stationUnits(n);
      if (!units.length) continue;
      // Check existing workers
      const wDir = R("workers");
      const active = fs.existsSync(wDir)
        ? fs.readdirSync(wDir).filter(f => f.startsWith(`WORKER-`) && f.includes(`-S${n}.json`))
            .map(f => JSON.parse(fs.readFileSync(path.join(wDir, f), "utf8")))
            .filter(w => w.status === "running").length
        : 0;

      const cap = s.parallel ? Math.min(units.length, s.wipLimit - active) : (active === 0 ? 1 : 0);
      if (cap <= 0) { console.log(`  S${n}: workers active, skip.`); continue; }

      for (let i = 0; i < cap; i++) {
        console.log(`  Spawning S${n} for ${units[i].id}...`);
        spawnWorker(parseInt(n), units[i].id, { quiet: true, interactive: flags.interactive, model: flags.model });
        count++;
      }
    }
    console.log(count ? `\n✓ Spawned ${count} workers.` : "\n  No work pending.");
  },

  logs(args) {
    const d = R("logs");
    if (!fs.existsSync(d)) { console.log("No logs."); return; }
    let files = fs.readdirSync(d).filter(f => f.endsWith(".log"));
    if (args[0]) files = files.filter(f => f.includes(args[0]));
    if (!files.length) { console.log("No matching logs."); return; }
    files.sort();
    const f = path.join(d, files[files.length - 1]);
    console.log(`\nTailing: ${f}\n${"─".repeat(65)}\n`);
    const lines = fs.readFileSync(f, "utf8").split("\n").slice(-50);
    console.log(lines.join("\n"));
    console.log(`\n${"─".repeat(65)}\nLive: tail -f ${f}`);
  },

  workers() {
    const d = R("workers");
    if (!fs.existsSync(d)) { console.log("No workers."); return; }
    const ws = fs.readdirSync(d).filter(f => f.startsWith("WORKER-")).map(f =>
      JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))
    );
    if (!ws.length) { console.log("No workers."); return; }
    console.log(`\n${"═".repeat(65)}\n  WORKERS\n${"═".repeat(65)}\n`);
    for (const w of ws) {
      const mins = Math.round((Date.now() - new Date(w.started).getTime()) / 60000);
      const icon = w.status === "running" ? "🤖" : w.status === "completed" ? "✓" : "⏸️";
      console.log(`  ${icon} S${w.station}/${w.unit_id} PID:${w.pid} ${mins}m $${w.cost_usd?.toFixed(4) || "?"} ${w.status}`);
    }
    console.log();
  },

  andon(args) {
    if (!args[0] || args[0] === "list") {
      const alerts = [];
      for (const dir of [R(DIRS.andon), R("workers")]) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir).filter(f => f.includes("ANDON") && f.endsWith(".json"))) {
          alerts.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
        }
      }
      const open = alerts.filter(a => !a.resolved);
      if (!open.length) { console.log("\n✓ No Andon alerts.\n"); return; }
      console.log("\n🚨 ANDON ALERTS:\n");
      for (const a of open) {
        console.log(`  ${a.unit_id || a.unit} S${a.station}: ${a.trigger}`);
        if (a.question) console.log(`    Q: ${a.question}`);
        console.log();
      }
      return;
    }
    if (args[0] === "pull") {
      const [, uid, stn, ...msg] = args;
      ensureDir(DIRS.andon);
      const a = { id: `ANDON-${Date.now()}`, unit_id: uid, station: parseInt(stn), trigger: msg.join(" "), timestamp: ts(), resolved: false };
      fs.writeFileSync(path.join(R(DIRS.andon), `${a.id}.json`), JSON.stringify(a, null, 2));
      console.log(`🚨 ${a.id}`);
      return;
    }
    if (args[0] === "resolve") {
      const [, id, ...msg] = args;
      for (const dir of [R(DIRS.andon), R("workers")]) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
          if (f.includes(id)) {
            const p = path.join(dir, f);
            const a = JSON.parse(fs.readFileSync(p, "utf8"));
            a.resolved = true; a.resolution = msg.join(" "); a.resolved_at = ts();
            fs.writeFileSync(p, JSON.stringify(a, null, 2));
            console.log(`✓ Resolved: ${f}`);
            return;
          }
        }
      }
      console.error(`Not found: ${id}`);
    }
  },

  metrics() {
    const d = R(DIRS.metrics);
    if (!fs.existsSync(d)) { console.log("No metrics yet."); return; }
    const files = fs.readdirSync(d).filter(f => f.endsWith("-complete.json"));
    if (!files.length) { console.log("No completed units."); return; }
    const cs = files.map(f => JSON.parse(fs.readFileSync(path.join(d, f), "utf8")));
    console.log(`\n${"═".repeat(65)}\n  METRICS (${cs.length} units)\n${"═".repeat(65)}\n`);
    for (const [n, s] of Object.entries(CONFIG.stations)) {
      const t = cs.map(c => c.cycle_time?.[`station_${n}`]).filter(Boolean);
      if (t.length) {
        const avg = Math.round(t.reduce((a, b) => a + b, 0) / t.length);
        console.log(`  ${avg <= CONFIG.targetCycleTimes[n] ? "✓" : "⚠️"} S${n}: ${avg}m (target: ${CONFIG.targetCycleTimes[n]}m)`);
      }
    }
    const fpy = cs.filter(c => c.quality?.station_4_pass_first_attempt && c.quality?.station_5_pass_first_attempt).length;
    console.log(`\n  First-pass yield: ${Math.round((fpy / cs.length) * 100)}%`);
    const cost = cs.reduce((s, c) => s + (c.cost_usd || 0), 0);
    if (cost) console.log(`  Total cost: $${cost.toFixed(2)}`);
    console.log(`\n${"═".repeat(65)}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const args = [], flags = {};
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) { flags[k] = argv[++i]; }
      else { flags[k] = true; }
    } else if (argv[i].startsWith("-") && argv[i].length === 2) { flags[argv[i][1]] = true; }
    else { args.push(argv[i]); }
    i++;
  }
  return { args, flags };
}

const { args: pos, flags: fl } = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = pos;

if (!cmd || !commands[cmd]) {
  console.log(`
  Assembly Line — Agentic Software Development
  ${"═".repeat(50)}

  Setup:       init
  Work:        add <title> [--priority high|medium|low] [--route standard|fast|spike]
               start <id> | advance <id> | reject <id> <stn>
  Workers:     spawn <stn> [id] [--interactive] [--model X] [--quiet]
               spawn-all [--interactive] [--model X]
  Monitor:     status | workers | logs [filter] | metrics
  Escalation:  andon list | andon pull <id> <stn> <msg> | andon resolve <id> <msg>

  Routes:      standard — full 6-station pipeline (features, large changes)
               fast     — skip Station 2 (bug fixes, small changes)
               spike    — Stations 1→3 only (exploration, produces report not merge)

  Env: ASSEMBLY_LINE_MODEL=${CONFIG.claude.model} ASSEMBLY_LINE_MAX_TURNS=${CONFIG.claude.maxTurns}
  `);
  process.exit(0);
}

commands[cmd](rest, fl);
