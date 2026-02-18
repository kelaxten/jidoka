# The Assembly Line Manifesto

### On the Industrial Engineering of Agentic Software

*February 2026*

---

> *"We can solve any problem by introducing an extra level of indirection… except for the problem of too many levels of indirection."*
> — David Wheeler, paraphrased by half the industry

---

## 00 — Preface: The Factory Is Here

In January 2026, Steve Yegge launched Gastown and the discourse splintered. Half the industry called it insane. The other half called it inevitable. Both were right.

Gastown proved something important: you can point twenty Claude Code instances at a codebase and useful work comes out. Not yet reliable work, not yet predictable work, but real, demonstrable work. The factory metaphor was no longer theoretical.

The problem is that Yegge built a frontier town, not a factory. He built a place where a brilliant, experienced developer can wrangle a swarm of autonomous agents through force of will and improvisational skill. It requires what he calls a "Stage 7-8 developer" — someone who has already internalized decades of software craft and can pattern-match at the speed the agents produce code.

This is like saying Ford's assembly line requires a master machinist at every station.

The whole point of an assembly line is that it doesn't.

---

## 01 — Software Has Always Stolen from Manufacturing

Every paradigm shift in software development has been borrowed from a manufacturing insight. This is not a coincidence. Manufacturing has spent a century solving the problem of coordinating many workers toward a common output under uncertainty. Software pretends this is a new problem.

Waterfall came from the sequential assembly line. Requirements first, then design, then build, then test, then ship. Each stage completes before the next begins. It worked for the F-16. It failed for most software because software requirements aren't stable the way an aircraft spec is.

Agile came from Toyota's lean manufacturing — small batches, rapid iteration, continuous feedback. Scrum's sprint is a production cycle. The standup is a shift change. The retrospective is a kaizen event. The language was sanitized, but the bones are pure manufacturing.

DevOps came from continuous flow manufacturing — the insight that the handoff between "people who build" and "people who deploy" is a bottleneck that can be eliminated. CI/CD is literally a production line where code flows from commit to deployment through automated stations.

Each time, the analogy unlocked something the software industry couldn't see from inside its own frame. Each time, the manufacturing world had solved the problem decades earlier.

Now we stand at the next transition. AI agents can write code. Multiple agents can write code simultaneously. The question is not whether to use them — it's how to organize them. And once again, manufacturing has the answer.

---

> **The question is not whether agents can write code. It's whether you can build a system where agents writing code produces reliable outcomes.**

---

## 02 — Gastown: Contributions and Gaps

Gastown deserves credit. It is the first serious attempt at multi-agent orchestration for software development that actually ships working software. It introduced the Mayor pattern (a coordinator agent), persistent state through Beads, and the concept of agent colonies. These are real contributions.

But an industrial engineering lens exposes five structural gaps.

First: no standard work. Gastown's agents operate with broad role definitions — Polecat, Crew, Mayor — but without standardized procedures for each task type. In manufacturing, every station has a work instruction sheet that specifies exactly what the worker does, step by step, for each type of input. Gastown relies on the human operator's judgment where a factory would rely on written procedure.

Second: no takt time. There is no rhythm to the line. Agents fire asynchronously with no concept of cycle time, throughput targets, or bottleneck identification. Work accumulates unpredictably. Some agents churn while others starve. The system has no way to detect or resolve this imbalance because it has no concept of flow.

Third: quality is an afterthought. Yegge himself describes PRs arriving broken and needing manual repair. This is classic end-of-line inspection — the most expensive form of quality control. Toyota taught us sixty years ago: you build quality into the process at every station. You don't bolt it on at the end.

Fourth: no Andon cord. When a Gastown agent is stuck, confused, or off-track, there is no structured escalation mechanism. The human has to notice, diagnose, and intervene — if they're watching. The manufacturing equivalent is a factory with no way for a line worker to signal "I need help." Toyota solved this in the 1960s with a literal cord any worker could pull to stop the line.

Fifth: unbounded variation. Gastown embraces what Yegge calls "nondeterministic infrastructure" — the idea that agents may fail, retry, self-correct, and eventually converge. This is a philosophically honest acknowledgment of how LLMs work, but it lacks the engineering response that manufacturing developed for exactly this challenge. Manufacturing embraces statistical process control: you expect variation, but you engineer it within acceptable bounds. Gastown's variation is unbounded, and the outcome depends heavily on the human's ability to detect and correct problems in real time.

