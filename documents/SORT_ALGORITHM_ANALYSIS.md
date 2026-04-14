# SORT ALGORITHM ANALYSIS

**Audit date:** 2026-04-10  
**Scope:** Prefix `!sort` execution flow, its shared balancing core, and the resulting team assignment lifecycle.

---

## 1. Executive Summary

The current `!sort` implementation is **not random-only** and **not a snake draft**. Its balancing core is a **greedy descending load-balancing heuristic**:

1. gather all connected voice members,
2. hydrate or create their rank records,
3. resolve team-size-dependent role constraints,
4. optionally inject a small amount of rank noise,
5. sort players from highest to lowest effective rank,
6. seed constrained roles first,
7. repeatedly place the remaining players into the currently lowest-scoring non-full team.

This is a reasonable heuristic and is computationally cheap, but it is **not guaranteed to find the globally best balance**. In other words, it often produces good results, but it can still generate visibly stacked teams when a better partition exists.

A critical architectural point is that the mathematical balancing logic is centralized in **`src/domain/services/BalanceTeamsService.ts`**. The current user-facing path is the prefix command `!sort`. Slash handlers exist in the codebase, but chat-input interactions are currently rejected in prefix-only mode.

---

## 2. Code Extraction: Exact Execution Flow

## 2.1 Prefix command entry path (`!sort`)

| Stage | File | Function / Handler | Responsibility |
|---|---|---|---|
| 1 | `src/index.ts` | `client.on('messageCreate', ...)` | Receives Discord messages and extracts the base command token. |
| 2 | `src/utils/commands.ts` | `isValidCommandType()` | Confirms that `!sort` is a recognized prefix command. |
| 3 | `src/factory/commands/main/CommandFactory.ts` | `CommandFactory.createCommand()` | Instantiates `SortRankedCommand` for `!sort`. |
| 4 | `src/factory/commands/game/SortRankedCommand.ts` | `SortRankedCommand.execute()` | Orchestrates the entire prefix sort flow. |
| 5 | `src/services/players.service.ts` | `getOrCreateAllPlayers()` | Loads persisted player ranks and inserts missing users with default rank values. |
| 6 | `src/factory/commands/game/SortRankedCommand.ts` | `resolveTeamCount()` | Validates the optional team-count argument from `!sort [teams]`. |
| 7 | `src/application/use-cases/SortPlayersUseCase.ts` | `SortPlayersUseCase.execute()` | Wraps the balancing call and creates `sessionId` / timestamps. |
| 8 | `src/domain/services/BalanceTeamsService.ts` | `balancePlayersIntoTeams()` | **Primary balancing algorithm**. |
| 9 | `src/store/sortHistory.ts` | `addSort()` | Stores the result in in-memory match history. |
| 10 | `src/state/teams.ts` | `setMatchSession()` | Stores the active team assignment for later commands such as `!go` and `!swap`. |
| 11 | `src/factory/commands/game/SortRankedCommand.ts` | `formatTeam()` + embed send | Formats and publishes the final visible result to Discord. |

### Important clarification
`!sort` **does not physically move users into voice channels**. It computes and stores the assignment, then sends an embed. The actual movement step is performed later by `!go` in `src/factory/commands/game/GoCommand.ts` via `getMatchSession()`.

## 2.2 Slash-command implementation status (`/sort`)

There is a slash-command implementation under `src/app/interactions/slash-commands/onSortCommand.ts`, and it targets the same `SortPlayersUseCase`. However, `src/app/events/interactionCreate.ts` currently runs in prefix-only mode and replies with `errors.prefixOnlyCommands` for chat-input interactions. In practice, the active production flow analyzed here is the prefix `!sort` path.

---

## 3. Where the Real Sorting and Balancing Happen

### 3.1 Orchestration layer
- **`src/factory/commands/game/SortRankedCommand.ts` → `execute()`**
  - Collects all voice members.
  - Loads their persisted rank data.
  - Validates team count.
  - Calls the use case.
  - Persists the result and renders the embed.

### 3.2 Use-case layer
- **`src/application/use-cases/SortPlayersUseCase.ts` → `execute()`**
  - Generates `createdAt` and `sessionId`.
  - Delegates to the balancing service.
  - Returns a `SortResult` object.

### 3.3 Actual algorithm layer
- **`src/domain/services/BalanceTeamsService.ts` → `balancePlayersIntoTeams()`**
  - This is the true core of the sort system.
  - Supporting internal helpers:
    - `shufflePlayers()`
    - `applyNoise()`
    - `createTeamBuckets()`
    - `selectNextTeam()`
    - `normalizeTeamCount()`

