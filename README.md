# The Assembly Line

**An industrial engineering approach to agentic software development.**

The Assembly Line organizes Claude Code instances into a six-station production pipeline where each station follows a written work instruction with defined inputs, outputs, quality gates, and escalation triggers. The human never works on the line — the human designs the line.

```
  HUMAN (engineer, product owner, escalation handler)
    │
    ▼                                         ┌── Andon ──▶ HUMAN
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Station 1│→│ Station 2│→│ Station 3│→│ Station 4│→│ Station 5│→│ Station 6│→ main
│ Intake   │  │ Design  │  │ Build   │  │ Test    │  │ Review  │  │ Merge   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Quick Start

```bash
# Clone into your project
git clone https://github.com/YOUR_USERNAME/assembly-line.git .assembly-line-src
cp -r .assembly-line-src/stations .assembly-line-src/controller .assembly-line-src/CLAUDE.md .

# Initialize
node controller/assembly-line.js init

# Add work (choose a route: standard, fast, or spike)
node controller/assembly-line.js add "Add user authentication" --priority high
node controller/assembly-line.js add "Fix null check in login" --route fast
node controller/assembly-line.js add "Explore caching strategies" --route spike
node controller/assembly-line.js start UNIT-001

# Spawn a Claude Code worker (headless)
node controller/assembly-line.js spawn 1

# Or spawn interactively (prints the prompt to paste)
node controller/assembly-line.js spawn 1 --interactive

# When station completes, advance to next station
node controller/assembly-line.js advance UNIT-001
node controller/assembly-line.js spawn 2
# ... repeat through all 6 stations

# Monitor
node controller/assembly-line.js status
node controller/assembly-line.js workers
node controller/assembly-line.js logs
node controller/assembly-line.js andon list
node controller/assembly-line.js metrics
```

## How It Works

Work flows through stations along a **route**. Each station is a Claude Code instance following a [work instruction](stations/):

| Route | Stations | Use For |
|-------|----------|---------|
| `standard` | 1 → 2 → 3 → 4 → 5 → 6 | Features, large changes (default) |
| `fast` | 1 → 3 → 4 → 5 → 6 | Bug fixes, small changes, config updates (skips Design) |
| `spike` | 1 → 3 | Exploration and discovery (produces a report, not a merge) |

| Station | Role | WIP Limit | Output |
|---------|------|-----------|--------|
| 1 — Intake | Decompose request into structured spec | 3 | Spec with GIVEN/WHEN/THEN acceptance criteria |
| 2 — Design | Create implementation plan with exact file changes | 2 | Plan with numbered implementation order |
| 3 — Build | Implement following the plan exactly | 3 | Feature branch with clean commits |
| 4 — Test | Write and run tests for every AC and edge case | 3 | Test report with PASS/FAIL verdict |
| 5 — Review | Fresh-eyes review for correctness, security, perf | 2 | Review with APPROVED/CHANGES_REQUESTED/NEEDS_REDESIGN |
| 6 — Merge | Rebase, run CI, merge to main | 1 | Merged code + completion metrics |

Key principles borrowed from manufacturing:

- **Takt time** — target cycle time per station; measure and optimize bottlenecks
- **Standard work** — written, versioned work instructions; the intelligence is in the instruction, not the worker
- **Jidoka** — every station has Andon triggers that stop work and escalate rather than guessing
- **Kanban** — WIP limits prevent overload; downstream pulls when ready
- **Poka-yoke** — structured unit JSON schema enforces valid handoffs between stations
- **Kaizen** — every Andon pull becomes a work instruction update; the line improves every cycle

## The Spawn Command

The controller launches Claude Code workers in two modes:

**Headless** (default) — runs `claude -p` with the station's work instruction as the system prompt, streams progress to your terminal, logs everything, and detects completion signals:

```bash
node controller/assembly-line.js spawn 3           # Pick first available unit
node controller/assembly-line.js spawn 3 UNIT-001   # Specific unit
node controller/assembly-line.js spawn 3 --model opus --max-turns 80
node controller/assembly-line.js spawn-all          # Launch workers at all stations
```

**Interactive** — generates the exact prompt and `claude` command for you to paste:

```bash
node controller/assembly-line.js spawn 3 --interactive
```

## Configuration

| Env Variable | Default | Purpose |
|-------------|---------|---------|
| `ASSEMBLY_LINE_MODEL` | `sonnet` | Claude model for workers |
| `ASSEMBLY_LINE_MAX_TURNS` | `50` | Max agentic turns per worker |
| `ASSEMBLY_LINE_PERMISSION_MODE` | `acceptEdits` | Claude Code permission mode |

## Project Structure

```
your-project/
├── CLAUDE.md                    # System-level rules (read by all stations)
├── controller/
│   └── assembly-line.js         # Line controller CLI (zero dependencies)
├── stations/
│   ├── station-1.md             # Work instruction: Requirements Intake
│   ├── station-2.md             # Work instruction: Architecture & Design
│   ├── station-3.md             # Work instruction: Implementation
│   ├── station-4.md             # Work instruction: Testing
│   ├── station-5.md             # Work instruction: Code Review
│   └── station-6.md             # Work instruction: Integration & Merge
├── docs/
│   ├── README.md                # Conceptual guide
│   └── MANIFESTO.md             # The Assembly Line Manifesto
└── .assembly-line/              # Created by `init` (gitignored)
    ├── board/                   # Kanban board (backlog, station-1..6, done)
    ├── specs/                   # Station 1 output
    ├── plans/                   # Station 2 output
    ├── reviews/                 # Station 4 + 5 output
    ├── andon/                   # Escalation alerts
    ├── metrics/                 # Completion data
    ├── workers/                 # Worker state, prompts, signals
    └── logs/                    # Worker session logs
```

## The Human's Four Roles

You never work on the line. You:

1. **Industrial Engineer** — design stations, write work instructions, define quality gates
2. **Product Owner** — decide what gets built, feed requirements, prioritize
3. **Quality Inspector** — sample outputs, track defect trends, root-cause analysis
4. **Escalation Handler** — respond to Andon pulls, update work instructions

## Requirements

- [Claude Code](https://code.claude.com) installed and authenticated
- Node.js 18+ (for the controller CLI)
- A Claude Pro, Max, or API subscription

## Read More

- [The Assembly Line Manifesto](docs/MANIFESTO.md) — the full argument for why manufacturing principles apply to agentic development
- [Conceptual Guide](docs/README.md) — detailed explanation of the manufacturing principles and scaling strategy

## License

MIT