---

## 03 — The Assembly Line Model

We propose something different. Not better — different. Gastown is an organism. The Assembly Line is a machine. Gastown evolves. The Assembly Line is engineered.

The model is simple. Software work flows through a fixed sequence of stations. Each station is staffed by a Claude instance following a written work instruction. Each station has a defined input, a defined output, a quality gate, and a mechanism for stopping and escalating when something goes wrong. The human never works on the line. The human designs the line, feeds it requirements, handles escalations, and inspects a sample of outputs.

That's it. The rest is detail.

The six stations are: Requirements Intake, Architecture and Design, Implementation, Testing, Code Review, and Integration. Work enters as a raw human request and exits as merged, tested code on the main branch. Each station transforms the work unit and adds a structured artifact — a spec, a plan, code, tests, a review, a merge.

Every artifact has a schema. Every handoff has a validation step. If the upstream station produces malformed output, the downstream station cannot accept it. This is the manufacturing principle of poka-yoke — error-proofing through interface design. You make it physically impossible to pass a defective part to the next station.

```
HUMAN (Industrial Engineer + Product Owner + Escalation Path)
    │
    │ feeds requirements ──────────────── responds to Andon ←─┐
    ▼                                                         │
┌──────────┐   ┌──────────┐   ┌──────────┐                   │
│ Station 1 │──▶│ Station 2 │──▶│ Station 3 │───┐              │
│ Intake    │   │ Design   │   │ Build    │   │              │
└──────────┘   └──────────┘   └──────────┘   │              │
                                   ◀── reject ┘              │
┌──────────┐   ┌──────────┐   ┌──────────┐                   │
│ Station 6 │◀──│ Station 5 │◀──│ Station 4 │───── Andon ────▶│
│ Merge     │   │ Review   │   │ Test     │                   │
└────┬─────┘   └──────────┘   └──────────┘                   │
     │                                                        │
     ▼                                                        │
 [  main  ] ──────────────────────────────────────────────────┘
```

---

## 04 — The Worker and the Engineer

Here is the most important idea in this manifesto, and the one that will generate the most resistance:

The Claude instance is a line worker. It is not a colleague. It is not a junior developer. It is not an agent with autonomy. It is a skilled hand that follows a work instruction. When the instruction is good, the output is good. When the instruction is bad, the output is bad. The intelligence is in the instruction, not in the worker.

This sounds reductive. It is. That's the point.

When you treat an agent as a colleague, you expect it to exercise judgment. You expect it to notice when something is off and correct course. You expect it to have taste. Sometimes it does. Often it doesn't. And when it doesn't, you've shipped a defect that will cost you ten times more to fix downstream than it would have cost to prevent at the station.

When you treat an agent as a line worker, you invest your intelligence into the work instruction. You specify exactly what the station does, what it checks, when it escalates, and what it does not do. You build the judgment into the process, not the worker. The worker becomes interchangeable. Any Claude instance can staff any station, because the station is fully defined by its work instruction.

This is the insight that made manufacturing scale. A Ford assembly line worker didn't need to be a master machinist. They needed clear instructions, the right tools, and a foreman who would hear them when they said "something's wrong."

The human is that foreman. More precisely, the human is three things: the industrial engineer who designs the line, the product owner who decides what gets built, and the escalation handler who responds when a station pulls the Andon cord.

The human never tightens a bolt. The human designs the system that ensures bolts get tightened correctly.

---

> **The intelligence is in the instruction, not in the worker. This sounds reductive. It is. That's the point.**

---

## 05 — Six Principles from the Factory Floor

Manufacturing has a century of hard-won wisdom about coordinating workers under uncertainty. Six principles translate directly to agentic software development.

**Takt time** is the rhythm of the line — the pace at which units must move through each station to meet demand. If you need three features per day, your takt time is roughly 2.5 hours per feature. Every station must complete within this window. When a station consistently exceeds takt time, it is a bottleneck. You don't yell at the bottleneck. You add a parallel worker, simplify the work instruction, or break the station into two stations. Measurement replaces intuition.

