# Command Flow Analysis: !sort, !go, !swap, !replay

Scope: current prefix-command implementation in `src/` as of 2026-04-13.

This document is based on the running code, not the older architecture notes.

## Shared entry flow

All four commands follow the same prefix-command entry path:

1. `src/index.ts` listens to Discord `messageCreate`.
2. Bot messages and non-guild messages are ignored.
3. The first token from the message is lowercased and validated by `src/utils/commands.ts`.
4. `src/factory/commands/main/CommandFactory.ts` maps the prefix to the concrete command class.
5. The command instance runs `execute()`.
6. Any uncaught error is logged and returned as an error embed.

Relevant mappings:

- `!sort` -> `SortRankedCommand`
- `!go` -> `GoCommand`
- `!swap` -> `SwapCommand`
- `!replay` -> `ReplaySortCommand`

## Shared runtime state

Two in-memory stores drive these commands:

### 1. Sort history

Defined in `src/store/sortHistory.ts`.

- Stores up to `35` sort records (`appConfig.sort.history.maxEntries`).
- Used by `!swap` and `!replay`.
- Cleared by successful `!go`.
- Lost on process restart.

Each record contains:

- `sessionId`
- `teams`
- `timestamp`

### 2. Active match session

Defined in `src/state/teams.ts`.

- Represents the current team assignment that `!go` will deploy.
- Written by `!sort`, `!swap`, and `!replay`.
- Cleared by successful `!go`.
- Lost on process restart.

Important consequence: `!go` does not read directly from Discord or from the database to decide teams. It reads the last active in-memory match session.

## `!sort` flow

Implementation: `src/factory/commands/game/SortRankedCommand.ts`

Syntax:

- `!sort`
- `!sort <teamCount>`

### What it does

Creates balanced teams from all guild members currently connected to any voice channel, stores the result in history, and marks it as the active match session.

### Step-by-step flow

1. The command scans every guild channel and collects members from all non-empty voice channels.
2. If no voice members are found, it sends a warning embed using `errors.insufficientPlayers` and stops.
3. It calls `getOrCreateAllPlayers()` from `src/services/players.service.ts`.
4. That service loads all stored players from MySQL and automatically creates missing records for new voice members.
5. Newly created players receive:
   - username as `id`
   - Discord member ID as `externalId`
   - default display name equal to username
   - default rank `1.5`
   - default attributes
6. The command converts voice members into domain `Player` objects.
7. It resolves the requested team count from the command text.
8. Team count rules come from `src/config/app-config.ts`:
   - default: `2`
   - minimum: `2`
   - maximum: `12`
9. If the team count is invalid, it sends an `invalidTeamCount` warning embed and stops.
10. If there are fewer players than requested teams, it sends an `insufficientPlayersForTeamCount` warning embed and stops.
11. It resolves team labels with `resolveVoiceChannelTeamLabels()`.
12. Team labels come from configured target voice channels when available; otherwise they fall back to `Team 1`, `Team 2`, and so on.
13. It calls `SortPlayersUseCase.execute()`.
14. The use case asks `MatchRulesProvider` for role constraints based on computed team size.
15. The use case delegates balancing to `balancePlayersIntoTeams()` in `src/domain/services/BalanceTeamsService.ts`.

### Current balancing algorithm

The current implementation is not a random split and does not move users yet.

The algorithm does this:

1. Shuffle players.
2. Optionally apply score noise.
3. Sort players by effective rank descending.
4. Build team buckets with capacities based on total player count and requested team count.
5. Seed teams with constrained roles first when match rules require them.
6. Assign remaining players one by one to the currently lowest-score team.
7. Break ties randomly among equally balanced teams.

Noise policy from config:

- enabled in this command path
- `applyChance = 0.3`
- `amplitude = 0.2`

### Persistence and output

After balancing:

1. The command writes the result into sort history with `addSort()`.
2. If history is full, it sends `errors.sortHistoryLimitReached` and stops.
3. It sends a match embed showing:
   - match ID
   - number of teams
   - player count
   - each team roster
   - each team score
4. It writes the same team assignment into the active match session with `setMatchSession()`.

### Important behavior notes

- `!sort` prepares teams but does not move anyone.
- The actual voice move happens later through `!go`.
- `!sort` can create more than two teams.
- The embed footer is the match-history ID, not the internal `sessionId`.

## `!go` flow

Implementation: `src/factory/commands/game/GoCommand.ts`

Syntax:

- `!go`

### What it does

Moves the players from the current active match session into their configured team voice channels.

### Step-by-step flow

1. The command reads the active match session from `getMatchSession()`.
2. If there are no teams, or every team is empty, it sends `errors.sortRequiredBeforeGo` and stops.
3. For each team in the active session, it resolves the target voice channel ID from `appConfig.channels.teamChannelIds[team.teamId]`.
4. If no channel ID is configured for a team, it records a configuration issue and continues checking the other teams.
5. If the configured channel does not exist or is not a voice channel, it records a configuration issue and continues.
6. It checks that the bot's guild member object exists.
7. It checks permissions for the target voice channel:
   - `ViewChannel`
   - `Connect`
   - `MoveMembers`
8. If permissions are missing, it records an issue and continues.
9. If setup is valid, it calls `moveTeamMembers()` for that team.
10. `moveTeamMembers()` loops through player IDs in the team.
11. Each player ID is matched against guild members by Discord username.
12. If the member is missing or not currently connected to voice, the command logs a warning and skips that player.
13. If the member is connected, it attempts `member.voice.setChannel(channel)`.
14. Failed moves are collected as user-visible errors.

### Completion behavior

After processing all teams:

1. If any issues were collected, the command sends an error embed with the combined messages and stops.
2. If no issues were collected, it clears:
   - the active match session via `clearTeams()`
   - the entire sort history via `clearSortHistory()`
