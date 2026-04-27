# IMPROVEMENTS

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

_Living roadmap focused on architecture, maintainability, and delivery priorities for this repository._

## 1. Current Status

This file remains relevant and should be kept.


### Implemented Foundations

| Area | Status | Evidence |
|---|---|---|
| Typed app configuration | Implemented | `src/config/app-config.ts`, `src/config/config-validation.test.ts` |
| Matchmaking strategy plugin model | Implemented | `src/domain/services/IMatchmakingStrategy.ts`, `src/config/matchmaking-strategy.ts` |
| Domain balancing service + tests | Implemented | `src/domain/services/BalanceTeamsService.ts`, `src/domain/services/BalanceTeamsService.test.ts` |
| Application use-cases for rank/attributes | Implemented | `src/application/use-cases/UpdatePlayerRanksUseCase.ts`, `src/application/use-cases/UpdatePlayerAttributesUseCase.ts` |
| Repository abstraction + MySQL adapter | Implemented | `src/domain/ports/PlayerRepository.ts`, `src/infrastructure/persistence/MySqlPlayerRepository.ts` |
| Structured logging and process hooks | Implemented | `src/infrastructure/logging/Logger.ts`, `src/infrastructure/logging/process-hooks.ts` |
| Interaction routing extraction from entrypoint | Implemented | `src/app/events/interactionCreate.ts` |
| Command registry pattern | Implemented | `src/factory/commands/main/CommandFactory.ts` |
| Team channel mapping via env and JSON | Implemented | `src/config/app-config.ts` (`readTeamChannelIdsFromEnv`) |
| Docker-first startup with DB bootstrap | Implemented | `docker/start.sh`, `src/init-db.ts`, `docker-compose.yml` |

## 2. Remaining High-Impact Gaps

### 2.1 Consistency in user-facing responses

Recent work already normalized the main outlier command paths (`SwapCommand` and `ReplaySortCommand`) to localized embed responses.

Remaining effort is now incremental and should focus on keeping all future command branches aligned with the same response style.

### 2.2 Two-team limitation in manual roster adjustment

Sorting supports dynamic team counts, but `!swap` is explicitly two-team-only.

Current behavior is valid for now, but limits full multi-team operational parity.

### 2.3 Durability model

`MatchSession` and sort history are process-local. This is acceptable for a single-instance deployment but has operational limits for restarts and horizontal scaling.

### 2.4 Identity normalization

Some flows still depend on username-oriented identity assumptions. Stable Discord user IDs should remain the canonical identity key across all orchestration paths.

### 2.5 Transport strategy decision

Slash command assets exist and can be published, while runtime intentionally operates in prefix-only mode. This is a valid product decision, but should be treated as explicit policy, not accidental drift.

### 2.6 Global audio broadcast (future feature)

Goal:
- allow a command-triggered sound playback flow across multiple voice channels in the same guild.

Important Discord platform constraints:
- bots can join and stream audio to voice channels, but they cannot control arbitrary client-only UI tools from the desktop client.
- in practice, automation should be designed around Discord bot APIs (voice connections, interactions, commands), not around controlling end-user client features directly.
- broadcasting to all channels simultaneously can be resource-intensive and may require explicit opt-in policy per guild.

Recommended technical approach:
1. Introduce an audio use-case (`BroadcastAudioUseCase`) that is transport-neutral.
2. Add a Discord voice adapter that manages one connection per target voice channel.
3. Use a queue/session model to avoid overlapping broadcasts and to handle retries.
4. Add guild-level controls (allowed channels, cooldown, max duration, admin-only trigger).
5. Add observability for connection failures, permission issues, and playback completion.

Suggested command scope:
- `!sound <clip>` for single-channel playback.
- `!soundall <clip>` for multi-channel playback restricted to authorized users.

Risk and policy notes:
- verify permissions (`Connect`, `Speak`, `ViewChannel`) before attempting playback.
- include rate limits and anti-spam controls.
- provide clear opt-out behavior for servers that do not want broadcast audio.

## 3. Prioritized Roadmap

### Phase A: UX and response consistency

1. Replace remaining plain-text command replies with localized embed responses.
2. Standardize usage and validation feedback through `ErrorPresenter` + localization keys.
3. Keep all user-facing text in English and centralized under `src/localization/en/`.

### Phase B: Multi-team operations parity

1. Introduce generic roster-move use-cases for N-team sessions.
2. Keep `!swap` backward-compatible while adding generalized movement semantics.

### Phase C: Optional persistence hardening

1. Persist active match sessions and sort history by guild when durability is required.
2. Keep in-memory mode as a default/simple profile if desired.

### Phase D: Transport policy hardening

1. Decide and document whether runtime remains prefix-first long-term.
2. If slash commands are enabled, route them through the same use-case boundaries.

### Phase E: Audio broadcast capability (optional)

1. Implement single-channel audio playback as baseline behavior.
2. Introduce guarded multi-channel broadcast with queueing and permission checks.
3. Add guild configuration for channel allowlists, cooldown, and clip limits.
4. Add integration tests for adapter behavior and failure recovery.

## 4. Near-Term Action List

Recommended order:

1. Normalize `SwapCommand` and `ReplaySortCommand` responses to localized embeds.
2. Define and implement a generic multi-team roster-adjustment command model.
3. Document and enforce transport policy (prefix-only vs dual-mode).
4. Evaluate session/history persistence requirements per deployment profile.
5. Design and validate an audio broadcast RFC before implementation.

## 5. Conclusion


