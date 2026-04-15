# Discord Sort Players Dota

## Overview

This repository contains a TypeScript-based Discord bot for organizing Dota player groups, balancing teams, managing player rank data, and moving participants across voice channels.

The codebase is structured as a **command-oriented, event-driven application** backed by **MySQL** and typically executed through **Docker Compose**. The current implementation is small enough to be maintained as a modular monolith while still exposing clear boundaries for future refactoring.

---

## Documentation Index

The following documents provide the detailed technical reference for the repository:

- [`documents/PROJECT_MAP.md`](documents/PROJECT_MAP.md) — repository structure, module inventory, and dependency map
- [`documents/FUNCTIONAL_GUIDE.md`](documents/FUNCTIONAL_GUIDE.md) — request/action lifecycle, data movement, and business logic flows
- [`documents/ARCHITECTURE.md`](documents/ARCHITECTURE.md) — architectural classification, component relationships, and Mermaid diagrams
- [`documents/DB-README.md`](documents/DB-README.md) — database reset, inspection, and manual maintenance instructions
- [`documents/Commands_sort_go_swap_replay.md`](documents/Commands_sort_go_swap_replay.md) — current prefix-command flow for `!sort`, `!go`, `!swap`, and `!replay`
- [`documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md`](documents/MATCHMAKING_STRATEGY_PLUGIN_GUIDE.md) — how to register, configure, and implement custom matchmaking strategies

This `README.md` is intended to function as the primary entry point and summary guide.

---

## Technology Summary

| Category | Stack |
|---|---|
| Language | `TypeScript` |
| Runtime | `Node.js` |
| Bot framework | `discord.js` |
| Database | `MySQL 8` via `mysql2` |
| Configuration | `dotenv` |
| Container runtime | `Docker` / `Docker Compose` |
| Tooling | `ESLint`, `Prettier`, `Husky`, `ts-node`, `ts-node-dev` |

---

## Installation and Setup

### 1. Prerequisites

Recommended environment:

- `Docker` and `Docker Compose`
- a valid Discord bot token

Optional local development environment:

- `Node.js`
- access to a MySQL instance

### 2. Configure environment variables

Create a `.env` file from the project template or manually define the required values.

Example:

```env
TOKEN=your-discord-bot-token
DISCORD_APPLICATION_ID=your-application-id
DISCORD_GUILD_ID=your-guild-id
PLAYER_SEED_FILE=seeds/example.players.json
TEAM_1_CHANNEL_ID=your-team-1-voice-channel-id
TEAM_2_CHANNEL_ID=your-team-2-voice-channel-id
TEAM_3_CHANNEL_ID=your-team-3-voice-channel-id
TEAM_4_CHANNEL_ID=your-team-4-voice-channel-id
```

For the default Docker workflow, database values are already supplied by `docker-compose.yml`.

> For multi-team matches, add as many `TEAM_<n>_CHANNEL_ID` variables as needed (for example `TEAM_3_CHANNEL_ID`, `TEAM_4_CHANNEL_ID`, and so on).
> You can also provide a JSON map through `TEAM_CHANNEL_IDS_JSON`, for example `{"team-1":"123","team-2":"456","team-3":"789"}`.
> Player seeds now live under `seeds/`. The repository includes `seeds/example.players.json` as a publishable example, and you can point `PLAYER_SEED_FILE` to your own file with the same format.

### 3. Start the full stack

Preferred startup path:

```bash
docker compose up --build
```

Equivalent npm command:

```bash
npm start
```

This sequence will:
1. start MySQL
2. wait until the database is reachable
3. initialize the `players` table if needed
4. seed initial player data when the table is empty
5. start the Discord bot process

To create more than two teams during a match, use the prefix command with the desired team count:

```bash
!sort 3
```

### 4. Useful operational commands

```bash
docker compose down
docker compose logs -f bot
npm run docker:down
npm run docker:logs
```

### 5. Optional local development without Docker

If MySQL is available outside Docker and the `DB_*` environment variables are configured:

```bash
npm install
npm run setup-db
npm run dev
```

---

## High-Level Architecture Summary

The repository follows a **layered modular monolith** design with **event-driven command processing**.

### Main runtime flow

```text
Discord event
  -> src/index.ts
  -> prefix command validation or interaction routing
  -> CommandFactory dispatch or dedicated interaction handler
  -> command/use-case execution
  -> DB and runtime-state interaction
  -> Discord response or voice action
```

Slash command handlers exist in the codebase, but the runtime currently operates in prefix-only mode. Chat-input interactions are acknowledged with a "use the `!` prefix commands instead" response.

### Primary architectural layers

- **Ingress layer**: `src/index.ts` receives Discord messages and interactions
- **Routing layer**: `src/factory/commands/main/CommandFactory.ts` resolves command handlers
- **Use-case layer**: command classes under `src/factory/commands/**` implement application behavior
- **Service layer**: `src/services/players.service.ts` provides DB-backed player access and synchronization
- **State layer**: `src/state/teams.ts` and `src/store/sortHistory.ts` hold process-local runtime state
- **Infrastructure layer**: `src/config.ts`, `src/db.ts`, `src/init-db.ts`, Docker files, and Compose configuration

### Refactoring potential

The current codebase presents several clear refactoring seams:

- command implementations are already isolated by use case
- DB access is partially centralized in `players.service.ts`
- UI component generation is separated into `src/components/**`
- runtime state is explicitly isolated, making future persistence changes easier to scope

For a more detailed breakdown, refer to [`documents/ARCHITECTURE.md`](documents/ARCHITECTURE.md) and [`documents/FUNCTIONAL_GUIDE.md`](documents/FUNCTIONAL_GUIDE.md).

---

## Contribution Notes

Contributions should remain consistent with the current repository structure and tooling.

Recommended practice:

1. keep changes scoped to a single concern when possible
2. preserve the separation between command logic, UI components, services, and infrastructure
3. run the available quality checks before submitting changes:

```bash
npm run lint
npm run format
```

4. update the relevant documentation in `documents/` when modifying architecture, flows, or setup procedures

The presence of `commitlint` and `husky` indicates an expectation of basic repository hygiene during contribution and review.

---

## License

This repository is distributed under the **MIT License**.

See [`LICENSE`](LICENSE) for the full license text.

---

## Summary

This repository provides a compact, command-driven Discord bot with a MySQL-backed player model and a Docker-first runtime. The documentation set in `documents/` is intended to support maintenance, analysis, and future refactoring without requiring direct code inspection as a first step.
