# FUNCTIONAL_GUIDE

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

_Technical guide to the runtime behavior, data movement, and internal module interactions of the application._

## 0. Documentation Maintenance

This guide follows the same documentation policy defined in `README.md`.

For each pull request:

1. Update this file when command flow, interaction behavior, startup sequencing, or state transitions change.
2. If this guide is reviewed and still accurate, keep content unchanged and update only `Last verified`.
3. If there is no functional impact, record `No documentation impact` in the PR description.

Review responsibility:

- Author: updates functional documentation for touched behavior.
- Reviewer: confirms scope coverage and verifies date updates.

## 1. Execution Model

This application is **event-driven**, not route-driven. It does not expose HTTP endpoints or middleware layers. Instead, the functional boundary of a "request" is a **Discord event** received by the bot runtime.

There are two primary entry points:

1. **Message commands** handled through the `messageCreate` event in `src/index.ts`
2. **UI interactions** handled through the `interactionCreate` event in `src/app/events/interactionCreate.ts`

Chat-input slash commands are wired into the interaction layer, but the runtime currently runs in prefix-only mode. If a user invokes a slash command, the bot replies with `errors.prefixOnlyCommands` and does not execute the slash handler.

At a high level, the runtime cycle is:

```text
Discord event
  -> input parsing and validation
  -> command or interaction routing
  -> business logic execution
  -> DB/state updates
  -> Discord response (message, embed, modal, or voice move)
```

---

## 2. Application Startup and Initialization Flow

### 2.1 Configuration bootstrap

`src/config.ts` initializes the runtime configuration with `dotenv`.

Key responsibilities:
- reads `TOKEN` and database environment variables
- applies Docker-friendly defaults for MySQL connection settings
- exposes `assertRequiredConfig()` to prevent startup without a valid bot token

### 2.2 Database connection setup

`src/db.ts` creates a shared MySQL connection pool using `mysql2/promise`.

This pool is imported by service and initialization modules and acts as the single DB access layer.

### 2.3 Database initialization and seeding

`src/init-db.ts` is responsible for bootstrapping persistence.

Execution flow:
1. read the configured table name from `config.dbTable`
2. create the table if it does not already exist
3. count existing rows
4. if rows already exist, stop without reseeding
5. if the table is empty, insert the default dataset from the configured seed JSON file under `seeds/`
6. close the DB pool when finished

This makes the initialization flow **idempotent** for normal restarts.

### 2.4 Bot runtime startup

`src/index.ts` creates a `discord.js` client with these intents:
- `Guilds`
- `GuildVoiceStates`
- `GuildMessages`
- `MessageContent`

The file then:
- registers the `ready` event
- registers `messageCreate` and `interactionCreate` handlers
- validates configuration
- logs into Discord with `client.login(config.token)`

---

## 3. Main Request/Action Lifecycle

## 3.1 Message command lifecycle

A command-driven action moves through the following path:

```text
Discord message
  -> ignore bot-authored messages
  -> extract first token from message.content
  -> validate token in src/utils/commands.ts
  -> resolve command class in CommandFactory
  -> instantiate command object
  -> call execute()
  -> send response and/or mutate state/DB
```

### Detailed flow

1. **Reception**  
   `src/index.ts` listens to `messageCreate`.

2. **Early rejection**  
   Messages authored by bots are ignored immediately.

3. **Token parsing**  
   The first whitespace-delimited token is extracted and converted to lowercase.

4. **Validation**  
   `src/utils/commands.ts` checks the token against the fixed `Commands` union defined in `src/types/commands.ts`.

5. **Routing**  
   `src/factory/commands/main/CommandFactory.ts` maps the token to a concrete command class.

6. **Execution**  
   Each command extends the abstract `Command` base class in `src/factory/commands/main/Command.ts` and implements `execute(): Promise<void>`.

7. **Response handling**  
   The command sends one or more text messages or embeds back to the originating channel.

8. **Global error fallback**  
   If execution throws, `src/index.ts` catches the error, logs it, and sends a generic "wrong command" response.

---

## 3.2 Interaction lifecycle

Interactive actions are processed in `src/app/events/interactionCreate.ts`.

