# PROJECT_MAP

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

_Preliminary repository map generated from the current source tree and project metadata._

## 1. Repository Overview

`discord-sort-players-dota` is a Node.js and TypeScript application that operates as a Discord bot for organizing and sorting Dota players. The current implementation combines:

- a **Discord bot runtime** built with `discord.js`
- a **MySQL-backed persistence layer** using `mysql2`
- a **Docker Compose** workflow for local and containerized startup
- a **TypeScript** codebase with linting and formatting support

The repository appears to be maintained as a lightweight MIT-licensed application with a command-oriented internal structure.

## 1.1 Portfolio Snapshot

This repository can be presented as a production-style Node.js + TypeScript backend bot project.

Highlights:

- Event-driven modular monolith with clear architecture boundaries.
- Command + use-case oriented organization for business logic.
- Repository abstraction with MySQL adapter implementation.
- Structured logging and centralized Discord error presentation.
- Interactive Discord workflows using menus, buttons, and modals.
- Docker-first runtime with automated database bootstrap and seed flow.
- Test coverage for balancing and configuration-critical modules.

Technology profile:

- Runtime: Node.js
- Language: TypeScript (strict)
- Framework: discord.js
- Database: MySQL 8 via mysql2
- DevOps: Docker / Docker Compose
- Quality tooling: ESLint, Prettier, Jest

---

## 2. Top-Level File and Folder Hierarchy

```text
.
├── commitlint.config.js        # Commit message lint configuration
├── docker-compose.yml          # Multi-service runtime definition (bot + MySQL)
├── Dockerfile                  # Bot container build instructions
├── eslint.config.mjs           # ESLint configuration
├── LICENSE                     # Repository license text (MIT)
├── package.json                # Project metadata, scripts, and dependencies
├── README.md                   # Setup and runtime guide
├── textSource.json             # Application text/content source
├── tsconfig.json               # TypeScript compiler configuration
├── docker/
│   └── start.sh                # Container startup script
├── documents/
│   ├── DB-README.md            # Database reset and MySQL usage guide
│   └── PROJECT_MAP.md          # This document
├── seeds/                      # Example and custom JSON seed files for first-time DB initialization
└── src/
    ├── app/                    # Discord interaction/event handlers
    ├── application/            # Use cases for sorting and player updates
    ├── config.ts               # Environment/config loading and validation
    ├── config/                 # Typed app config and game rules
    ├── db.ts                   # MySQL connection pool setup
    ├── domain/                 # Domain models, ports, and balancing services
    ├── infrastructure/         # Discord, logging, and persistence adapters
    ├── index.ts                # Main Discord client entrypoint
    ├── init-db.ts              # Database initialization and seeding
    ├── localization/           # User-facing strings and translation helpers
    ├── presentation/           # Discord-facing presentation helpers
    ├── components/
    │   ├── move-ui.ts          # UI components for move workflows
    │   ├── setattribute-ui.ts  # UI components for attribute updates
    │   └── setrank-ui.ts       # UI components for rank selection/update
    ├── factory/
    │   └── commands/
    │       ├── game/           # Match, sort, move, rank, attribute, and swap commands
    │       ├── main/           # Base command class, factory, help command
    │       └── players/        # Player listing commands
    ├── helpers/
    │   └── sort/
    │       └── retieveChatMembers.ts   # Voice/chat member retrieval helper
    ├── services/
    │   └── players.service.ts  # DB-backed player retrieval and creation logic
    ├── state/
    │   └── teams.ts            # In-memory team state
    ├── store/
    │   ├── players.ts          # Seed/default player dataset
    │   └── sortHistory.ts      # In-memory sort history tracking
    ├── types/
    │   ├── commands.ts         # Command type definitions
    │   └── playersInfo.ts      # Player data interface(s)
    └── utils/
        └── commands.ts         # Command validation helpers
```

---

## 3. Core Components and Responsibilities

