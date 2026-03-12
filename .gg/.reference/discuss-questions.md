# Discuss Skill — Minimum Question Set

Reference doc for the `gg:discuss` skill. Defines the **minimum questions** the skill must cover before offering to stop, plus guidance on adaptive follow-ups.

## How It Works

The discuss skill asks questions across **5 probe areas**. Each area has 1-2 minimum questions that are always asked (adapted to context). After the minimum set is covered, the skill shifts to adaptive follow-ups driven by what it learned. The user controls pacing at every step.

**Minimum questions** are structured — the skill always asks them.
**Follow-up questions** are adaptive — the skill generates them based on responses and input.md context.

## Minimum Questions

Questions are ordered to build on each other: goals define the target, constraints bound the solution space, preferences narrow choices, edge cases surface risks, and acceptance criteria define done.

### 1. Goals

> Ask early — everything else derives from goals.

| # | Question Template | Rationale |
|---|-------------------|-----------|
| 1 | "What does success look like for this phase?" | Establishes concrete outcomes the user cares about. Adapt by referencing the phase name and description from plan.md. |
| 2 | "Are there measurable criteria — performance targets, coverage thresholds, etc.?" | Quantifies goals so acceptance criteria can be verified objectively. Skip if input.md already contains specific numbers. |

**Adaptation:** If input.md mentions a Linear issue, reference the issue title. If the phase description is specific (e.g., "Add authentication"), ask about the specific feature.

### 2. Constraints

> Surfaces hard limits before the user invests in preferences.

| # | Question Template | Rationale |
|---|-------------------|-----------|
| 3 | "What can't change? (backward compatibility, public APIs, database schemas, etc.)" | Identifies immovable boundaries. Adapt by listing specific tech from input.md or plan.md. |
| 4 | "What's the timeline or urgency? Any deadlines?" | Scopes the effort — affects whether to suggest quick wins or thorough solutions. |

**Adaptation:** If the project has multiple phases, ask whether this phase blocks others. If input.md mentions tech debt, ask which parts are off-limits.

### 3. Preferences

> Narrows the solution space based on opinions before the planner runs.

| # | Question Template | Rationale |
|---|-------------------|-----------|
| 5 | "Do you have preferences for libraries, patterns, or approaches?" | Surfaces opinions that would otherwise be discovered mid-implementation. Adapt by offering specific choices relevant to the phase (e.g., "Zod vs io-ts for validation?"). |

**Adaptation:** If plan.md mentions specific technologies, ask about preferred usage patterns. If the codebase already uses certain libraries (from research.md if available), ask whether to continue with them or switch.

### 4. Edge Cases

> Probes what the user already worries about.

| # | Question Template | Rationale |
|---|-------------------|-----------|
| 6 | "What failure scenarios worry you most?" | Identifies risks the user already sees — these become explicit test cases or error handling requirements. |
| 7 | "Are there concurrency, scale, or security concerns?" | Probes technical edges that may not surface naturally. Skip individual sub-topics that aren't relevant to the phase. |

**Adaptation:** If the phase involves APIs, ask about rate limiting and auth. If it involves data, ask about migration and rollback. If it involves UI, ask about accessibility and responsive behavior.

### 5. Acceptance Criteria

> Always last — builds on everything above.

| # | Question Template | Rationale |
|---|-------------------|-----------|
| 8 | "How will you verify this phase is done? What does the review look like?" | Defines the finish line. The answer feeds directly into the phase plan's acceptance criteria and the verifier agent's checklist. |

**Adaptation:** If the user mentioned specific metrics in Goals, reference them. If they mentioned tests in Preferences, ask about coverage expectations.

## Follow-Up Question Guidance

After the minimum set, the skill generates follow-ups based on:

1. **Gaps in responses** — If a user said "no preference" for libraries, follow up with "Would you like me to research options during `/gg:research`?"
2. **New information** — If a response reveals a constraint not in input.md, probe deeper: "You mentioned backward compatibility — which specific APIs need to stay stable?"
3. **Ambiguity** — If a response is vague ("make it fast"), ask for specifics: "Fast as in sub-100ms response time, or fast as in ships this week?"
4. **Cross-area connections** — If a goal conflicts with a constraint, surface it: "You want full test coverage but mentioned a tight timeline — should we prioritize critical paths?"

Follow-ups are **never required** — the user can stop after the minimum set. The skill signals when minimum coverage is complete.

## Batching Rules

- **2-4 questions per round** — group by probe area when possible
- **Round 1**: Goals (questions 1-2)
- **Round 2**: Constraints (questions 3-4) + Preferences (question 5)
- **Round 3**: Edge Cases (questions 6-7) + Acceptance (question 8)
- **Round 4+**: Follow-ups (adaptive, 2-3 questions per round)

This ensures minimum coverage in 3 rounds. The skill may reorder or combine questions if context makes grouping more natural.