The application currently supports:
- **string select menus** for player selection
- **buttons** for pagination
- **modal submissions** for rank and attribute updates

### Interaction flow

```text
Discord interaction
   -> reject slash commands in prefix-only mode
  -> inspect interaction type and customId
   -> verify the initiating actor when required
   -> resolve UI action (page change, player selection, rank submission, attribute update, bulk move)
  -> update UI and/or persist changes
  -> send confirmation response
```

This path is used by rank management, attribute management, and the move workflow.

---

## 4. Command Routing and Business Modules

## 4.1 Command factory role

`CommandFactory.createCommand()` is the central dispatcher. It translates a validated command token into one of the command implementations under:

- `src/factory/commands/game/`
- `src/factory/commands/players/`
- `src/factory/commands/main/`

This keeps entry-point logic small and moves business behavior into dedicated classes.

## 4.2 Registered command families

| Group | Commands | Functional role |
|---|---|---|
| Sorting | `!sort`, `!swap`, `!replay` | Build, adjust, and restore team compositions |
| Player data | `!list`, `!listall`, `!setrank`, `!setattribute` | Inspect persisted player metadata and update ranks or role attributes |
| Voice control | `!go`, `!lobby`, `!move` | Move members across voice channels |
| Help | `!help` | Emit the command reference embed |

---

## 5. Functional Flows by Use Case

## 5.1 Attribute management flow (`!setattribute`)

Implemented in `src/factory/commands/game/SetAttributeCommand.ts` and `src/app/interactions/onBulkSetAttribute.ts`.

The command has two operating modes:

1. `!setattribute` opens the interactive attribute-management UI for currently connected voice members.
2. `!setattribute <attribute> <proficiency>` performs a quick self-update for the message author.

Interactive mode flow:
1. scan non-empty voice channels
2. auto-create any missing player rows through `getOrCreateAllPlayers()`
3. open an embed plus select/button UI generated by `src/components/setattribute-ui.ts`
4. persist the UI session in `src/state/setAttributeSessions.ts`
5. route select, button, and modal events through `interactionCreate`
6. update player attributes through `UpdatePlayerAttributesUseCase`

Quick-update mode flow:
1. ensure the author has a player record
2. validate the attribute name and proficiency
3. persist the updated attribute JSON for that player
4. send a success or validation-warning embed

## 5.2 Ranked sort flow (`!sort`)

Implemented in `src/factory/commands/game/SortRankedCommand.ts`.

This is the main business flow for team balancing.

### Input collection
- the command scans **all voice channels** in the guild
- it gathers every connected member from non-empty voice channels
- if no connected members are found, it aborts with an error response

### Persistence sync
The command calls `getOrCreateAllPlayers()` from `src/services/players.service.ts`.

That service:
1. loads all rows from the configured `players` table
2. builds an in-memory `Record<string, PlayerInfo>` keyed by player identifier
3. identifies connected guild members that do not yet exist in the DB
4. inserts missing players with default values:
   - `rank = 1.5`
   - default JSON `attributes`
5. returns the merged player map

### Team-building algorithm
After DB sync, the command:
1. filters the connected members to those resolvable in the player map
2. validates the optional team-count argument
3. resolves display labels from configured team voice channels when available
4. asks `SortPlayersUseCase` for a sort result
5. derives match constraints from `MatchRulesProvider` based on team size
6. shuffles the list
7. optionally applies small random noise to ranks with a 30% probability and 0.2 amplitude
8. seeds teams with required role constraints when the selected game rule demands them
9. assigns the remaining players to the currently lowest-scoring non-full team while preserving team size balance

This produces:
- dynamic `teams[]` assignments with team IDs, names, players, scores, and optional role assignments

### Side effects
The command then:
- stores the result in `src/store/sortHistory.ts` using `addSort()`
- stores the current active match session in `src/state/teams.ts` using `setMatchSession()`
- sends an embed with team composition and aggregate rank totals

This is the core bridge between **Discord input**, **persistent player data**, and **ephemeral match state**.

## 5.3 Swap flow (`!swap`)

Implemented in `src/factory/commands/game/SwapCommand.ts`.