| Area | Key Files | Responsibility |
|---|---|---|
| Entrypoint | `src/index.ts` | Starts the Discord client, listens for messages/interactions, and dispatches command execution. |
| Configuration | `src/config.ts` | Loads required runtime configuration such as bot token and DB settings. |
| Database Access | `src/db.ts`, `src/init-db.ts` | Establishes the MySQL connection and creates/seeds the `players` table when needed. |
| Command Routing | `src/factory/commands/main/CommandFactory.ts` | Maps incoming command tokens to concrete command classes. |
| Game Commands | `src/factory/commands/game/*.ts` | Implements sorting, regrouping, replay, swapping, movement, rank updates, and attribute updates. |
| Player Commands | `src/factory/commands/players/*.ts` | Provides commands for listing all or online players. |
| UI Components | `src/components/*.ts` | Builds Discord interaction components such as menus, buttons, and modals. |
| Service Layer | `src/services/players.service.ts` | Synchronizes guild members with persisted player records and exposes read helpers. |
| In-Memory State | `src/state/teams.ts`, `src/store/sortHistory.ts` | Maintains runtime-only team assignments and previous sort results. |
| Seed Data | `seeds/*.json` | Provides the initial dataset used during first-time DB seeding. |
| Utilities and Types | `src/utils/*.ts`, `src/types/*.ts` | Encapsulates validation helpers and shared type definitions. |

---

## 4. Command Architecture

The application follows a **factory-based command pattern**.

### Main command flow

1. `src/index.ts` receives a Discord message or interaction.
2. The command token is validated with `src/utils/commands.ts`.
3. `CommandFactory.createCommand()` selects the appropriate command class.
4. A concrete command instance executes its behavior.
5. Supporting services, helpers, DB access, and in-memory state provide the underlying data and runtime behavior.

### Registered command families

| Command Group | Files | Purpose |
|---|---|---|
| Main | `main/Command.ts`, `main/CommandFactory.ts`, `main/HelpCommand.ts` | Base command abstraction and shared routing/help behavior. |
| Game | `GoCommand.ts`, `MoveCommand.ts`, `RegroupCommand.ts`, `ReplaySortCommand.ts`, `SetAttributeCommand.ts`, `SetRankCommand.ts`, `SortRankedCommand.ts`, `SwapCommand.ts` | Match organization, team sorting, rank and attribute updates, movement, and replay logic. |
| Players | `ListOnlinePlayersCommand.ts`, `ListPlayersCommand.ts` | Player discovery and reporting. |

Mapped command tokens currently include:

- `!sort`
- `!listall`
- `!list`
- `!go`
- `!lobby`
- `!replay`
- `!help`
- `!swap`
- `!setrank`
- `!setattribute`
- `!move`

---

## 5. Technical Stack

### Languages and runtime

| Category | Technology | Notes |
|---|---|---|
| Primary language | `TypeScript` `^6.0.2` | Strictly typed application code compiled/executed in the Node.js ecosystem. |
| Runtime | `Node.js` | The Docker image uses `node:24-bookworm-slim`; local execution also uses Node.js. |
| Module format | `CommonJS` | Defined in `tsconfig.json`. |

### Frameworks and libraries

| Category | Technology | Notes |
|---|---|---|
| Bot framework | `discord.js` | Main API layer for Discord client events, messages, and interactions. |
| Database driver | `mysql2` | Promise-based MySQL access and query execution. |
| Environment loading | `dotenv` | Loads runtime configuration from `.env`. |
| Alias support | `module-alias` | Enables `@root` and `@src` import aliases. |

### Infrastructure and tooling

| Category | Technology | Notes |
|---|---|---|
| Database | `MySQL 8.4` | Defined in `docker-compose.yml` as the persistent backend. |
| Container orchestration | `Docker Compose` | Starts the MySQL and bot services together. |
| Container image build | `Dockerfile` | Builds the bot runtime image. |
| Linting | `ESLint` | Static code checks via `npm run lint`. |
| Formatting | `Prettier` | Source formatting via `npm run format`. |
| Git hooks | `Husky` | Repository hook automation via the `prepare` script. |
| Dev runtime | `ts-node`, `ts-node-dev` | Executes TypeScript directly for setup and development. |