If one file must be treated as the mathematical source of truth, it is **`BalanceTeamsService.ts`**.

---

## 4. Step-by-Step Breakdown of the Current Algorithm

## 4.1 Input collection and rank hydration

Inside `SortRankedCommand.execute()`:

1. The bot scans **all guild voice channels**.
2. Every connected member from non-empty voice channels is collected into `allVoiceMembers`.
3. If no one is connected, the command exits with `errors.insufficientPlayers`.
4. The command calls `getOrCreateAllPlayers(allVoiceMembers)`.

Inside `getOrCreateAllPlayers()`:

1. All stored players are loaded from the repository.
2. A player map is built, keyed by `member.user.username`.
3. Missing players are inserted automatically with:
   - `rank = appConfig.rank.defaultValue`
   - current default = **`1.5`** from `src/config/app-config.ts`
4. The result is returned as a merged in-memory map.

### Technical implications
- New users are never excluded solely because they do not exist in the DB yet.
- Missing users are created on the fly and receive a default skill estimate.
- The balancer uses only the fields mapped into the `Player` model:
  - `id`
  - `externalId`
  - `displayName`
  - `rank`
- Player attributes are used indirectly through `MatchRulesProvider` and constraint seeding when the selected team size requires role coverage.

---

## 4.2 How player ranks are handled

Each sortable player is transformed into:

```ts
{
  id: username,
  externalId: member.id,
  displayName: playerInfo.dotaName || member.displayName,
  rank: Number(playerInfo.rank ?? 0)
}
```

### Current rank behavior
1. **Rank is a scalar numeric weight.**
   - The algorithm does not treat rank categories differently.
   - It does not model confidence intervals, recent performance, role preference, or uncertainty.

2. **Rank is the primary score signal, but not the only placement signal.**
   - Role constraints from `src/config/gameRules.ts` can require carry, support, and tank coverage by team size.
   - Constraint seeding uses numeric attribute proficiency thresholds greater than `0`.
   - The algorithm still does not model parties, anti-rematch rules, or full composition search.

3. **The balancer may perturb rank slightly through noise.**
   - Controlled by `appConfig.sort.noise`.
   - Current defaults:
     - `applyChance = 0.3`
     - `amplitude = 0.2`
   - When noise is applied, the effective rank becomes:

```text
effectiveRank = rawRank + ((random() - 0.5) * amplitude)
```

Because `amplitude = 0.2`, the perturbation range is roughly **`[-0.1, +0.1]`**.

4. **Noise is probabilistic, not universal.**
   - A player only receives noise if:

```text
noise.enabled && applyChance > 0 && amplitude > 0 && random() < applyChance
```

5. **The final team `score` uses `effectiveRank`, not always the raw persisted rank.**
   - This means the displayed team total may differ slightly from the visible sum of listed raw ranks.
   - The player list shows `R${player.rank}`, but the internal sum may include hidden perturbation.

### Conclusion on rank handling
The current system handles rank as a **single weighted number**, optionally nudged by small randomness, then sorts descending by that adjusted value.

---

## 4.3 What logic distributes players into teams?

### Short answer
The current strategy is a **greedy balancing algorithm**, specifically a descending assignment heuristic similar to **Longest Processing Time (LPT)** load balancing.

It is **not**:
- a snake draft,
- a fully random split,
- a brute-force optimizer,
- a backtracking solver,
- or a mathematically exact partition algorithm.

### Exact flow inside `balancePlayersIntoTeams()`

1. **Validation**
   - throws if `players.length === 0`
   - throws if `players.length < teamCount`

2. **Shuffle first**
   - `shufflePlayers()` uses a Fisher-Yates shuffle.
   - This randomizes the original order before ranking ties are resolved.

3. **Apply optional noise**
   - `applyNoise()` computes `effectiveRank` for each player.
   - It also stores `randomizedOrder` as a stable tie-break reference.

4. **Sort highest-to-lowest by effective rank**

```ts
rankedPlayers.sort(
  (left, right) =>
    right.effectiveRank - left.effectiveRank ||
    left.randomizedOrder - right.randomizedOrder
)
```

This means:
- higher effective rank is placed earlier,
- exact or near ties keep the shuffled order.

5. **Pre-create team buckets with fixed capacities**
   - `createTeamBuckets()` defines how many players each team may hold.

