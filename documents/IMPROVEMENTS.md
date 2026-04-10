# IMPROVEMENTS

_Comprehensive refactoring and improvement roadmap for the Discord Game Bot codebase, with emphasis on architectural decoupling, configuration hygiene, maintainability, and long-term open-source sustainability._

## 1. Executive Summary

The current repository is functional and relatively compact, but the implementation is tightly centered on the Discord runtime and contains several forms of operational hardcoding. This is acceptable for a small, single-purpose bot, but it limits reuse, testability, multi-server adaptability, and long-term maintainability.

The most important architectural findings are:

1. **Core game behavior is coupled directly to `discord.js` constructs** such as `Message`, `GuildMember`, `VoiceChannel`, component collectors, and embeds.
2. **Business logic, transport logic, and presentation logic are mixed inside command classes** and, in some cases, directly in `src/index.ts`.
3. **Key runtime assumptions are hardcoded** (channel naming conventions, ranking bounds, interaction timeouts, pagination size, sort-history limits, DB defaults, and balancing parameters).
4. **The project structure is workable for a small codebase**, but it does not yet scale cleanly toward multiple event handlers, richer domain models, slash command registration, or independent test coverage.
5. **The command model is based on prefix commands and direct `messageCreate` parsing**, which is a legacy operational pattern compared with modern Discord slash command workflows.

For an MIT-licensed open-source project, the recommended direction is to evolve the codebase into a **layered application with a transport adapter for Discord, a clear domain/use-case layer, typed configuration, and a scalable folder structure**.

---

## 2. Current-State Assessment

| Area | Current State | Risk / Cost | Improvement Priority |
|---|---|---|---|
| Discord coupling | Commands import and manipulate Discord-specific objects directly | High impact on testability and reuse | High |
| Hardcoded operational rules | Channel names, rank bounds, page size, timeouts, and score noise are embedded in source files | High impact on portability and maintainability | High |
| Command model | Prefix parsing through `messageCreate` and `CommandFactory` | Medium impact on UX and long-term Discord compatibility | High |
| Runtime state | Teams and sort history are in-memory only | Medium impact on resilience and multi-instance support | Medium |
| Type safety | Widespread use of `any` in command and event code | Medium impact on correctness and refactoring speed | High |
| Persistence abstraction | SQL is partially centralized but still leaks into event handling (`src/index.ts`) | Medium impact on cohesion and layering | High |
| Testability | No clear domain boundary for unit testing pure game behavior | High impact on quality confidence | High |

---

## 3. Architectural Decoupling

## 3.1 Where Discord-specific concerns are tightly coupled today

The current codebase mixes Discord transport concerns and application logic in several locations.

### Direct coupling points

| File | Coupling Pattern | Observation |
|---|---|---|
| `src/index.ts` | Event orchestration + modal parsing + direct SQL update | The application entry point contains both transport handling and business update logic for rank management |
| `src/factory/commands/main/Command.ts` | `chatChannel: any` injected into all commands | The command abstraction is tied to the Discord message context instead of a transport-neutral request object |
| `src/factory/commands/game/SortRankedCommand.ts` | Uses `GuildMember`, `VoiceChannel`, `EmbedBuilder`, and channel sends directly | Team balancing logic is not isolated from Discord-side data access and response rendering |
| `src/factory/commands/game/GoCommand.ts` | Direct voice-channel lookup and `member.voice.setChannel()` | The domain action "deploy teams" is implemented as Discord-specific side effects |
| `src/factory/commands/game/MoveCommand.ts` | Message component collector and UI state are embedded inside the command | Transport/UI orchestration and use-case behavior are not separated |
| `src/factory/commands/game/SetRankCommand.ts` + `src/index.ts` | UI creation and modal processing depend on Discord `customId` conventions | Application flow relies on Discord-specific identifier encoding |
| `src/helpers/sort/retieveChatMembers.ts` | Uses `channel.reply()` internally | Even helpers perform transport-level output instead of returning structured errors |

### Practical effect of the current coupling