**Standard work** means every station has a written, versioned, maintained work instruction. These are not guidelines. They are the process. When the worker deviates, it's a defect. When the instruction is wrong, you fix the instruction. The instruction improves through kaizen — structured, data-driven, continuous improvement — not through the worker "getting better at" an ambiguous task.

**Jidoka**, sometimes translated as "autonomation" or "automation with a human touch," means each station has the authority and the obligation to stop and escalate rather than pass defective work downstream. This is the Andon cord. A Claude instance that says "I cannot confidently complete this task, here is why, here is what I need" is infinitely more valuable than one that guesses and produces something that looks right but isn't. The key insight of jidoka is that stopping the line is not a failure. Passing a defect downstream is.

**Kanban**, the pull system, means downstream stations pull work when they have capacity, rather than upstream stations pushing work when they finish. This prevents the work-in-progress explosion that is Gastown's primary failure mode — twenty agents churning simultaneously on tasks that nobody is ready to review, test, or integrate. Each station has a WIP limit. When the limit is reached, the upstream station waits. This feels slow. It is faster. Always.

**Poka-yoke**, error-proofing, means designing the interfaces between stations so that malformed work physically cannot pass through. If Station 1's output is missing acceptance criteria, Station 2's input validation rejects it automatically. No human needs to notice. No agent needs to exercise judgment. The interface enforces correctness. This is the manufacturing equivalent of type systems, and it is equally underappreciated.

**Kaizen**, continuous improvement, means the line gets better every cycle. Not because the workers get smarter — they're stateless. Because the work instructions get better. Every Andon pull generates a work instruction update. Every defect found at Station 4 or 5 generates a quality gate improvement at Station 1, 2, or 3. The feedback loop is explicit, measured, and relentless.

---

## 06 — The Andon Cord Is the Whole Thing

If you take one idea from this manifesto, take this one: the Andon cord is the entire system.

Every other mechanism — the stations, the work instructions, the quality gates, the Kanban limits — exists to support one capability: the ability of a worker to say "I'm stuck" in a structured way, and the ability of the system to route that signal to a human who can resolve it and update the process so it doesn't happen again.

In Gastown, when an agent gets stuck, it does one of three things. It guesses and proceeds. It silently fails. Or the human notices and intervenes. Two of these three outcomes are bad. The third depends on the human being attentive, which is a poor engineering assumption.

In the Assembly Line, getting stuck is a first-class operation. Every station has defined Andon triggers — specific conditions under which the worker must stop and escalate. Not "when you feel confused." Not "when something seems wrong." Specific, enumerated conditions:

Station 1 pulls the cord when requirements are ambiguous, when the request conflicts with existing behavior, or when the request has security implications that require human judgment.

Station 3 pulls the cord when the implementation plan is infeasible, when a dependency doesn't exist, or when a discovered bug in existing code isn't accounted for in the plan.

Station 5 pulls the cord when it finds a security vulnerability that may exist in production, or when it discovers the spec itself is flawed.

The Andon report is structured: station ID, unit ID, trigger condition, context, and a specific question for the human. Not "help, I'm stuck." A specific, answerable question.

And here is the discipline that makes the whole system work: every Andon resolution must result in a work instruction update. If the human answers the same question twice, the line has a design defect. The question should have been anticipated and the answer should have been in the work instruction. The goal is not zero Andon pulls — that would mean the workers are guessing instead of asking. The goal is zero repeat Andon pulls. The line learns through its escalations, even though the workers are stateless.

---

> **Every Andon resolution must result in a work instruction update. If you answer the same question twice, your line has a design defect.**

---

## 07 — Why Separation of Concerns Is Not Optional

The Assembly Line has six stations, not one. This is not bureaucracy. It is the most important structural decision in the system.

The agent that writes the code must not be the agent that tests the code. The agent that designs the implementation must not be the agent that reviews it. The agent that decomposes the requirements must not be the agent that decides the architecture. Each station has a different concern, a different context window, and a different adversarial relationship with the others.

Station 4, Testing, is adversarial to Station 3, Implementation. Its job is to find defects. If the same agent writes and tests code, it will test the code it wrote, which means it will test its own assumptions. It will write tests that confirm what it believes the code does, not tests that challenge what the code actually does. This is not a theoretical concern. This is the single most common failure mode in AI-generated code today.

