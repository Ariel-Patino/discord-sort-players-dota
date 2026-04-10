# UX_AND_POLISH_GUIDE

_Professional audit of the Discord bot's interaction design, user-facing content, scalability constraints, and operational resilience. This document is intended for maintainers and contributors evaluating the project for improvement under the MIT license._

## 1. Executive Summary

The bot already provides the functional building blocks for team sorting, voice movement, and rank management, but the current user experience is inconsistent in tone and presentation. Some commands return plain text, some return embeds, some rely on informal or unprofessional language, and several workflows would benefit from clearer state transitions and richer interactive feedback.

From a UX and product-polish perspective, the most important findings are:

1. **Presentation is inconsistent** across commands and interaction flows.
2. **User-facing text quality is uneven**, including slang, placeholders, mixed-language labels, and offensive phrasing.
3. **The current team model is fixed around two teams and name-based voice routing**, which limits scalability and configurability.
4. **Error handling is mostly local and ad hoc**, with limited structure for logging, recovery, and user-safe feedback.

For a public-facing MIT-licensed repository, the recommended direction is to standardize the bot around a **consistent interaction system**, a **centralized localization/string map**, and a **configurable multi-team orchestration model**.

---

## 2. UX & Message Formatting Audit

## 2.1 Current interaction patterns

The codebase currently uses a mix of:

- plain text channel messages
- `EmbedBuilder` responses for some commands
- select menus for rank updates and manual movement
- buttons for rank pagination
- modal submission for rank input

This is a solid foundation, but the presentation style is not yet unified.

### Current strengths

- `!help` already uses an embed and grouped sections.
- `!setrank` uses select menus and a modal, which is the most modern interaction flow in the bot.
- `!move` already uses select menus rather than forcing manual ID entry.
- `!sort`, `!swap`, and `!replay` produce structured embeds with rank summaries.

### Current weaknesses

- several commands still use raw plain-text messages instead of embeds or ephemeral interaction feedback
- response tone varies from professional to highly informal
- state changes are not consistently confirmed with branded or structured UI
- error messages are often terse, unclear, or unsuitable for a public/community-facing bot
- some labels and strings are mixed-language or placeholder-like (`Nuevo Rank`, `R U a f* loser?`, `U need to have the power to change this.`)

## 2.2 Recommended premium interaction model

The bot should move toward a **consistent premium game-operations UX** built from a small number of reusable response patterns.

### Recommended response types

| Situation | Recommended UI Pattern | Reason |
|---|---|---|
| help and command overview | rich embed with categories and examples | improves discoverability |
| sort results | scoreboard-style embed with buttons | creates a premium match-lobby feel |
| confirmations (rank updated, move completed) | success embed, preferably ephemeral when appropriate | reduces channel noise |
| validation failures | warning embed with corrective action | improves usability and tone |
| destructive/critical actions | confirmation button row | prevents accidental execution |
| pagination or selection | select menus and buttons | better than free-text argument parsing |

### Recommended presentation standard

Each major response should standardize:
- title
- status color (`success`, `warning`, `error`, `info`)
- concise description
- structured fields
- footer with optional context (`sort ID`, server configuration, command hint)

### Suggested interaction improvements by feature

#### Sorting flow
Current state:
- `!sort` returns a strong embed, but the CTA is implicit (`Sort ID: #X — GO?`)

Recommended improvements:
- add **buttons** directly on the result embed:
  - `Deploy Teams`
  - `Replay`
  - `Swap`
  - `Cancel`
- add optional metadata fields:
  - total participants
  - balancing mode used
  - randomization state
- present teams using consistent labels configurable per guild (`Team A`, `Team B`, `Radiant`, `Dire`)

#### Move flow
Current state:
- `!move` uses select menus, which is good, but the instructional copy is minimal

Recommended improvements:
- show a small embed with:
  - action summary
  - timeout notice
  - who can interact with the controls
- use ephemeral acknowledgments for unauthorized interactions
- add a cancel button and timeout-expired status update

#### Rank management flow
Current state:
- good use of select menus and modal submission

Recommended improvements:
- make labels fully English and consistent if English is the repository standard
- show current rank in the select description or modal context
- add success feedback with previous rank -> new rank delta
- optionally include a validation error embed when a submitted rank is outside the accepted range

#### Listing flows
Current state:
- `!list` and `!listall` already use embeds, but their formatting is minimal

Recommended improvements:
- add sorting and grouping options (online by rank, alphabetical, by role)
- paginate long player lists
- add per-player status markers or role icons when role metadata is used meaningfully

## 2.3 Suggested reusable embed design system

A simple embed design system would provide a more professional feel.

### Example categories

- **Info Embed**: blue accent, used for lists, help, and lobby state
- **Success Embed**: green accent, used for move/rank confirmation
- **Warning Embed**: yellow/orange accent, used for validation issues
- **Error Embed**: red accent, used for command failures or missing configuration
- **Match Embed**: branded accent, used for sort results and match deployment

### Recommended utility layer

Introduce a shared presentation helper such as:

