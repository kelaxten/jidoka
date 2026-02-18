# The Assembly Line

### Industrial Engineering Applied to Agentic Software Development

---

## The Problem with Gastown

Steve Yegge's Gastown proved that multi-agent software development works. But it
proved it the way the Wright Brothers proved powered flight — by getting airborne
through sheer will, not through aeronautical engineering. Gastown is a frontier
town: creative, energetic, nondeterministic, and chaotic. It works for Yegge
because it fits the shape of his brain.

The Assembly Line takes the opposite approach. It borrows from 100 years of
manufacturing science to build a *regimented* system where:

- **Claude instances are workers at stations**, not autonomous agents in a swarm
- **The human is the industrial engineer**, not a line worker or "Mayor whisperer"
- **Quality is built into every station**, not bolted on at the end with PR review
- **Work flows through a deterministic pipeline**, not a nondeterministic swarm
- **Escalation is structured** (Andon cords), not ad hoc (noticing something's wrong)

---

## Core Concepts from Manufacturing

### The Station

Every piece of work passes through six stations in order. Each station has:

1. **A Claude instance** — the worker
2. **A work instruction** — the system prompt defining exactly what this station does
3. **An input spec** — what arrives (structured, validated)
4. **An output spec** — what leaves (structured, validated)
5. **A quality gate** — self-check before passing downstream
6. **Andon triggers** — conditions that stop work and escalate to the human

### Takt Time

The rhythm of the line. If you need to ship 3 features/day, your takt time is
~2.5 hours per feature. Monitor each station's cycle time against the target. When
a station consistently exceeds takt time, it's a bottleneck — add a parallel
worker or redesign the station.

### Jidoka (Autonomation)

"Automation with a human touch." Each station can STOP the line and escalate rather
than pass defective work downstream. A Claude instance that says "I can't do this
confidently, escalating" is more valuable than one that guesses.

### Kanban (Pull System)

Work is PULLED by downstream stations when they have capacity, not PUSHED by
upstream stations when they finish. WIP limits at each station prevent the token-
burning overload that plagues Gastown.

### Poka-Yoke (Error Proofing)

Structured interfaces between stations make it physically impossible to pass
malformed work downstream. If Station 1's output is missing acceptance criteria,
Station 2 literally cannot accept it.

### Kaizen (Continuous Improvement)

After every cycle, review: Which station had the most Andon pulls? Where did
defects accumulate? Which quality gate caught the most issues? Adjust work
instructions based on data, not gut feel.

---

## The Six Stations

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   HUMAN: Line Designer + Product Owner + Escalation Handler         │
│                                                                     │
│   Designs stations, feeds requirements, handles Andon alerts        │
│                                                                     │
└────────┬────────────────────────────────────────────────────┬───────┘
         │ requirements                            Andon ↑    │
         ▼                                         alerts     │
┌────────────────┐    ┌────────────────┐    ┌────────────────┐│
│   Station 1    │───▶│   Station 2    │───▶│   Station 3    ││
│   Requirements │    │   Architecture │    │ Implementation ││
│   Intake       │    │   & Design     │    │                ││
│                │    │                │    │  WIP: 3        ││
│  WIP: 3        │    │  WIP: 2        │    │  (parallel)    ││
└────────────────┘    └────────────────┘    └───────┬────────┘│
                                                    │         │
                                              ┌─────▼────┐    │
                                              │  reject   │    │
                                              └─────┬────┘    │
                                                    │         │
┌────────────────┐    ┌────────────────┐    ┌───────▼────────┐│
│   Station 6    │◀───│   Station 5    │◀───│   Station 4    ││
│   Integration  │    │   Code Review  │    │   Testing      ││
│   & Merge      │    │                │    │                ││
│                │    │  WIP: 2        │    │  WIP: 3        ││
│  WIP: 1        │    │                │    │  (parallel)    ││
└───────┬────────┘    └────────────────┘    └────────────────┘│
        │                                                     │
        ▼                                                     │
   [main branch]                                              │
                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Station 1: Requirements Intake

Takes raw human requests and produces structured, unambiguous task specifications.
The translator between product language and engineering language.

**Input:** Free text feature request, bug report, or refactor request
**Output:** Structured spec with GIVEN/WHEN/THEN acceptance criteria, edge cases,
dependencies, size estimate, and explicit out-of-scope boundaries.

### Station 2: Architecture & Design

Takes a structured spec and produces an implementation plan so detailed that
Station 3 can execute it mechanically without making design decisions.

**Input:** Structured spec from Station 1
**Output:** Implementation plan with exact file changes, function signatures,
interface contracts, integration points, test strategy, and numbered implementation order.

### Station 3: Implementation

Writes code that exactly matches the implementation plan. Follows the plan step
by step. Does not redesign. Does not gold-plate.

**Input:** Implementation plan from Station 2
**Output:** Code on a feature branch with clean commits referencing the unit ID.

### Station 4: Testing

Writes and runs tests against every acceptance criterion and edge case. Produces
a PASS/FAIL verdict. Does not fix defects — only finds them.

**Input:** Code on feature branch + acceptance criteria
**Output:** Test report with verdict. On FAIL, defect report returned to Station 3.

### Station 5: Code Review

Reviews the implementation with fresh eyes for correctness, security, performance,
maintainability, and conformance to the plan.

**Input:** Code + spec + plan + test report
**Output:** APPROVED (→ Station 6), CHANGES_REQUESTED (→ Station 3), or
NEEDS_REDESIGN (→ Station 2).

### Station 6: Integration & Merge

Rebases, runs full CI, and merges to main. The final quality gate.

**Input:** Approved code with passing tests
**Output:** Merged feature on main branch + completion metrics.

---

## The Human's Role

The human occupies four distinct roles but NEVER works on the line:

### 1. Industrial Engineer (Line Designer)

Design the stations. Write the work instructions. Define quality gates and Andon
triggers. This is the highest-leverage work — a well-designed line runs itself.

**Artifacts:** Station definitions, work instruction markdown files, quality gate
specs, Andon trigger definitions.

### 2. Product Designer (Demand Signal)

Decide WHAT gets built. Feed the line with requirements. Prioritize the backlog.

**Artifacts:** Feature specs, user stories, product roadmap.

### 3. Quality Inspector (Statistical Sampling)

Don't inspect every unit — sample. Review a percentage of outputs at each station.
Track defect rates. When rates spike, investigate root cause and adjust the line.

**Artifacts:** Quality dashboards, defect trends, root cause analyses.

### 4. Escalation Handler (Andon Responder)

When a station pulls the Andon cord, respond. This is the only time you touch
the work directly. After every escalation, update the work instruction so it
doesn't recur.

**Key discipline:** Every Andon pull should result in a work instruction update.
If you answer the same question twice, your line has a design defect.

---

## Getting Started

### 1. Initialize

```bash
node controller/assembly-line.js init
```

This creates the `.assembly-line/` directory structure and validates that station
work instructions are in place.

### 2. Add Work

```bash
node controller/assembly-line.js add "Add user authentication with email/password"
```

### 3. Start Processing

```bash
node controller/assembly-line.js start UNIT-001
```

### 4. Spawn Workers

```bash
# In separate terminals, spawn a Claude Code worker at each station:
node controller/assembly-line.js spawn 1   # Outputs the claude -p command
node controller/assembly-line.js spawn 2   # for each station
```

Or run Claude Code interactively and tell it which station it's working:

```
You are Station 1 (Requirements Intake) on the Assembly Line.
Read your work instruction at .assembly-line/stations/station-1.md
and the root CLAUDE.md. Then process unit UNIT-001.
```

### 5. Monitor

```bash
node controller/assembly-line.js status    # Board state + takt time warnings
node controller/assembly-line.js andon list # View escalation alerts
node controller/assembly-line.js metrics   # Throughput and quality data
```

---

## Scaling the Line

### Phase 1: Single-Piece Flow

One unit through all six stations sequentially. Get the work instructions right.
Tune the quality gates. This is your pilot line.

### Phase 2: Parallel Stations

Add parallel workers at bottleneck stations (usually Station 3). Two or three
Claude Code instances pulling from the same implementation queue.

### Phase 3: Multi-Unit Flow

Run multiple features through the line simultaneously. Kanban WIP limits prevent
overload. Each unit flows independently.

### Phase 4: Specialized Lines

Create variant lines for different work types:
- **Bug fix line:** Skip Station 2 (design) for simple fixes
- **Refactor line:** Enhanced Station 5 (review) with architectural focus
- **Feature line:** Full six-station pipeline

### Phase 5: Kaizen Loop

Instrument everything. Review weekly:
- Which station had the longest average cycle time?
- Which station had the most Andon pulls?
- What was the first-pass yield (units that passed Station 4 and 5 on first attempt)?
- Which work instruction updates had the most impact?

---

## Key Differences from Gastown

| Dimension | Gastown | Assembly Line |
|---|---|---|
| Metaphor | Frontier town with a Mayor | Factory with stations |
| Human role | Stage 7-8 cowboy | Industrial engineer |
| Agent autonomy | High — agents decide how | Bounded — follow work instructions |
| Work flow | Nondeterministic swarm | Deterministic pipeline |
| Quality | End-of-line PR review | Built in at every station |
| Escalation | Ad hoc | Structured Andon cords |
| Failure mode | Chaos, token burn | Bottleneck (predictable) |
| WIP control | None | Kanban limits per station |
| Optimization | Gut feel | Takt time + defect rate data |
| Onboarding | "Baptism by fire" | Read the station manual |

---

## The Fundamental Insight

**You are not training the agents — you are engineering the process.**

The Claude instances are interchangeable commodity workers. They don't need to be
"Stage 7-8 developers." They need clear work instructions, structured inputs,
defined quality gates, and a structured way to say "I'm stuck."

The intelligence lives in the line design. The work instructions get better every
cycle because every Andon pull becomes a work instruction update. Every defect
found downstream becomes a quality gate improvement upstream. The line learns,
even though the workers are stateless.

This is how manufacturing scaled from artisan workshops to assembly lines that
produce millions of units. This is how agentic development scales from "cowboy
coder with 20 Claude Code instances" to a repeatable, measurable, improvable system.

---

## File Structure

```
your-project/
├── .assembly-line/
│   ├── board/
│   │   ├── backlog/          # Unstarted units
│   │   ├── station-1/        # In progress at each station
│   │   ├── station-2/
│   │   ├── station-3/
│   │   ├── station-4/
│   │   ├── station-5/
│   │   ├── station-6/
│   │   └── done/             # Completed units
│   ├── specs/                # Station 1 output
│   ├── plans/                # Station 2 output
│   ├── reviews/              # Station 4 + 5 output
│   ├── andon/                # Escalation alerts
│   ├── metrics/              # Completion records
│   └── stations/             # Work instructions
│       ├── station-1.md
│       ├── station-2.md
│       ├── station-3.md
│       ├── station-4.md
│       ├── station-5.md
│       └── station-6.md
├── CLAUDE.md                 # Root config (references Assembly Line)
├── src/                      # Your actual codebase
└── ...
```