Station 5, Code Review, is adversarial to both Station 2 and Station 3. It evaluates whether the design was sound and the implementation was faithful. It has fresh eyes — a different context window that was not polluted by the design process or the implementation struggle. It can see what the implementer cannot: the forest.

This separation also solves the context window problem. A Claude instance doing requirements decomposition does not need the codebase in its context. A Claude instance doing implementation does not need the product strategy in its context. Each station loads only the context it needs — the work instruction, the input artifacts, and the relevant code. This is not just efficient. It produces better outputs, because the worker is not distracted by irrelevant information.

In manufacturing, this principle is ancient: the person who assembles a part does not inspect it. The person who designs a process does not operate it. The person who operates does not maintain. Each role has a different concern, a different skill set, and a different adversarial relationship with the others. This separation is what makes quality possible at scale.

---

## 08 — The Gold-Plating Rule (and Its Exception)

Station 3's work instruction contains what we call the Gold-Plating Rule, and it deserves its own section because it addresses the single most expensive failure mode in agentic development.

The rule is: if, during implementation, the worker thinks "this would be better if I also..." — that thought is a new unit for Station 1. It is not scope creep. It is not initiative. It is a defect in process discipline. The worker writes the suggestion in a notes field and moves on.

This sounds rigid. It is rigid. Here's why.

When a human developer sees something that could be improved while implementing a feature, they use judgment. They weigh the cost of the detour against the benefit. They consider whether the improvement is worth the added review burden. They make a decision that accounts for context they have accumulated over months or years of working in this codebase.

A Claude instance does not have this judgment. It has a context window and a strong prior toward being helpful. "Being helpful" to a Claude instance means doing more, doing better, making things nicer. This is exactly the instinct that produces the runaway agent behavior Yegge describes — agents that race ahead, adding features nobody asked for, refactoring code they happened to notice, introducing abstractions "for future use," and burning tokens on improvements that may or may not align with the product direction.

The Gold-Plating Rule eliminates this failure mode mechanically. The worker cannot gold-plate because the work instruction explicitly prohibits it. The improvement isn't lost — it's captured as a note that becomes a candidate unit in the backlog. The human decides if and when to build it. The agent builds what was designed, nothing more, nothing less.

But here is where we must be honest about an important distinction, one that Toyota's own system makes explicit: **scope creep is not the same as fixing a defect you've discovered.**

Toyota's jidoka principle says: stop and fix. Do not pass defects downstream. If a Station 3 worker discovers a bug in existing code while implementing a feature — a real bug, not a style preference — the original Gold-Plating Rule would say "note it and move on." But that violates jidoka. You've found a defect. Passing it downstream is the thing the whole system is designed to prevent.

So the Gold-Plating Rule has an exception: the **Incidental Fix Protocol.**

- **Scope creep** — adding features, refactoring code, improving style, introducing abstractions — is still prohibited. Note it, move on.
- **Incidental fixes** — correcting a bug you've discovered during implementation — are allowed under strict conditions: the fix is small (under 20 lines), it doesn't change the feature's interface, it goes in a separate commit with documentation in `station_3.notes`, and it gets its own test coverage at Station 4.
- If the fix is larger or changes interfaces, pull the Andon cord. That's not an incidental fix — it's a new unit of work.

This distinction matters because the original rule, taken literally, asks workers to knowingly pass defects downstream. That's the one thing an assembly line must never do. The Incidental Fix Protocol preserves the spirit of the Gold-Plating Rule — no scope creep, no agent runaway — while honoring the deeper principle: build quality in at every station.

This is why the Assembly Line works for developers who are not Yegge-level Stage 7-8 operators. The discipline is in the system, not in the human's ability to detect and correct agent runaway in real time.

---

## 09 — You Are Not Training the Agents (But They Are Not Blank)

Here is the fundamental insight, the one that makes everything else click:

You are not training the agents. You are engineering the process.

The Claude instances carry no memory between sessions. They don't learn from the last unit they processed. The state is in the work unit, not in the worker. This means your investment in better work instructions, tighter quality gates, and more specific Andon triggers persists — in versioned files in your repository — while any investment in making a specific agent session "smarter" evaporates when it ends.