6. **Resolve and seed constraints first**
   - `SortPlayersUseCase` obtains role constraints from `MatchRulesProvider`.
   - `seedTeamsForConstraints()` assigns qualifying players to teams before the general greedy pass.

7. **Assign remaining players one at a time**
   - For each unassigned ranked player, the algorithm chooses the currently best target team through `selectNextTeam()`.

8. **Selection rule**
   - Only teams that are **not full** are eligible.
   - Eligible teams are sorted by:
     1. **lowest current total score first**
     2. then **fewest players first**
   - If multiple teams are still identical on both values, one is chosen randomly.

9. **Commit assignment immediately**
   - The player is appended to that team.
   - The team score is increased immediately by that player’s `effectiveRank`.
   - There is **no backtracking** and **no swap optimization pass** afterward.

### Simplified pseudocode of the current implementation

```text
players = shuffle(players)
rankedPlayers = sortDescendingByEffectiveRank(players)
teams = createTeamsWithCapacities(teamCount, playerCount)
seedTeamsForConstraints(rankedPlayers, teams)

for each player in rankedPlayers:
   skip already-assigned constrained players
    targetTeam = lowestScoreNonFullTeam()
    targetTeam.add(player)
    targetTeam.score += player.effectiveRank

return teams
```

### Classification
This is best described as:

> **Greedy descending rank assignment with randomized tie-breaking and optional rank noise**.

More precisely in the current code, it is a greedy descending assignment with an earlier role-constraint seeding step.

---

## 4.4 How is “Total Team Rank” calculated?

The current implementation stores the total in `team.score`.

### Formula

```text
team.score = Σ effectiveRank(player_i)
```

Where:

```text
effectiveRank(player_i) = rawRank_i + optionalNoise_i
```

### What is actually shown in the embed?
The value is rendered with:

```ts
team.score.toFixed(1).padStart(4, '0')
```

So the visible score is:
- rounded to one decimal place,
- left-padded for presentation.

### Is average rank calculated anywhere?
**No.**

There is no dedicated “average rank” variable or function in the current `!sort` flow. If average rank were needed, it would have to be derived as:

```text
averageRank = team.score / team.players.length
```

Because this is not done today, the bot balances and displays **total score**, not team average.

---

## 4.5 How are odd player counts handled?

Odd or uneven player counts are managed by `createTeamBuckets()`.

### Capacity formula

```text
baseCapacity = floor(playerCount / teamCount)
remainder = playerCount % teamCount
capacity(team_i) = baseCapacity + 1 for the first `remainder` teams
```

### Examples
- `10 players / 2 teams` → capacities `[5, 5]`
- `5 players / 2 teams` → capacities `[3, 2]`
- `10 players / 3 teams` → capacities `[4, 3, 3]`

### Practical effect
- No team can exceed its assigned capacity.
- Team sizes differ by **at most one player**.
- If the lobby is too small to place at least one player in every requested team, the service throws and the command rejects the request.

### Important nuance
When teams are intentionally uneven (for example `3 vs 2`), comparing raw **totals** alone becomes less meaningful than comparing **averages**. The current code does **not** normalize by team size during scoring.

---

## 4.6 How are mismatched ranks or very uneven skill spreads handled?

The algorithm treats a highly mismatched lobby as a plain weighted-partition problem:

- high-rank players are processed first,
- each one is placed into the currently lowest-scoring team,
- lower-ranked players are then used to “fill in” the remaining balance.

### What it does well
- It usually avoids putting all top-ranked users on the same team.
- It strongly reduces obvious imbalance for normal distributions.

### What it does **not** do
- It does not search the full solution space.
- It does not reconsider earlier assignments.
- It does not model “top-heaviness” versus “depth.”
- It does not check intra-team variance.
- It does not use standard deviation or z-score balancing.
- It does not perform pairwise swap improvement after the first pass.

So yes: mismatched ranks are handled **heuristically**, not optimally.

---

## 5. Mathematical Evaluation

## 5.1 Does the current logic achieve the “best possible balance”?

**No, not in the strict mathematical sense.**

The current implementation is a **greedy heuristic**. Greedy heuristics are fast and often good enough, but they do not guarantee the globally optimal team partition.

### Why not?
Because each assignment is made using only the **current local state**:
- current team totals,
- current team sizes,
- current player being processed.

Once a player is assigned, that decision is locked in. The algorithm never checks whether a later swap would have produced a better final balance.

---

## 5.2 Verified counterexample showing non-optimal behavior

A simple rank set demonstrates the limitation:

```text
Ranks: [4, 2, 2, 2, 1, 1]
```

### Current greedy outcome
After descending assignment, one valid outcome is:

| Team | Players | Total |
|---|---|---:|
| A | `[4, 2, 1]` | `7` |
| B | `[2, 2, 1]` | `5` |

**Spread = 2**

### Better valid outcome that exists
An equal-size split with a perfect balance is:

| Team | Players | Total |
|---|---|---:|
| A | `[4, 1, 1]` | `6` |
| B | `[2, 2, 2]` | `6` |

**Spread = 0**

This proves that the current logic can miss a strictly better answer, even on a very small input.

---

## 5.3 Is the current logic susceptible to “stacked” teams?

**Yes, under several conditions.**

### Condition A: local optimum trap
Because the algorithm is greedy, an early assignment can look good locally but block a better global arrangement later.

### Condition B: top-heavy distributions
If one or two players have much higher ranks than the rest, the algorithm only balances **sum of ranks**, not the subjective feel of the game. A team can still feel stacked even when the total score gap is small.

### Condition C: random noise
The noise feature introduces diversity, but it also means:
- the same lobby may generate different team layouts,
- the “best raw-rank split” can be slightly perturbed,
- visible totals may not match the literal sum of shown ranks exactly.

### Condition D: no post-optimization pass
There is no follow-up step such as:
- try one-for-one swaps,
- try two-for-two swaps,
- keep the best candidate after many random seeds,
- compare the result against an exact partition solver.

Without such a pass, the first greedy solution is accepted immediately.

---

## 5.4 Complexity profile of the current implementation

The current algorithm is efficient.

### Approximate complexity
- shuffle: `O(n)`
- noise application: `O(n)`
- descending sort: `O(n log n)`
- per-player team choice: roughly `O(n * t log t)` where `t = teamCount`

For typical lobby sizes, this is very cheap.

### Why that matters
Because the lobbies are small, the project can afford a **much stronger optimization strategy** than the current single-pass greedy approach.

For example, the common Dota case of **10 players into 2 teams of 5** only has:

```text
C(10, 5) = 252
```

possible equal-size splits for the first team, which is trivial to evaluate exactly in Node/TypeScript.

---

## 6. Improvement Roadmap

## 6.1 Immediate improvement: separate fairness from randomness

### Current issue
Random noise is mixed directly into the rank value used for scoring.

### Recommendation
Keep two separate values:
- **`rawRank`** for official scoring and display,
- **`searchRank`** or randomized ranking order only for candidate generation.

### Better pattern
```text
rawScore = sum(raw ranks)
searchScore = optional randomized helper used only while exploring candidates
```

This preserves variety without making the visible “Total Team Rank” drift away from the stored player ranks.

---

## 6.2 Add a real evaluation function

Today, the implicit objective is just “keep cumulative totals low while filling teams.” That is too narrow.

### Recommended team quality metrics
For each candidate split, compute:

1. **Total spread**
```text
max(teamTotals) - min(teamTotals)
```

2. **Standard deviation of team totals**
```text
stdDevTotals = sqrt(sum((teamTotal - meanTotal)^2) / teamCount)
```

3. **Standard deviation of team averages**
```text
stdDevAverages = sqrt(sum((teamAverage - meanAverage)^2) / teamCount)
```

4. **Team-size penalty**
- large penalty if team sizes differ by more than one,
- usually zero for the current capacity logic.

### Suggested composite objective
```text
loss =
  1.00 * totalSpread +
  0.50 * stdDevTotals +
  0.50 * stdDevAverages +
  10.00 * invalidSizePenalty
```

The exact weights can be tuned, but this is much closer to a real fairness score than the current one-pass rule.

---

## 6.3 Recommended upgrade for default 5v5 Dota: exact search

For the common case of 2 teams and a modest lobby size, the best improvement is an **exact combinational solver**.

### Why this is practical
- `10 players, 5v5` → `252` candidate splits
- `12 players, 6v6` → `924` candidate splits

Those counts are small enough to solve optimally in real time.

### Recommended pseudocode

```text
bestCandidate = null

for each combination teamA of size targetSize:
    teamB = allPlayers - teamA
    totals = [sumRanks(teamA), sumRanks(teamB)]
    averages = [avgRanks(teamA), avgRanks(teamB)]
    loss = evaluate(totals, averages)

    if bestCandidate is null or loss < bestCandidate.loss:
        bestCandidate = { teamA, teamB, loss }

return bestCandidate
```