3. It then sends the success embed from `commands.go.success`.

### Important behavior notes

- `!go` depends on the active in-memory match session, not directly on the latest history entry.
- `!go` clears both current teams and all stored sort history only after a fully successful run.
- Players who disconnected from voice are skipped, not treated as fatal errors.
- Because disconnected players are skipped silently from the user perspective, `!go` can report success even if some originally sorted players were no longer in voice when deployment happened.

## `!swap` flow

Implementation: `src/factory/commands/game/SwapCommand.ts`

Syntax:

- `!swap <team1Position> <team2Position>`
- `!swap <team1Position> -`
- `!swap - <team2Position>`

Examples:

- `!swap 1 2` swaps a player from team 1 with a player from team 2.
- `!swap 1 -` moves a player from team 1 into team 2.
- `!swap - 3` moves a player from team 2 into team 1.

### What it does

Takes the most recent sort from history, modifies the two team rosters, stores the adjusted result as a new history entry, and replaces the active match session with the updated teams.

### Step-by-step flow

1. The command splits the input into parts.
2. If fewer than two position arguments are supplied, it sends a usage message and stops.
3. It accepts either a positive integer or `-` for each side.
4. If both sides are `-`, it sends a usage error and stops.
5. If any numeric position is invalid or less than `1`, it sends a usage error and stops.
6. It loads the full sort history with `getAllSorts()`.
7. If history is empty, it sends `It's necessary to have at least one sort in history to perform a swap.` and stops.
8. It loads only the most recent history entry with `getSort(lastIndex)`.
9. If that record cannot be read, it sends an error and stops.
10. It checks `lastSort.teams.length`.
11. If the latest sort does not contain exactly two teams, it sends `errors.swapRequiresTwoTeams` and stops.
12. It clones the player arrays from the first two teams in the latest sort.
13. It applies one of three mutation modes:
   - swap positions across team 1 and team 2
   - move one player from team 1 into team 2
   - move one player from team 2 into team 1
14. If a referenced position is out of range, it sends a descriptive validation message and stops.
15. It loads all registered players from MySQL with `getAllPlayers()`.
16. It recalculates team scores by summing numeric ranks from the stored player records.
17. It builds `updatedTeams` by reusing the latest sort's team metadata and replacing only players and scores.
18. It appends the adjusted result to history using `addSort()`.
19. The new history entry keeps the same `sessionId` as the source sort but gets a new timestamp.
20. If history is full, it sends `No more sorts allowed.` and stops.
21. It sends a new match embed for the updated two-team layout.
22. It overwrites the active match session with the swapped teams using `setMatchSession()`.

### Important behavior notes

- `!swap` always operates on the latest history record, not on an arbitrary replayed index.
- `!swap` does not rerun the balancing algorithm.
- `!swap` recalculates scores as simple rank sums after the manual change.
- `!swap` only supports two-team matches, even though `!sort` supports more.
- The updated swap result becomes the version that `!go` will deploy next.

## `!replay` flow

Implementation: `src/factory/commands/game/ReplaySortCommand.ts`

Syntax:

- `!replay <n>`

Example:

- `!replay 2`

### What it does

Loads a previous sort result from history by 1-based index, makes it the active match session again, and reprints it as an embed.

### Step-by-step flow

1. The command parses the second token as a number and converts it to zero-based history index.
2. If the number is missing, invalid, or below `1`, it sends `Replay format: !replay <numero>` and stops.
3. It loads the requested sort from history using `getSort(index)`.
4. If no sort exists at that position, it sends `Sort #n not found` and stops.
5. It loads all registered players from MySQL with `getAllPlayers()`.
6. It writes the selected historical teams into the active match session with `setMatchSession()`.
7. It sends a replay embed showing the stored teams and stored scores.

### Important behavior notes

- `!replay` uses 1-based numbering for users and zero-based indexing internally.
- `!replay` does not create a new sort-history entry.
- `!replay` does not recompute scores or rebalance teams.
- `!replay` simply reactivates an older stored result so that the next `!go` deploys that version.

## Real command lifecycle between the four commands

The current runtime relationship is:

1. `!sort` creates a new balanced match.
2. `!swap` optionally adjusts the latest result and stores that adjusted version as a new history entry.
3. `!replay n` optionally replaces the active session with any older history entry.
4. `!go` deploys whichever team assignment is currently active in match session state.
5. A successful `!go` clears both active teams and history.

This means the team assignment used by `!go` is whichever command wrote to `setMatchSession()` most recently:

- `!sort`
- `!swap`
- `!replay`

## Differences from what older docs often imply

These are the implementation details most likely to have drifted from older documentation:

- `!sort` supports configurable team counts, not just two teams.
- `!swap` still assumes exactly two teams and uses positional arguments tied to the latest stored sort.
- `!replay` restores a historical sort into active state but does not create a new history item.
- `!go` clears all stored sort history after success.
- State is runtime-memory only for match session and sort history, so restart resets both.
- Missing or disconnected voice members during `!go` are skipped rather than blocking the entire deployment unless an actual move operation fails.

## Source files used for this analysis

- `src/index.ts`
- `src/utils/commands.ts`
- `src/factory/commands/main/CommandFactory.ts`
- `src/factory/commands/game/SortRankedCommand.ts`
- `src/factory/commands/game/GoCommand.ts`
- `src/factory/commands/game/SwapCommand.ts`
- `src/factory/commands/game/ReplaySortCommand.ts`
- `src/application/use-cases/SortPlayersUseCase.ts`
- `src/domain/services/BalanceTeamsService.ts`
- `src/services/players.service.ts`
- `src/state/teams.ts`
- `src/store/sortHistory.ts`
- `src/config/app-config.ts`