- `src/presentation/discord/embeds.ts`
- `src/presentation/discord/messages.ts`

This layer can provide helpers like:
- `buildErrorEmbed(message, hint)`
- `buildSuccessEmbed(title, details)`
- `buildSortResultEmbed(result)`
- `buildHelpEmbed()`

This reduces repetition and ensures consistent visual quality.

---

## 3. Content Audit

## 3.1 Unprofessional or inappropriate language identified

The following strings should be treated as content-quality defects and replaced.

| Current Text | File | Issue |
|---|---|---|
| `Just Pick one, Fucking pussy!` | `src/factory/commands/game/SortRankedCommand.ts` | Explicitly offensive and unsuitable for public use |
| `R U a f* loser?, call someone else to play with!` | `textSource.json` | Harassing and unprofessional |
| `U need to have the power to change this.` | `src/index.ts`, `src/factory/commands/game/MoveCommand.ts` | Informal and unclear |
| `There is nobody, mr/ms Lonely.` | `src/factory/commands/game/RegroupCommand.ts` | Mocking/informal tone |
| `Wrong command. Use !help to see the available options.` | `src/index.ts` | Functional, but too generic and inconsistent with richer UX patterns |
| `Lobby channel not found".` | `src/factory/commands/game/RegroupCommand.ts` | Typographic issue and low-quality phrasing |
| `UNKNOWN` | multiple files | Placeholder-like fallback not ideal for polished UX |
| `Nuevo Rank` | `src/index.ts` | Mixed language relative to the repository's current documentation direction |
| `DOTITA` / `Sort Bot v0.7 VULTURE` | command embeds | Branded/informal wording not ideal for neutral open-source presentation |

## 3.2 Standardized string-map approach

A centralized localization and string-management layer is strongly recommended.

### Recommended structure

```text
src/
└── localization/
    ├── en/
    │   ├── common.json
    │   ├── errors.json
    │   ├── commands.json
    │   └── interactions.json
    └── index.ts
```

### Example categories

- `common`
  - generic success, warning, info, and action labels
- `errors`
  - validation failures
  - configuration issues
  - permission/authorization messages
- `commands`
  - help text
  - usage examples
  - command-specific descriptions
- `interactions`
  - modal labels
  - placeholders
  - button text
  - select-menu instructions

### Example string keys

```json
{
  "errors": {
    "voiceChannelRequired": "Connect to a voice channel before using this command.",
    "insufficientPlayers": "At least two players are required to generate a match.",
    "unauthorizedInteraction": "This interaction can only be completed by the initiating user.",
    "missingLobbyChannel": "No lobby channel is currently configured for this server."
  }
}
```

## 3.3 Content standard recommendation

Adopt a content standard with the following rules:

- no profanity
- no mocking or adversarial tone
- no placeholder/fallback text in final user messages
- one repository language per release line (recommended: English for public documentation consistency)
- concise, instructive, and neutral feedback

This change is not only cosmetic; it materially improves maintainability and community suitability.

---

## 4. Scalability Audit: Multi-Team Logic

## 4.1 Current limitation

The current logic is effectively designed for **exactly two teams** and **exactly two destination voice channels**:

- `src/state/teams.ts` stores only `sentinel` and `scourge`
- `GoCommand` searches specifically for `sentinel/radiant` and `scourge/dire`
- result formatting assumes two score columns
- swap and replay behavior operate on two fixed arrays

This is acceptable for the current Dota-oriented use case, but it does not generalize to:
- more than two teams
- alternative game formats
- guild-specific channel naming conventions
- dynamic temporary match-room creation

## 4.2 Target model for N-team support

The bot should evolve from a fixed-pair model to a **team collection model**.

### Replace this shape:

```ts
{ sentinel: string[]; scourge: string[] }
```

### With a generalized shape:

```ts
interface TeamAssignment {
  teamId: string;
  teamName: string;
  channelId?: string;
  players: string[];
  score?: number;
}

interface MatchSession {
  sessionId: string;
  guildId: string;
  teams: TeamAssignment[];
  createdAt: number;
}
```

## 4.3 Recommended technical solution

### Step 1: Introduce configurable team definitions

Store per-guild team definitions in configuration or DB:

- `teamId`
- display name
- destination channel ID
- optional color/theme metadata
- ordering index

### Step 2: Generalize the balancing algorithm

Replace the current two-team greedy allocation with a generalized algorithm that:
- accepts `N` teams
- accepts a configurable target team size or participant cap
- distributes players across the current minimum-score team
- keeps roster sizes within the allowed spread

For example:
1. sort or shuffle participants
2. iterate players by rank descending
3. each iteration, assign to the team with the lowest current score and available capacity

### Step 3: Generalize movement logic

`GoCommand` should no longer search by name fragments. Instead:
- load the current `MatchSession`
- iterate all teams in `session.teams`
- resolve each configured `channelId`
- move the players assigned to that team

### Step 4: Support dynamic channel creation when needed

For premium or event-driven setups, the bot can optionally:
- create temporary voice channels per generated match
- store the created channel IDs in the `MatchSession`
- delete or archive them after the session completes