Because the domain behavior is mixed with Discord APIs:

- the sorting algorithm cannot be unit-tested independently without mocking Discord structures
- the bot cannot easily support alternative transport modes (CLI, HTTP admin panel, or another chat provider)
- business rules are harder to reuse across multiple command styles (prefix commands, slash commands, scheduled jobs)
- changes to Discord interaction structure can force modifications in otherwise unrelated application logic

## 3.2 Recommended target architecture

The recommended target is a **hexagonal / ports-and-adapters style layered architecture**, implemented pragmatically rather than dogmatically.

### Target layers

1. **Transport / Adapter Layer**
   - Discord event handlers
   - slash command registration
   - interaction mapping
   - embed and UI presentation building

2. **Application / Use-Case Layer**
   - sort players
   - replay last sort
   - swap team positions
   - move teams to channels
   - update player rank
   - list players

3. **Domain Layer**
   - `Player`
   - `Team`
   - `SortResult`
   - `MatchSession`
   - ranking rules / balancing policy

4. **Infrastructure Layer**
   - MySQL repositories
   - configuration loading
   - Discord API adapter implementation
   - logging and persistence wiring

## 3.3 Separation strategy

### Step 1: Introduce transport-neutral use cases

Create service-level use cases such as:

- `SortPlayersUseCase`
- `SwapPlayersUseCase`
- `ReplaySortUseCase`
- `DeployTeamsUseCase`
- `UpdatePlayerRankUseCase`
- `ListPlayersUseCase`

Each use case should accept plain TypeScript input DTOs and return plain result objects, for example:

```ts
interface SortPlayersInput {
  participants: Array<{ externalId: string; displayName: string }>;
}

interface SortPlayersOutput {
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  sortId: number;
}
```

These use cases must not import `discord.js`.

### Step 2: Define ports/interfaces

Introduce interfaces to represent external dependencies:

- `PlayerRepository`
- `SortHistoryRepository`
- `TeamStateRepository`
- `VoiceGateway`
- `GuildDirectory`
- `Clock`
- `Logger`

Example:

```ts
interface PlayerRepository {
  getAll(): Promise<Player[]>;
  createIfMissing(players: ExternalPlayer[]): Promise<void>;
  updateRank(playerId: string, rank: number): Promise<void>;
}
```

### Step 3: Move Discord objects into adapters only

The Discord layer should:
- parse messages, slash commands, or modal submissions
- map Discord entities into DTOs
- call a use case
- format the returned result into embeds or UI responses

This isolates Discord-specific code to the outer boundary of the system.

### Step 4: Move formatting out of domain logic

Team formatting such as:
- embed titles
- emoji labels
- channel messages
- error response text

should be handled by a **presentation formatter** or Discord adapter layer, not by the sorting logic itself.

### Step 5: Centralize interaction handling

The current `interactionCreate` logic in `src/index.ts` should eventually be decomposed into dedicated handlers such as:

- `src/events/interaction/onSetRankSelect.ts`
- `src/events/interaction/onSetRankModal.ts`
- `src/events/interaction/onMoveSelection.ts`

This preserves the entry point while reducing the size and responsibility of `src/index.ts`.

## 3.4 Expected result after decoupling

After the refactor:

- the sorting policy becomes testable without Discord mocks
- rank updates become reusable from both prefix and slash commands
- the Discord layer becomes a replaceable adapter, not the core of the business model
- future UI changes do not require rewriting core use cases

---

## 4. Configuration vs. Hardcoding

## 4.1 Hardcoded values currently present in the codebase

The following values are currently embedded directly in source files and should be reviewed for extraction into a configuration system.

