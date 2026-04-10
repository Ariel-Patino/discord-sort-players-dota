# FUNCTIONAL_GUIDE

_Technical guide to the runtime behavior, data movement, and internal module interactions of the application._

## 1. Execution Model

This application is **event-driven**, not route-driven. It does not expose HTTP endpoints or middleware layers. Instead, the functional boundary of a "request" is a **Discord event** received by the bot runtime.

There are two primary entry points:

1. **Message commands** handled through the `messageCreate` event in `src/index.ts`
2. **UI interactions** handled through the `interactionCreate` event in `src/index.ts`

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
5. if the table is empty, insert the default dataset from `src/store/players.ts`
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

Interactive actions are processed in the `interactionCreate` handler in `src/index.ts`.

The application currently supports:
- **string select menus** for player selection
- **buttons** for pagination
- **modal submissions** for rank updates

### Interaction flow

```text
Discord interaction
  -> inspect interaction type and customId
  -> verify the initiating actor when required
  -> resolve UI action (page change, player selection, rank submission)
  -> update UI and/or persist changes
  -> send confirmation response
```

This path is used primarily by the rank management flow and, indirectly, by the move workflow.

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
| Sorting | `!sort-old`, `!sort`, `!sort-r`, `!swap`, `!replay` | Build, adjust, and restore team compositions |
| Player data | `!list`, `!list-all`, `!setrank` | Inspect persisted player metadata and update ranks |
| Voice control | `!go`, `!lobby`, `!move` | Move members across voice channels |
| Help | `!help` | Emit the command reference embed |

---

## 5. Functional Flows by Use Case

## 5.1 Legacy random sort flow (`!sort-old`)

Implemented in `src/factory/commands/game/SortCommand.ts`.

Flow:
1. call `retieveChatMembers()` from `src/helpers/sort/retieveChatMembers.ts`
2. verify the triggering member is connected to a voice channel
3. verify the voice channel has at least two members
4. shuffle members randomly
5. split the shuffled list into two halves
6. resolve display names from the static `players` store when possible
7. send the two team lists to the channel

This flow is **stateless** relative to the ranked/history system. It reports teams but does not persist a new sort record.

## 5.2 Ranked sort flow (`!sort` and `!sort-r`)

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
   - `support = false`
   - `tanque = false`
   - `carry = false`
5. returns the merged player map

### Team-building algorithm
After DB sync, the command:
1. filters the connected members to those resolvable in the player map
2. shuffles the list
3. optionally applies small random noise to ranks with a 30% probability
4. iterates through the players in order
5. assigns each player to the currently lower-scoring team while preserving team size balance

This produces:
- `team1` and `team2` as arrays of player identifiers
- `score1` and `score2` as cumulative rank totals

### Side effects
The command then:
- stores the result in `src/store/sortHistory.ts` using `addSort()`
- stores the current active teams in `src/state/teams.ts` using `setTeams()`
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
5. perform one of three operations:
   - reciprocal swap between both teams
   - move one player from Sentinel to Scourge
   - move one player from Scourge to Sentinel
6. recalculate both team scores from persisted player ranks
7. append the adjusted result to `sortHistory`
8. update active teams via `setTeams()`
9. emit a fresh team embed with a new sort ID

## 5.4 Replay flow (`!replay <n>`)

Implemented in `src/factory/commands/game/ReplaySortCommand.ts`.

Flow:
1. parse the requested sort index
2. fetch the historical sort with `getSort(index)`
3. load all player metadata from the DB with `getAllPlayers()`
4. restore the selected teams into active state with `setTeams()`
5. render the historical result as an embed

This allows a previous sort to be re-activated for subsequent `!go` execution.

## 5.5 Team deployment flow (`!go`)

Implemented in `src/factory/commands/game/GoCommand.ts`.

Purpose:
- take the currently active teams and physically move members into the destination voice channels

Flow:
1. load active teams from `getTeams()`
2. reject execution if no prior sort has populated the state
3. search the guild for voice channels containing either:
   - `sentinel` or `radiant`
   - `scourge` or `dire`
4. resolve each stored player identifier to a guild member
5. call `member.voice.setChannel(channel)` for each eligible member
6. clear the transient state with `clearTeams()` and `clearSortHistory()`
7. send the completion message

This is the final step in the sorting lifecycle: it converts **planned teams** into **actual voice-channel placement**.

## 5.6 Regroup flow (`!lobby`)

Implemented in `src/factory/commands/game/RegroupCommand.ts`.

Flow:
1. find a voice channel whose name contains `lobby`
2. gather all connected members from all other voice channels
3. move each member to the lobby channel
4. send a status message

This command is effectively the inverse of the deployment flow.

## 5.7 Player listing flows (`!list`, `!list-all`)

### `!list`
Implemented in `src/factory/commands/players/ListOnlinePlayersCommand.ts`.

Flow:
- scan all voice channels
- collect connected members
- fetch all persisted player records from the DB
- merge live voice presence with stored metadata
- render an embed of online players and ranks

### `!list-all`
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
In `src/index.ts`, the `interactionCreate` handler then:
1. detects `setrank_select_page_*` menus
2. validates that the current actor matches the encoded initiator identifier
3. opens a modal asking for a new rank value
4. detects `setrank_prev_*` and `setrank_next_*` buttons for paging
5. regenerates the component set for the requested page
6. detects `setrank_modal:*` submission
7. parses the entered rank
8. clamps the value into the interval `1.0` to `10.0`
9. rounds to one decimal place
10. runs `UPDATE <table> SET rank = ? WHERE id = ?`
11. responds with a confirmation embed

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
- `support: boolean`
- `tanque: boolean`
- `carry: boolean`

The same conceptual model is used:
- in the static seed data (`src/store/players.ts`)
- in the DB rows managed by `players.service.ts`
- in formatting logic for lists, sorts, and replays

## 6.2 Persistence flow

Persistent reads and writes are centralized in `src/services/players.service.ts` and direct rank updates inside `src/index.ts`.

### Read path
- `getAllPlayers()` performs `SELECT * FROM <table>`
- result rows are normalized into a `Record<string, PlayerInfo>`

### Write path
- initial inserts occur in `src/init-db.ts`
- new member auto-registration occurs in `getOrCreateAllPlayers()`
- rank updates occur during `setrank` modal submission in `src/index.ts`

## 6.3 In-memory state flow

The application uses two transient state containers:

### `src/state/teams.ts`
Stores the current active sort result:
- `sentinel: string[]`
- `scourge: string[]`

This state is written by:
- ranked sort
- swap
- replay

It is cleared by:
- `!go`

### `src/store/sortHistory.ts`
Stores a bounded history of prior sorts.

Characteristics:
- each record includes team arrays, scores, and a timestamp
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
- `!sort-old` requires voice membership and a minimum number of participants
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