---

## 6. Dependency Inventory

The following dependency list is taken directly from `package.json`.

### Runtime dependencies

| Package | Version | Role in the application |
|---|---:|---|
| `@discordjs/rest` | `^2.6.1` | REST client utilities for Discord API operations. |
| `chalk` | `^5.6.2` | Colored terminal output for logs and CLI readability. |
| `discord-api-types` | `^0.38.45` | Type definitions for Discord API payloads and structures. |
| `discord.js` | `^14.26.2` | Primary framework for the Discord bot client and interaction model. |
| `dotenv` | `^17.4.1` | Loads environment variables such as `TOKEN` and DB credentials. |
| `module-alias` | `^2.3.4` | Supports import aliases such as `@root/*` and `@src/*`. |
| `mysql2` | `^3.21.1` | MySQL connector with promise-based query support. |

### Development dependencies

| Package | Version | Role in the application |
|---|---:|---|
| `eslint` | `^9.39.4` | Linting engine used for code quality checks. |
| `eslint-config-prettier` | `^10.1.8` | Prevents formatting-rule conflicts between ESLint and Prettier. |
| `eslint-plugin-import` | `^2.32.0` | Adds import/export validation rules. |
| `eslint-plugin-prettier` | `^5.5.5` | Runs Prettier as part of linting workflows. |
| `husky` | `^9.1.7` | Enables local Git hook automation. |
| `prettier` | `^3.8.2` | Code formatting tool. |
| `ts-node` | `^10.9.2` | Executes TypeScript directly without a separate build step. |
| `ts-node-dev` | `^2.0.0` | Development runner with restart-on-change behavior. |
| `typescript` | `^6.0.2` | TypeScript compiler and language tooling. |

---

## 7. Build, Run, and Operational Notes

### NPM scripts

| Script | Command | Purpose |
|---|---|---|
| `npm start` | `docker compose up --build` | Starts the full Dockerized stack. |
| `npm run dev` | `ts-node-dev --respawn --transpile-only src/index.ts` | Starts the bot in development mode with auto-reload. |
| `npm run start:bot` | `ts-node --transpile-only src/index.ts` | Runs only the bot process directly. |
| `npm run setup-db` | `ts-node --transpile-only src/init-db.ts` | Creates and seeds the database table if required. |
| `npm run lint` | `eslint .` | Runs lint checks. |
| `npm run format` | `prettier --write .` | Formats the codebase. |
| `npm run docker:down` | `docker compose down` | Stops the containerized stack. |
| `npm run docker:logs` | `docker compose logs -f bot` | Tails bot logs from Docker. |

### Runtime model

- **Service 1:** `mysql` container based on `mysql:8.4`
- **Service 2:** `bot` container built from the repository `Dockerfile`
- **Startup dependency:** the bot waits for MySQL health before starting
- **Initialization step:** `src/init-db.ts` creates the `players` table and seeds data when the table is empty
- **Configuration source:** environment variables loaded from `.env` and Docker service configuration

### TypeScript configuration highlights

From `tsconfig.json`:

- `module: "commonjs"`
- `target: "es2016"`
- `strict: true`
- `resolveJsonModule: true`
- path aliases for `@root/*` and `@src/*`
- `rootDir: "."` to support root-level JSON imports

---

## 8. Observations for Maintainers

- The codebase is organized around **command execution**, with supporting service, store, and state layers.
- The runtime combines **persistent database storage** with **in-memory session state**.
- Documentation is already present for database reset and inspection in `documents/DB-README.md`; this file complements that guide by focusing on architecture and dependency mapping.
- License metadata is aligned: `LICENSE` and `package.json` both declare MIT.

---

## 9. Summary

This repository uses a compact, maintainable structure centered on a Discord command bot, a MySQL persistence layer, and a Docker-first development workflow. The current stack is based on TypeScript, `discord.js`, `mysql2`, and standard Node.js development tooling, with source code grouped into commands, services, state, store, UI components, and utility helpers.
