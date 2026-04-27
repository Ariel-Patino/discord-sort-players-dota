# Discord Sort Players Dota

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

## Overview

This repository contains a TypeScript Discord bot for organizing Dota player groups, balancing teams, managing player metadata, and moving participants across voice channels.

The implementation is a command-oriented, event-driven modular monolith backed by MySQL and designed for Docker-first execution.

Current runtime status:

- Prefix commands are the active command transport (`!sort`, `!go`, etc.).
- Slash chat-input handlers exist in the codebase but are intentionally rejected at runtime in prefix-only mode.
- Team assignment state and sort history are in-memory (process-local) and are not persisted across bot restarts.

## Portfolio Snapshot

This repository can be presented as a production-style Node.js + TypeScript backend bot project.

Highlights:

- Designed as an event-driven modular monolith with clear layer boundaries.
- Uses domain services and use-case classes to separate business logic from transport concerns.
- Includes repository interfaces and MySQL persistence adapters.
- Provides structured logging and centralized error presentation.
- Supports interactive Discord workflows (buttons, select menus, modals).
- Runs in a Docker-first environment with automated DB bootstrap and seed flow.
- Includes unit tests for core balancing and configuration logic.

Technology profile:

- Runtime: Node.js
- Language: TypeScript (strict)
- Framework: discord.js
- Database: MySQL 8 (`mysql2`)
- DevOps: Docker / Docker Compose
- Quality: ESLint, Prettier, Jest

---

## Documentation Index

This README is the high-level single entry point. Detailed references live in `documents/`:

- [`documents/ARCHITECTURE.md`](documents/ARCHITECTURE.md) - architecture style, component mapping, runtime diagrams, and critical sequences
- [`documents/FUNCTIONAL_GUIDE.md`](documents/FUNCTIONAL_GUIDE.md) - startup flow, event lifecycle, command/interactions behavior, and data movement
- [`documents/PROJECT_MAP.md`](documents/PROJECT_MAP.md) - repository map, module inventory, dependencies, and scripts
- [`documents/DB-README.md`](documents/DB-README.md) - MySQL reset, inspection, and maintenance operations
- [`documents/Commands_sort_go_swap_replay.md`](documents/Commands_sort_go_swap_replay.md) - deep analysis for `!sort`, `!go`, `!swap`, and `!replay`
- [`documents/SORT_ALGORITHM_ANALYSIS.md`](documents/SORT_ALGORITHM_ANALYSIS.md) - balancing strategy internals, strengths, and known heuristic limits
- [`documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md`](documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md) - strategy plugin contract, registration, and extension model
- [`documents/UX_AND_POLISH_GUIDE.md`](documents/UX_AND_POLISH_GUIDE.md) - UX consistency audit and interaction design recommendations
- [`documents/IMPROVEMENTS.md`](documents/IMPROVEMENTS.md) - architecture and maintainability roadmap

All project documentation is maintained in English.

### Complete Markdown File Index

The table below links to every `.md` file currently present in the repository.

| File | Area | Description |
|---|---|---|
| [`README.md`](README.md) | Root | Main project overview, setup, architecture summary, and contribution guidance |
| [`documents/ARCHITECTURE.md`](documents/ARCHITECTURE.md) | Documents | Runtime architecture, layer boundaries, and sequence diagrams |
| [`documents/FUNCTIONAL_GUIDE.md`](documents/FUNCTIONAL_GUIDE.md) | Documents | Execution lifecycle and behavior by command/interaction flow |
| [`documents/PROJECT_MAP.md`](documents/PROJECT_MAP.md) | Documents | Repository map, dependency inventory, and script overview |
| [`documents/DB-README.md`](documents/DB-README.md) | Documents | Database reset, inspection, and operational maintenance guide |
| [`documents/Commands_sort_go_swap_replay.md`](documents/Commands_sort_go_swap_replay.md) | Documents | Deep functional analysis of `!sort`, `!go`, `!swap`, and `!replay` |
| [`documents/SORT_ALGORITHM_ANALYSIS.md`](documents/SORT_ALGORITHM_ANALYSIS.md) | Documents | Team balancing strategy behavior and known heuristic limits |
| [`documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md`](documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md) | Documents | Matchmaking strategy extension contract and registration flow |
| [`documents/UX_AND_POLISH_GUIDE.md`](documents/UX_AND_POLISH_GUIDE.md) | Documents | UX audit findings and polish recommendations |
| [`documents/IMPROVEMENTS.md`](documents/IMPROVEMENTS.md) | Documents | Forward-looking improvement roadmap |
| [`seeds/README.md`](seeds/README.md) | Seeds | Seed file format and usage guidance |