### Benefit
This would provide a **provably best split** instead of a heuristic guess for the most common use case.

---

## 6.4 Recommended upgrade for multi-team modes: multi-iteration simulation

For `teamCount > 2`, exact search becomes more combinatorial, but the project can still do significantly better than a single greedy pass.

### Suggested approach
1. generate many candidate assignments using different random seeds,
2. score each candidate using the evaluation function above,
3. keep the best candidate only.

### Pseudocode

```text
bestCandidate = null

for seed in 1..N:
    candidate = greedyAssign(players, seed)
    improved = localSwapOptimization(candidate)
    loss = evaluate(improved)

    if bestCandidate is null or loss < bestCandidate.loss:
        bestCandidate = improved

return bestCandidate
```

### Good starting value
- `N = 500` to `2000` iterations is realistic for these lobby sizes.

This usually yields much better fairness while preserving fast response times.

---

## 6.5 Add a post-greedy local improvement pass

A very effective low-risk enhancement is to run the current greedy algorithm first, then try to improve it.

### Example improvements
- one-for-one player swaps between teams,
- one-for-two or two-for-two swaps for larger lobbies,
- stop when no swap reduces the fairness loss.

### Why this helps
It preserves the current architecture and simplicity while removing many avoidable local-optimum failures.

---

## 6.6 Improve observability and reproducibility

If fairness complaints are expected from users, the bot should record more metadata for each sort:

- random seed used,
- raw totals per team,
- average rank per team,
- standard deviation metrics,
- whether noise was applied and to whom.

This makes support and debugging much easier and allows disputed matchups to be explained objectively.

---

## 6.7 Add regression tests for known edge cases

Recommended new tests for `src/domain/services/BalanceTeamsService.test.ts`:

1. **Counterexample regression**
   - verify that the improved algorithm finds a `6 vs 6` split for `[4, 2, 2, 2, 1, 1]`.

2. **Odd-player lobbies**
   - e.g. `5 players / 2 teams`.
   - assert both size and average fairness behavior.

3. **High-outlier lobbies**
   - one very high rank plus many mid/low ranks.

4. **Property-style tests**
   - every player appears exactly once,
   - no team exceeds capacity,
   - fairness score is never worse than the greedy baseline.

---

## 7. Current vs Recommended Logic

## 7.1 Current logic (simplified)

```text
collect voice members
load/create player ranks
shuffle players
optionally perturb some ranks slightly
sort players by descending effective rank
for each player:
    place into the current lowest-score non-full team
persist and display the result
```

### Characteristics
- fast,
- simple,
- easy to reason about,
- but heuristic-only.

## 7.2 Recommended logic (stronger but still practical)

```text
collect voice members
load/create player ranks
if teamCount == 2 and playerCount is small:
    solve the partition exactly
else:
    run many seeded candidate builds
    optimize each candidate with local swaps
    keep the one with the best fairness score
persist raw totals, averages, and debug metrics
display raw totals to users
```

### Characteristics
- still fast for this scale,
- materially better fairness,
- reproducible,
- easier to defend mathematically.

---

## 8. Final Audit Conclusion

The current `!sort` command is built around a **solid but heuristic** balancing strategy:

- it is **rank-aware**,
- it is **not purely random**,
- it enforces **team-size balance**,
- and it usually produces acceptable teams quickly.

However, it does **not** guarantee the globally best solution. The combination of greedy assignment, no backtracking, and optional rank noise means the bot is **susceptible to non-optimal and sometimes stacked outcomes**, especially when the rank distribution is uneven.

### Most important recommendation
For the default Dota scenario of **10 players split into 2 teams**, replace the one-pass greedy assignment with an **exact optimal partition search**. The search space is small enough that there is little technical reason not to compute the best possible balance directly.

If broader multi-team support remains important, pair that exact 2-team path with a **multi-iteration + local-swap optimizer** for larger or more general cases.

---

## 9. Source Files Inspected During This Audit

- `src/index.ts`
- `src/utils/commands.ts`
- `src/factory/commands/main/CommandFactory.ts`
- `src/factory/commands/game/SortRankedCommand.ts`
- `src/app/interactions/slash-commands/onSortCommand.ts`
- `src/application/use-cases/SortPlayersUseCase.ts`
- `src/domain/services/BalanceTeamsService.ts`
- `src/domain/services/BalanceTeamsService.test.ts`
- `src/services/players.service.ts`
- `src/config/app-config.ts`
- `src/store/sortHistory.ts`
- `src/state/teams.ts`