This is a feature, not a limitation. Invest in the line, not the worker.

But we should be honest about what the worker actually is. A Claude instance is not a blank executor. It is not a dumb hand that mechanically follows instructions the way a robotic arm follows G-code. It is a highly capable system with strong priors — about code style, about design patterns, about what "good" looks like. It arrives at every station with opinions. Sometimes those opinions are excellent. Sometimes they're wrong. The work instruction doesn't program the worker from scratch. It *calibrates* a system that already has significant capability.

This distinction matters for how you write work instructions. A good work instruction doesn't specify every keystroke — that would be both impossible and wasteful. It leverages the model's strengths (pattern recognition, code generation, API knowledge) while guarding against its weaknesses (over-helpfulness, hallucinated dependencies, style drift, and the relentless urge to "improve" things that don't need improving). The instruction is a steering mechanism, not a program.

The core insight still holds: invest in the process, not the worker. When you try to make agents smarter through elaborate multi-turn conversations where you build up context and rapport, that investment evaporates with every new session. When you invest in the line instead, the improvement compounds. Better work instructions produce better outputs from every worker at every station, forever.

This is how manufacturing scaled. Ford didn't build better machinists. He built a better line and staffed it with the machinists he had. Toyota didn't hire geniuses for the factory floor. They built a system where capable workers could produce extraordinary quality, because the system channeled their capability and caught errors that individual judgment would miss.

The Assembly Line does the same for agentic software development. The intelligence is in the line. The workers are capable but stateless. The human is the engineer who designs the system that channels that capability into reliable outcomes.

---

> **You are not training the agents. You are calibrating a capable system through better instructions. The investment in the line persists. The investment in any single session evaporates.**

---

## 10 — How to Begin

Start with single-piece flow. One unit. All six stations. Sequential. No parallelism.

This will feel painfully slow. One feature, processed through six separate Claude Code sessions, with structured handoffs and quality gates at each boundary. You will be tempted to skip stations, to combine them, to "just let Claude handle it." Resist.

Single-piece flow is how you debug the line. You will discover that your Station 1 work instruction doesn't produce specs detailed enough for Station 2. You will discover that Station 2 sometimes defers design decisions to Station 3 with a "TBD." You will discover that Station 5 flags issues that should have been caught by Station 3's quality gate. Each discovery is a work instruction improvement.

After five to ten units, your line will be tuned. The work instructions will be specific. The quality gates will catch real defects. The Andon triggers will fire at the right moments. You will have data — average cycle time per station, first-pass yield, defect distribution, Andon frequency.

Then add parallelism. Put a second Claude Code instance at Station 3, your bottleneck. Then a second at Station 4. Watch the throughput increase without a corresponding increase in defect rate, because the quality is in the process, not the workers.

Then run multiple units simultaneously. Kanban limits prevent overload. Each unit flows independently. Your role shifts from "person doing the work" to "person monitoring the board, responding to Andons, and improving the line."

Then build specialized lines. A fast lane for bug fixes that skips the architecture station. A heavyweight lane for new features that adds an extra review. Route work to the appropriate line based on type and risk.

Then establish the kaizen loop. Weekly, review the metrics. Which station had the most Andon pulls? Which quality gate caught the most defects? Where did cycle time spike? Adjust one work instruction per week. Measure the impact. Iterate.

The line gets better every week because the instructions get better, not because the workers get smarter. This is the fundamental advantage of engineered systems over improvisational ones. Improvisation has a ceiling. Engineering has a ramp.

---

## 11 — Where the Analogy Breaks

Every section above borrows from manufacturing. This section says where the borrowing stops — because the strongest version of this argument is the one that confronts its own limits honestly.

**Software is often discovery, not production.** A factory makes the same part a million times. Software makes each part once. Manufacturing assumes stable requirements — the blueprint exists before the line runs. In software, requirements frequently emerge from the act of building. You discover what the feature should be by implementing the first version and watching it fail.

The Assembly Line handles this through two mechanisms. First, **spikes** — lightweight exploratory loops (Stations 1 → 3 only) that produce learning, not production code. A spike's output is a report: "here is what we learned, here is what the real unit should specify." The spike is cheap because it skips design review, testing, code review, and integration. It never merges. Second, **Andon escalation as a learning signal.** When Station 3 pulls the cord because the plan is infeasible, that isn't a failure — it's the line discovering a requirement the spec missed. The resolution updates the spec. The line learns through its escalations. This isn't as elegant as a single developer discovering and adapting in a flow state. It is more reliable.

**Context destruction is real.** When a unit moves from Station 2 to Station 3, the design rationale — *why* this approach was chosen over alternatives, what tradeoffs were considered, what constraints shaped the design — exists only in the Station 2 designer's context window, which is about to be destroyed. If the artifacts don't carry this rationale forward, Station 5 reviewers are left evaluating *what* was built without understanding *why*, and Station 3 implementers may make choices that contradict the design intent without knowing it.

The line addresses this by requiring **design rationale in the artifacts**, not just specs and plans. Station 2's output includes a rationale section: decisions made, alternatives rejected, and constraints that drove the design. This flows downstream through the unit, giving every subsequent station the *why* alongside the *what*. It's more overhead than a single developer holding everything in their head. It's also more auditable and more resilient to the inevitable loss of context.

**The "stateless worker" framing is a simplification.** Section 09 now addresses this directly, but it bears repeating here: Claude is not a blank executor. It arrives at every station with strong priors about how code should be written, what good design looks like, and how to be "helpful." The work instruction doesn't program a blank machine — it steers a highly opinionated one. This means the work instruction is doing something more subtle than a manufacturing work instruction does. It's not just specifying the operation. It's specifying where the model's instincts should be trusted and where they should be overridden.

**The six-station pipeline is the heavyweight lane.** For a new feature that touches multiple files, changes interfaces, and requires design review — yes, six stations. For a one-line bug fix, config change, or documentation update, six stations is absurd overhead. The line needs multiple routes: a standard lane (all six stations), a fast lane (skip design for small changes), and a spike lane (exploratory work that produces reports, not merges). Section 10 mentions specialized lines. This section makes them a first-class concept, not a future optimization.

None of this undermines the core thesis. The manufacturing principles — takt time, standard work, jidoka, kanban, poka-yoke, kaizen — are genuinely powerful when applied to agentic software development. The analogy works. It just doesn't work *everywhere*, and pretending it does would cost credibility with the practitioners who would benefit most from adopting it.

---

> **The strongest version of the manufacturing analogy is the one that knows where it breaks. Software is not identical to manufacturing. The principles transfer. The assumptions don't always.**

---

## 12 — What We Believe

We believe that agentic software development is real, and that it works, and that it is here to stay.

We believe that the way to make it reliable is not to build smarter agents, but to build better systems around the agents we have.

We believe that a century of manufacturing science — takt time, standard work, jidoka, kanban, poka-yoke, kaizen — applies directly to the problem of coordinating AI workers, and that the software industry's reluctance to learn from manufacturing is an expensive blind spot.

We believe that the human's highest-leverage contribution is designing the process, not performing the work. Every hour spent improving a work instruction saves a hundred hours of agent supervision.

We believe that quality must be built into every station, not inspected at the end. End-of-line inspection is the most expensive form of quality control. Building quality in is the cheapest.

We believe that structured escalation — the Andon cord — is more valuable than agent autonomy. An agent that stops and asks is more valuable than an agent that guesses and ships.

We believe that agents are interchangeable commodity workers, and that this is a feature. The intelligence is in the line. The workers are stateless. The process is persistent.

We believe that the Gold-Plating Rule — do what was designed, nothing more — is essential to preventing the runaway token burn and scope creep that plague autonomous agent systems.

We believe that this approach makes agentic development accessible to developers who are not Stage 7-8 operators. You don't need twenty years of experience to follow a work instruction or pull an Andon cord. You need a well-designed line.

We believe that Gastown pointed in the right direction. The factory metaphor is correct. The execution needs engineering.

We believe that the Assembly Line is that engineering.

---

*The Assembly Line is open source. The work instructions are markdown files. The controller is a zero-dependency Node.js script. The ideas are borrowed from Toyota, Ford, Ohno, Deming, and Shingo. The implementation is new. The need is now.*