### Documentation Traceability Matrix

Use this matrix to quickly map each document to the source-of-truth code area and expected maintenance mode.

| Document | Primary code anchors | Maintenance mode |
|---|---|---|
| `documents/ARCHITECTURE.md` | `src/index.ts`, `src/factory/commands/**`, `src/services/players.service.ts`, `src/state/teams.ts`, `src/store/sortHistory.ts` | Snapshot (update on architecture/runtime flow changes) |
| `documents/FUNCTIONAL_GUIDE.md` | `src/index.ts`, `src/app/events/interactionCreate.ts`, `src/factory/commands/**`, `src/application/use-cases/**` | Snapshot (update on command or interaction behavior changes) |
| `documents/PROJECT_MAP.md` | repository tree, `package.json`, `tsconfig.json`, `docker-compose.yml` | Snapshot (update on structure/dependencies/scripts changes) |
| `documents/DB-README.md` | `src/init-db.ts`, `src/db.ts`, `src/infrastructure/persistence/**`, `docker-compose.yml` | Snapshot (update on schema/bootstrap/ops changes) |
| `documents/Commands_sort_go_swap_replay.md` | `src/factory/commands/game/SortRankedCommand.ts`, `src/factory/commands/game/GoCommand.ts`, `src/factory/commands/game/SwapCommand.ts`, `src/factory/commands/game/ReplaySortCommand.ts` | Snapshot (update on these command semantics) |
| `documents/SORT_ALGORITHM_ANALYSIS.md` | `src/domain/services/BalanceTeamsService.ts`, `src/application/use-cases/SortPlayersUseCase.ts`, `src/factory/commands/game/SortRankedCommand.ts` | Snapshot + analysis (update when balancing logic changes) |
| `documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md` | `src/domain/services/IMatchmakingStrategy.ts`, `src/config/matchmaking-strategy.ts`, `src/domain/services/Dota1MatchmakingStrategy.ts` | Snapshot (update on strategy contract/registry changes) |
| `documents/UX_AND_POLISH_GUIDE.md` | `src/presentation/discord/**`, `src/localization/**`, interaction and command handlers | Historical audit + recommendations |
| `documents/IMPROVEMENTS.md` | cross-cutting architecture across `src/**` | Roadmap (intentionally forward-looking) |

---

## Architecture and Design Snapshot

Primary style: layered modular monolith with event-driven ingress.

High-level runtime flow:

```text
Discord event
  -> src/index.ts
  -> prefix command validation or interaction routing
  -> CommandFactory / interaction handlers
  -> command or use-case execution
  -> DB and runtime-state operations
  -> Discord response or voice move
```

Main layers and responsibilities:

- Ingress: `src/index.ts`, `src/app/events/interactionCreate.ts`
- Routing: `src/factory/commands/main/CommandFactory.ts`
- Application/use cases: `src/factory/commands/**`, `src/application/use-cases/**`
- Domain balancing and rules: `src/domain/services/**`, `src/config/gameRules.ts`, `src/config/matchmaking-strategy.ts`
- Persistence and infrastructure: `src/db.ts`, `src/init-db.ts`, `src/infrastructure/persistence/**`, `docker/start.sh`
- Runtime state: `src/state/teams.ts`, `src/store/sortHistory.ts`

Design characteristics:

- Factory-based command dispatch.
- Configurable team balancing with pluggable matchmaking strategy (`MATCHMAKING_STRATEGY`, default `dota1`).
- Constraint-aware balancing with optional rank noise.
- Interactive Discord UI flows for move/rank/attribute operations via select menus, buttons, and modals.

---

## Language and Technical Stack

| Category | Current stack |
|---|---|
| Primary language | TypeScript (`strict` mode) |
| Runtime | Node.js |
| Module target | CommonJS |
| Bot framework | discord.js |
| Database | MySQL 8.4 via mysql2 |
| Configuration | dotenv + typed runtime config |
| Container workflow | Docker + Docker Compose |
| Testing | Jest + ts-jest |
| Quality tooling | ESLint, Prettier, Husky |

---

## External Libraries in Use