| Category | Hardcoded Value / Rule | File(s) | Risk |
|---|---|---|---|
| Team channel names | `sentinel`, `radiant`, `scourge`, `dire` | `src/factory/commands/game/GoCommand.ts` | Prevents flexible channel naming or multi-guild deployment |
| Lobby channel rule | `lobby` name match | `src/factory/commands/game/RegroupCommand.ts` | Assumes one naming convention |
| Rank defaults | `1.5` | `src/index.ts`, `src/services/players.service.ts`, `src/store/players.ts` | Hard to tune and inconsistent if changed in one location only |
| Rank bounds | `1.0` to `10.0` | `src/index.ts` | Business rule is embedded in modal handling logic |
| Rank precision | `Math.round(rank * 10) / 10` | `src/index.ts` | Formatting and domain validation are coupled |
| Sorting randomness | `Math.random() < 0.3` and noise amplitude `0.2` | `src/factory/commands/game/SortRankedCommand.ts` | Balancing policy is not configurable |
| Pagination size | `PAGE_SIZE = 25` | `src/components/setrank-ui.ts` | UI behavior is static |
| Interaction timeout | `60000` milliseconds | `src/factory/commands/game/MoveCommand.ts` | Timeout cannot be tuned per deployment |
| History size | `MAX_SORTS = 35` | `src/store/sortHistory.ts` | Session behavior is fixed in source code |
| DB defaults | host `mysql`, port `3306`, user `botuser`, password `botpass`, DB `game`, table `players` | `src/config.ts` | Suitable for local Docker, but should be clearly modeled as environment configuration |
| Connection pool size | `connectionLimit: 10` | `src/db.ts` | Operational tuning is not environment-specific |
| Voice channel type checks | `c.type === 2` | multiple command files | Uses a raw numeric constant instead of a named enum and couples behavior to Discord implementation detail |
| Static seed players | Entire `src/store/players.ts` dataset | `src/store/players.ts` | Seed data is embedded in application code instead of a seed source or admin flow |

## 4.2 Recommended configuration model

A three-tier configuration approach is recommended.

### Tier 1: `.env` for secrets and environment-specific runtime values

Use `.env` strictly for:
- `TOKEN`
- database connection values
- deployment mode (`NODE_ENV`)
- log level
- default guild or feature flags when needed

### Tier 2: typed application config for non-secret defaults

Create a typed configuration module, for example:

- `src/config/app-config.ts`
- `config/default.json`
- `config/production.json`

This should hold operational defaults such as:
- rank min/max/precision
- sort noise policy
- page size
- history limit
- interaction timeout
- command prefix (during migration)
- team labels and display names

### Tier 3: persistent guild-level configuration in the database

For multi-server support, introduce database-backed settings tables such as:

- `guild_settings`
- `team_channel_mapping`
- `bot_feature_flags`

Example configurable items:
- lobby channel ID
- team destination channel IDs
- preferred team labels (`Radiant/Dire`, `Team A/Team B`, etc.)
- maximum history size per guild
- whether ranked sorting noise is enabled

## 4.3 Recommended implementation plan

1. create a single `AppConfig` object validated at startup
2. define a schema for required and optional settings
3. replace all repeated magic numbers with named constants sourced from config
4. move channel discovery from name matching to configured channel IDs
5. store per-guild overrides in the DB for installations that need flexible layouts

### Strong recommendation

The project should stop relying on **Discord usernames** as the primary player key and prefer the stable Discord user ID instead. Usernames are mutable and therefore fragile for persistence and channel movement logic.

---

## 5. Project Structure & Folder Hierarchy

## 5.1 Current structural limitation

The current layout is readable, but it places multiple responsibilities side by side:
- command classes also handle Discord-specific output
- `src/index.ts` combines bootstrapping, event wiring, and interaction logic
- services, state, and store are partially separated, but the domain model is still implicit rather than explicit

## 5.2 Proposed scalable structure

A more scalable folder hierarchy would separate transport, application, domain, and infrastructure concerns.

