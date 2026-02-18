# Assembly Line — Agentic Software Development System

## What This Is

This is the Assembly Line, a regimented system for agentic software development.
Claude instances are workers at stations on a manufacturing line. The human is the
industrial engineer who designed the line, not a worker on it.

## Core Invariants

1. **Work flows in one direction**: Intake → Design → Implementation → Testing → Review → Integration
2. **No station may pass defective work downstream** — if you cannot meet the output spec, pull the Andon cord
3. **Every station follows its work instruction** — no improvisation, no scope expansion
4. **The human is the escalation path, not a coworker** — escalate with structured context, not open-ended questions
5. **Quality is built in at every station** — do not rely on downstream stations to catch your mistakes

## System Architecture

```
[Human: Line Designer + Product Owner + Escalation Handler]
        |
        | (feeds requirements)
        v
[Station 1: Requirements Intake]
        |
        | (structured task spec)
        v
[Station 2: Architecture & Design]
        |
        | (implementation plan)
        v
[Station 3: Implementation]
        |
        | (code on feature branch)
        v
[Station 4: Testing]
        |
        | (test results + coverage)
        v
[Station 5: Code Review]
        |  \---> (reject: return to Station 3 with feedback)
        |
        | (approved code)
        v
[Station 6: Integration & Merge]
        |
        v
[main branch — shipped]
```

## Kanban Rules (WIP Limits)

- Station 1 (Intake): WIP limit 3
- Station 2 (Design): WIP limit 2
- Station 3 (Implementation): WIP limit 3 (parallelizable)
- Station 4 (Testing): WIP limit 3
- Station 5 (Review): WIP limit 2
- Station 6 (Integration): WIP limit 1

A station may NOT pull new work if it is at its WIP limit.

## Andon Protocol

When a station cannot proceed, it MUST:

1. STOP work on the current unit
2. Write an Andon report to `.assembly-line/andon/` with:
   - Station ID
   - Unit ID (task/feature identifier)
   - Trigger condition (which defined trigger was hit)
   - Context (what was attempted, what failed)
   - Specific question or decision needed from human
3. Do NOT guess. Do NOT proceed with assumptions. WAIT.

The human will respond with either:
- A resolution (answer + work instruction update)
- A redesign (unit sent back to an earlier station)
- A cancellation (unit removed from the line)

## File System Convention

```
.assembly-line/
├── board/                  # Kanban board state
│   ├── backlog/           # Unstarted units
│   ├── station-1/         # In-progress at each station
│   ├── station-2/
│   ├── station-3/
│   ├── station-4/
│   ├── station-5/
│   ├── station-6/
│   └── done/              # Completed units
├── andon/                 # Escalation reports
├── specs/                 # Output from Station 1
├── plans/                 # Output from Station 2
├── reviews/               # Output from Station 5
├── metrics/               # Throughput, cycle time, defect rates
└── stations/              # Work instructions (this directory)
    ├── station-1.md
    ├── station-2.md
    ├── station-3.md
    ├── station-4.md
    ├── station-5.md
    └── station-6.md
```

## Unit Schema (Poka-Yoke)

Every work unit is a JSON file that accumulates artifacts as it moves through stations.
A station CANNOT accept a unit missing required fields from upstream stations.

```json
{
  "id": "UNIT-001",
  "title": "Add user authentication",
  "status": "station-3",
  "created": "2026-02-16T10:00:00Z",
  "priority": "high",
  "station_1": {
    "completed": "2026-02-16T10:15:00Z",
    "acceptance_criteria": ["..."],
    "edge_cases": ["..."],
    "dependencies": ["..."],
    "spec_file": ".assembly-line/specs/UNIT-001.md"
  },
  "station_2": {
    "completed": "2026-02-16T10:30:00Z",
    "files_to_change": ["..."],
    "interfaces": ["..."],
    "plan_file": ".assembly-line/plans/UNIT-001.md"
  },
  "station_3": {
    "started": "2026-02-16T10:31:00Z",
    "branch": "feature/UNIT-001-user-auth",
    "commits": []
  },
  "history": [
    {"timestamp": "...", "station": 1, "event": "started"},
    {"timestamp": "...", "station": 1, "event": "completed"},
    {"timestamp": "...", "station": 2, "event": "started"}
  ]
}
```