Purpose:
- modify the most recent sort result without re-running the full ranking algorithm

Flow:
1. parse two positional arguments
2. support either full swap (`!swap 1 2`) or one-sided move using `-`
3. load the last sort record from `sortHistory`
4. validate index bounds against the current team arrays
5. reject any source sort that does not contain exactly two teams
6. perform one of three operations:
   - reciprocal swap between both teams
   - move one player from team 1 to team 2
   - move one player from team 2 to team 1
7. recalculate both team scores from persisted player ranks
8. append the adjusted result to `sortHistory`
9. update the active match session via `setMatchSession()`
10. emit a fresh team embed with a new sort ID

## 5.4 Replay flow (`!replay <n>`)

Implemented in `src/factory/commands/game/ReplaySortCommand.ts`.

Flow:
1. parse the requested sort index
2. fetch the historical sort with `getSort(index)`
3. load all player metadata from the DB with `getAllPlayers()`
4. restore the selected teams into active state with `setMatchSession()`
5. render the historical result as an embed

This allows a previous sort to be re-activated for subsequent `!go` execution.

## 5.5 Team deployment flow (`!go`)

Implemented in `src/factory/commands/game/GoCommand.ts`.

Purpose:
- take the currently active teams and physically move members into the destination voice channels

Flow:
1. load the active match session from `getMatchSession()`
2. reject execution if no prior sort has populated the state
3. for each active team, resolve the destination channel ID from `appConfig.channels.teamChannelIds`
4. validate that the configured channel exists and is a voice channel
5. validate the bot can `ViewChannel`, `Connect`, and `MoveMembers`
6. resolve each stored player identifier to a guild member by username
7. skip members who are no longer connected to voice
8. call `member.voice.setChannel(channel)` for each eligible member
9. if any configuration or move errors occur, send an error embed and keep state intact
10. if the deployment succeeds, clear the transient state with `clearTeams()` and `clearSortHistory()`
11. send the completion message

This is the final step in the sorting lifecycle: it converts **planned teams** into **actual voice-channel placement**.

## 5.6 Regroup flow (`!lobby`)

Implemented in `src/factory/commands/game/RegroupCommand.ts`.

Flow:
1. find a voice channel whose name contains `lobby`
2. gather all connected members from all other voice channels
3. move each member to the lobby channel
4. send a status message

This command is effectively the inverse of the deployment flow.

## 5.7 Player listing flows (`!list`, `!listall`)

### `!list`
Implemented in `src/factory/commands/players/ListOnlinePlayersCommand.ts`.

Flow:
- scan all voice channels
- collect connected members
- fetch all persisted player records from the DB
- merge live voice presence with stored metadata
- render an embed of online players and ranks

### `!listall`
Implemented in `src/factory/commands/players/ListPlayersCommand.ts`.

Flow:
- fetch all players from the DB with `getAllPlayers()`
- render every registered player as an embed

## 5.8 Rank management flow (`!setrank` + interactions)

### Command entry
`src/factory/commands/game/SetRankCommand.ts` starts the flow by calling `generateSetRankComponents(0, authorId)` from `src/components/setrank-ui.ts`.

### UI generation
`generateSetRankComponents()`:
- loads all players from the DB
- paginates them in groups of 25
- creates a select menu for player choice
- creates previous/next buttons for pagination
- encodes the page and initiator identifier into each `customId`

### Interaction processing
In `src/app/events/interactionCreate.ts`, the interaction router then delegates to the set-rank handlers, which:
1. detects `setrank_select_page_*` menus
2. validates that the current actor matches the encoded initiator identifier
3. opens a modal asking for a new rank value
4. detects `setrank_prev_*` and `setrank_next_*` buttons for paging
5. regenerates the component set for the requested page
6. detects `setrank_modal:*` submission
7. normalizes the entered rank through the rank-update use case and shared config
8. persists the new rank through the player repository
9. responds with a confirmation embed

This flow is the clearest example of a **multi-step UI transaction** in the codebase.

## 5.9 Manual move flow (`!move`)

Implemented in `src/factory/commands/game/MoveCommand.ts` using reusable UI helpers from `src/components/move-ui.ts`.