```text
src/
├── app/
│   ├── commands/               # Slash/prefix command registration and mapping
│   ├── events/                 # Discord event handlers by event type
│   ├── interactions/           # Modal/select/button handlers
│   └── bootstrap/              # App startup and dependency wiring
├── domain/
│   ├── models/                 # Player, Team, MatchSession, SortResult
│   ├── services/               # Pure game logic and ranking policies
│   ├── value-objects/          # Rank, TeamAssignment, ChannelMapping
│   └── ports/                  # Repository and gateway interfaces
├── application/
│   ├── use-cases/              # SortPlayers, UpdateRank, ReplaySort, DeployTeams
│   ├── dto/                    # Input/output contracts
│   └── mappers/                # Mapping from transport objects to DTOs
├── infrastructure/
│   ├── discord/                # Discord.js adapters, responders, slash builders
│   ├── persistence/            # MySQL repository implementations
│   ├── config/                 # Config loading and validation
│   └── logging/                # Logging adapter and structured log helpers
├── shared/
│   ├── constants/
│   ├── errors/
│   ├── utils/
│   └── types/
└── index.ts                    # Thin composition root only
```

## 5.3 Mapping from current structure to target structure

| Current Path | Recommended Destination |
|---|---|
| `src/factory/commands/game/**` | `src/application/use-cases/**` plus `src/infrastructure/discord/commands/**` |
| `src/factory/commands/main/**` | `src/app/commands/**` |
| `src/components/**` | `src/infrastructure/discord/components/**` |
| `src/services/players.service.ts` | split into `domain/ports/PlayerRepository.ts` and `infrastructure/persistence/MySqlPlayerRepository.ts` |
| `src/state/teams.ts` | `application` or `infrastructure/state` depending on persistence strategy |
| `src/store/sortHistory.ts` | `application/state` initially, then persistent repository if durability is required |
| `src/config.ts` and `src/db.ts` | `infrastructure/config/**` and `infrastructure/persistence/**` |

This proposed layout preserves the current mental model while providing a path to scale responsibly.

---

## 6. Code Maintenance and Command Modernization

## 6.1 Legacy or outdated command patterns currently present

The current command flow is based on:
- prefix commands such as `!sort`, `!go`, and `!lobby`
- message-content parsing in `messageCreate`
- command selection through a manual switch statement in `CommandFactory`

This is functional but represents an older Discord bot interaction style.

### Specific maintenance observations

| Observation | Evidence | Recommended Action |
|---|---|---|
| Legacy command retained | `!sort-old` in `CommandFactory` and `types/commands.ts` | Mark as deprecated and remove after migration window |
| Manual switch-based dispatch | `src/factory/commands/main/CommandFactory.ts` | Replace with a command registry keyed by command name |
| Prefix-only command UX | `src/index.ts` `messageCreate` flow | Introduce slash commands as the primary interface |
| Monolithic interaction handler | `src/index.ts` handles select menus, buttons, and modal submit logic | Split by interaction type or feature area |
| Widespread `any` usage | `Command`, multiple command files, collector handlers | Replace with explicit types and DTOs |
| Direct SQL in entry point | `src/index.ts` updates rank directly | Move DB write into an application service/use case |

## 6.2 Slash command migration path

A practical migration plan should avoid a single disruptive rewrite.

### Phase A: Dual-support mode

- keep existing prefix commands operational
- add slash command equivalents using Discord application commands
- map both transport styles to the same use cases

Examples:
- `/sort`
- `/swap sentinel_position:1 scourge_position:2`
- `/go`
- `/lobby`
- `/setrank player:<user> rank:<number>`
- `/players list`

### Phase B: Shared command execution layer

Instead of each Discord command directly owning the business logic, define:

- command handlers for Discord transport
- use cases for the underlying behavior

This means both prefix and slash handlers call the same application service.

### Phase C: Deprecation and removal

After slash commands are stable:
- deprecate `!sort-old`
- deprecate the legacy prefix parser if no longer needed
- reduce `messageCreate` command handling to compatibility mode or remove it entirely

## 6.3 Updated handler pattern recommendation

Recommended pattern:

1. **Event Handler** receives raw Discord event
2. **Command Resolver** maps it to a transport command object
3. **Use Case** executes business logic against interfaces
4. **Presenter / Responder** converts output to Discord embeds, ephemeral messages, or modals