### Step 5: Update replay and swap semantics

For N-team support, `swap` should evolve into either:
- `/move-player from_team:A to_team:B player:X`
- `/swap-players team_a:A position:1 team_b:C position:2`

The current positional swap command is too specialized for generalized team orchestration.

## 4.4 Data structure recommendations

The following modules should be redesigned for multi-team support:

| Current Module | Current Limitation | Recommended Direction |
|---|---|---|
| `src/state/teams.ts` | fixed two-team structure | replace with `MatchSession` store containing `teams[]` |
| `src/store/sortHistory.ts` | assumes two scores and two rosters | store a generic `teams: TeamAssignment[]` payload |
| `GoCommand.ts` | fixed channel lookup strategy | move by configured channel IDs per team |
| `SwapCommand.ts` | pairwise sentinel/scourge operations | redesign into generic roster-adjustment use cases |
| sort result embed | two fixed columns | render a dynamic number of fields or paginated team cards |

---

## 5. Error Handling and Logging Strategy

## 5.1 Current state

The bot currently handles errors in a fragmented way:

- `src/index.ts` wraps message command execution in a broad `try/catch`
- some commands log to `console.error`
- some failures only send a plain text message
- interaction errors do not appear to share a unified response strategy

This prevents a consistent user experience and makes production diagnostics harder.

## 5.2 Recommended global error handling model

Introduce a centralized error-handling strategy with three layers.

### Layer 1: Domain and application errors

Define typed errors such as:
- `ValidationError`
- `ConfigurationError`
- `NotFoundError`
- `UnauthorizedInteractionError`
- `VoiceOperationError`

Use these to distinguish expected user-facing failures from unexpected system faults.

### Layer 2: Discord responder/error presenter

Create a single error responder responsible for mapping internal errors to user-safe Discord output.

Example behavior:
- `ValidationError` -> warning embed with corrective hint
- `ConfigurationError` -> error embed instructing maintainers to review server setup
- unknown error -> generic failure embed plus internal logging

### Layer 3: Structured logging

Replace ad hoc `console.log` / `console.error` calls with a logging abstraction.

Recommended fields per log record:
- timestamp
- command name
- guild ID
- channel ID
- user ID (when appropriate)
- session/sort ID
- error type
- stack trace for internal logs only

## 5.3 User-facing error experience standard

All user-facing failures should:
- acknowledge the failed action
- explain what is missing or invalid
- provide a clear next step when possible
- avoid leaking stack traces or raw SQL errors

### Example standard

| Error Type | User-Facing Style |
|---|---|
| invalid command syntax | warning embed with usage example |
| missing voice channel | warning embed with corrective instruction |
| missing configured destination channel | configuration error embed for server admins |
| internal exception | generic error embed plus request to retry or contact maintainer |

## 5.4 Crash resilience recommendations

To reduce bot instability:

1. wrap all command and interaction handlers in a centralized async error wrapper
2. add `process.on('unhandledRejection')` and `process.on('uncaughtException')` logging hooks
3. keep unknown exceptions from terminating the process where safe recovery is possible
4. use operational monitoring around failed move operations and DB errors
5. ensure every interaction path either replies, defers, or gracefully handles failure to avoid Discord timeouts

---

## 6. Recommended Professionalization Roadmap

## Phase 1 — Content and Tone Cleanup

Scope:
- remove offensive or mocking strings
- unify response language to professional English
- move user-facing text into a centralized string map
- replace low-quality fallbacks like `UNKNOWN` with professional alternatives such as `Unregistered Player`

## Phase 2 — UX Standardization

Scope:
- create shared embed factories and design tokens
- convert remaining plain-text operational replies into embeds or structured responses
- add interaction buttons for common next actions after sorting
- reduce noisy channel messages through ephemeral confirmations where appropriate

## Phase 3 — Scalable Match Model

Scope:
- replace two-team assumptions with `MatchSession` and `TeamAssignment[]`
- support configured team definitions and channel IDs
- redesign swap and deployment flows to work with any number of teams

## Phase 4 — Error Handling and Logging

Scope:
- introduce typed errors
- build a centralized Discord error responder
- implement structured logging and failure context
- add resilience hooks for unhandled exceptions and rejections

---

## 7. Priority Recommendations

If only a few improvements can be addressed first, the recommended order is:

1. **Remove offensive and inconsistent user-facing text immediately**
2. **Centralize strings and standardize embed-based responses**
3. **Introduce a generic multi-team session model**
4. **Replace name-based channel routing with configured channel IDs**
5. **Implement centralized error handling and structured logs**

---

## 8. Conclusion

From a UX and polish perspective, the bot has a usable functional core but requires standardization to feel production-ready and community-appropriate. The most important steps are to normalize the presentation layer, remove unprofessional language, centralize string management, and generalize the team model beyond the current two-channel assumption.

With these changes, the repository can provide a significantly more professional developer and end-user experience while remaining a practical foundation for future contributors in the MIT-licensed open-source ecosystem.