Flow:
1. enumerate all currently connected members
2. enumerate all available voice channels
3. render two select menus:
   - target member
   - destination channel
4. create a message component collector with a 60-second timeout
5. allow only the initiating actor to make selections
6. once both a member and a channel are selected, move the member with `member.voice.setChannel(channel)`
7. stop the collector and disable the UI rows

This is a **temporary interactive flow**: it exists only for the lifetime of the collector and leaves no persistent state behind.

---

## 6. Data Model and Data Movement

## 6.1 Persistent player model

`src/types/playersInfo.ts` defines the shared player shape:

- `dotaName: string`
- `rank: number`
- `attributes: { support, tank, carry }`

The same conceptual model is used:
- in the static seed data (`seeds/example.players.json` by default)
- in the DB rows managed by `players.service.ts`
- in formatting logic for lists, sorts, and replays

## 6.2 Persistence flow

Persistent reads and writes are centered on `src/services/players.service.ts`, the MySQL repository implementation, and application use cases.

### Read path
- `getAllPlayers()` performs `SELECT * FROM <table>`
- result rows are normalized into a `Record<string, PlayerInfo>`

### Write path
- initial inserts occur in `src/init-db.ts`
- new member auto-registration occurs in `getOrCreateAllPlayers()`
- rank updates occur through the rank-update use case and repository
- attribute updates occur through `UpdatePlayerAttributesUseCase`

## 6.3 In-memory state flow

The application uses two transient state containers:

### `src/state/teams.ts`
Stores the current active sort result:
- `sessionId`
- `createdAt`
- `teams: TeamAssignment[]`

This state is written by:
- ranked sort
- swap
- replay

It is cleared by:
- `!go`

### `src/store/sortHistory.ts`
Stores a bounded history of prior sorts.

Characteristics:
- each record includes `sessionId`, `teams[]`, and a timestamp
- the maximum length is `35`
- history is process-local and is not persisted to MySQL
- replay and swap both depend on this store

This means sort history survives multiple commands during a runtime session, but it does not survive a process restart.

---

## 7. UI Component Layer

The `src/components/` directory isolates Discord UI construction from command logic.

### `setrank-ui.ts`
Builds:
- paginated player selection menus
- previous/next navigation buttons

### `setattribute-ui.ts`
Builds:
- attribute-management prompts
- select menus, action buttons, and modal-launch controls for attribute updates

### `move-ui.ts`
Builds:
- generic select menu rows
- disabled versions of those rows when collectors finish

This separation keeps the command classes focused on orchestration and business logic rather than low-level UI assembly.

---

## 8. Validation and Failure Handling

The current implementation performs validation at several layers:

### Input validation
- invalid commands are rejected before factory dispatch
- malformed replay and swap arguments return usage guidance
- `!sort` requires connected players and a valid team count
- `!go` requires an existing active team state
- `!move` requires at least one connected voice member

### Interaction authorization
Interactive flows for rank updates and move selection compare the current actor identifier against the identifier encoded in the UI `customId`. This prevents unrelated actors from driving another session's controls.

### Persistence safeguards
- DB initialization only seeds when the table is empty
- missing players encountered during ranked sorting are auto-created with safe default values

### Operational limitations
- team history is capped at 35 entries
- sort history and active teams are memory-resident and are reset when the process restarts or after `!go`

---

## 9. End-to-End Summary

The application centers on a simple but clear orchestration model:

1. **Discord events enter the system** through `src/index.ts`
2. **Command or interaction routing** selects the appropriate functional path
3. **Business logic modules** execute sorting, rank management, listing, replay, swap, or movement behavior
4. **Services and stores** provide DB-backed player data and transient runtime state
5. **Discord responses and voice actions** expose the result back to the server environment

In practical terms, the main lifecycle is:

```text
startup -> config -> DB bootstrap -> bot ready
message/interaction -> validation -> command/UI flow -> state or DB mutation -> response
sort -> history/state capture -> optional replay/swap -> !go deployment to voice channels
```

This architecture is small, direct, and optimized for command-oriented Discord workflows rather than generic web request handling.