| Library | Role in this project |
|---|---|
| `discord.js` | Discord gateway events, messages, interactions, and voice actions |
| `@discordjs/rest` + `discord-api-types` | Discord API typing and REST support |
| `mysql2` | Promise-based MySQL connectivity |
| `dotenv` | Environment variable loading |
| `module-alias` | Import aliases (`@root/*`, `@src/*`) |
| `chalk` | Colored console output |
| `jest`, `ts-jest`, `@types/jest` | Test runner and TS testing support |
| `ts-node`, `ts-node-dev` | TypeScript execution for setup/dev workflows |

---

## Installation and Setup

### 1. Prerequisites

Recommended workflow:

- Docker
- Docker Compose
- valid Discord bot token

Optional local workflow:

- Node.js
- reachable MySQL instance

### 2. Configure environment variables

Create `.env` and define the variables you need.

Minimal example:

```env
TOKEN=your-discord-bot-token
DISCORD_APPLICATION_ID=your-application-id
DISCORD_GUILD_ID=your-guild-id
PLAYER_SEED_FILE=seeds/example.players.json

TEAM_1_CHANNEL_ID=your-team-1-voice-channel-id
TEAM_2_CHANNEL_ID=your-team-2-voice-channel-id
TEAM_3_CHANNEL_ID=your-team-3-voice-channel-id
TEAM_4_CHANNEL_ID=your-team-4-voice-channel-id

MATCHMAKING_STRATEGY=dota1
```

Notes:

- Docker defaults already provide `DB_*` values through `docker-compose.yml`.
- You can map arbitrary team channels either with repeated `TEAM_<n>_CHANNEL_ID` variables or `TEAM_CHANNEL_IDS_JSON`.
- If `MATCHMAKING_STRATEGY` is omitted, `dota1` is selected.

### 3. Start the full stack

Preferred:

```bash
docker compose up --build
```

NPM wrapper:

```bash
npm start
```

Startup sequence:

1. MySQL container starts and passes health checks.
2. Bot container waits for DB readiness.
3. `npm run setup-db` creates schema if missing.
4. Seed data is inserted only when the table is empty.
5. Bot process starts and logs into Discord.

### 4. Useful commands

```bash
docker compose down
docker compose logs -f bot

npm run docker:down
npm run docker:logs
npm run setup-db
npm run dev
npm run test
npm run lint
npm run format
```

---

## Command Surface (Prefix Mode)

The active command transport is prefix mode. Registered commands:

- `!sort [teamCount]`
- `!go`
- `!swap`
- `!replay`
- `!lobby`
- `!move`
- `!setrank`
- `!setattribute`
- `!list`
- `!listall`
- `!help`

Important behavior notes:

- `!sort` computes and stores team assignments.
- `!go` deploys the active assignment to configured team voice channels.
- `!swap` currently supports only two-team swap semantics even though sorting supports dynamic team counts.

---

## Why MIT Is a Good Fit Here

This repository uses the MIT License, which is usually a strong fit for utility bots and community tooling.

Key advantages:

- Very permissive reuse: developers can use, modify, and redistribute the code with minimal friction.
- Commercial compatibility: companies can integrate or build on top of the project.
- Low adoption overhead: simple terms make contribution and downstream usage easier.
- Strong open-source reach: permissive terms usually increase experimentation, forks, and ecosystem reuse.

MIT still requires preserving copyright and license notice in distributed copies.

---

## Contribution Notes

Recommended contribution practice:

1. Keep each change focused on one concern.
2. Preserve layer boundaries (commands, use cases, services, infrastructure, presentation).
3. Run project checks before opening a PR:

```bash
npm run test
npm run lint
npm run format
```

4. Update the relevant file(s) in `documents/` whenever architecture, flow, setup, or command behavior changes.

### Documentation Update Policy

For every pull request, apply the following policy:

1. If code behavior changes, update the affected document(s) in `documents/` in the same PR.
2. If a document was reviewed and remains accurate, keep its content and update only its `Last verified` date.
3. If a document is intentionally forward-looking (for example `IMPROVEMENTS.md`), keep roadmap items but refresh status notes when completed work is merged.
4. If no documentation update is required, explicitly state `No documentation impact` in the PR description.

Ownership:

- PR author: updates docs and `Last verified` markers for touched areas.
- PR reviewer: confirms documentation scope and date updates before approval.

---

## License

Distributed under the MIT License.

See [`LICENSE`](LICENSE).

## Author

- Ariel Patino Flores
- Email: ariel.patino.f@gmail.com
- LinkedIn: https://www.linkedin.com/in/Ariel-Patino

---

## Summary

This project is a TypeScript Discord bot with MySQL persistence, Docker-first operations, pluggable matchmaking strategy support, and a documented modular architecture designed for maintainable growth.