This pattern improves:
- maintainability
- testability
- observability
- onboarding for open-source contributors

---

## 7. Additional Code Quality Improvements

Although not explicitly requested, the following areas materially affect the refactoring outcome.

## 7.1 Type safety

The codebase should remove broad `any` usage in favor of:
- `Message`
- `ChatInputCommandInteraction`
- `ButtonInteraction`
- `StringSelectMenuInteraction`
- repository and use-case interfaces
- typed DTOs for application inputs and outputs

## 7.2 Error handling

Current error handling is mostly message-based and ad hoc. A more robust approach should include:
- typed domain errors (`InvalidRankError`, `MissingTeamStateError`, `ChannelConfigurationError`)
- structured logging
- user-safe error messages separated from developer diagnostics

## 7.3 Testing strategy

A reliable test suite should include:

- **unit tests** for sort balancing policy and swap rules
- **service tests** for player synchronization behavior
- **integration tests** for MySQL-backed repositories
- **adapter tests** for slash command and interaction mapping

The highest-value first target is the **ranked sorting algorithm**, because it is central to the bot's business purpose and is currently embedded in Discord-aware command code.

## 7.4 Logging and observability

Introduce:
- a logging abstraction
- correlation-friendly log messages around sort creation and player movement
- startup configuration summaries excluding secrets
- warning logs for mismatched guild/channel configuration

## 7.5 Internationalization and text consistency

The repository already contains `textSource.json`, but many messages remain inline in command files. A more consistent approach would centralize user-facing text to support:
- message consistency
- easier maintenance
- future localization
- moderation of tone for open-source/public usage

---

## 8. Recommended Delivery Roadmap

## Phase 1 — Stabilization and Safety

Scope:
- remove inline magic numbers into named config constants
- replace raw `any` with concrete Discord types where possible
- move direct SQL rank updates out of `src/index.ts`
- centralize repeated response text

Expected outcome:
- lower regression risk during later refactors
- improved readability and basic cohesion

## Phase 2 — Core Decoupling

Scope:
- create transport-neutral use cases
- extract repository interfaces and MySQL implementations
- move the sorting logic into a pure domain service
- isolate Discord presenters and responders

Expected outcome:
- domain logic becomes independently testable
- Discord becomes an adapter rather than the execution center

## Phase 3 — Configuration Modernization

Scope:
- introduce typed app configuration
- replace name-based channel discovery with configured IDs
- support per-guild configuration storage
- make history limits, rank policy, and timeouts configurable

Expected outcome:
- broader deployment flexibility and lower operational friction

## Phase 4 — Command and Interaction Modernization

Scope:
- add slash command support
- split event handlers by feature
- deprecate `!sort-old`
- optionally retire prefix commands after compatibility period

Expected outcome:
- improved user experience and modern Discord alignment

## Phase 5 — Durability and Open-Source Readiness

Scope:
- persist match/session state if required
- add test coverage and CI quality gates
- standardize contribution workflows and architectural decision records

Expected outcome:
- stronger foundation for community contributions under the MIT license

---

## 9. Recommended Near-Term Priorities

If the project can only address a limited number of items first, the recommended order is:

1. **Extract the sorting and rank-update logic into transport-neutral use cases**
2. **Replace name-based channel assumptions with configurable IDs**
3. **Introduce slash commands while preserving compatibility**
4. **Reduce `any` usage and improve type definitions**
5. **Centralize persistent access behind repository interfaces**

This order provides the best balance between immediate maintainability gains and future architectural flexibility.

---

## 10. Conclusion

The current codebase is a valid starting point for a Discord game bot, but its next stage of maturity requires clear separation between **Discord transport concerns** and **core game behavior**. With moderate structural refactoring, typed configuration, and incremental command modernization, the project can evolve into a more robust and contributor-friendly foundation for an MIT-licensed open-source community.

The strongest long-term direction is not a full rewrite, but a **phased extraction of domain logic, configuration, and infrastructure boundaries** while preserving the existing operational behavior during migration.
