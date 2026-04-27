# UX_AND_POLISH_GUIDE

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

_Living UX audit for command responses, interaction behavior, and presentation consistency._

## 1. Keep or Remove?

Keep this file.

## 2. Implemented UX Foundations

| Capability | Status | Evidence |
|---|---|---|
| Centralized localization | Implemented | `src/localization/index.ts`, `src/localization/en/*.json` |
| Shared embed presentation layer | Implemented | `src/presentation/discord/embeds.ts` |
| Centralized error presentation path | Implemented | `src/presentation/discord/ErrorPresenter.ts` |
| Interactive rank flow (select + modal) | Implemented | `src/components/setrank-ui.ts`, `src/app/interactions/modals/onRankSubmit.ts` |
| Interactive attribute flow (select/buttons/modals) | Implemented | `src/components/setattribute-ui.ts`, `src/app/interactions/onBulkSetAttribute.ts` |
| Interactive move flow (select/buttons) | Implemented | `src/components/move-ui.ts`, `src/app/interactions/onBulkMove.ts` |
| Structured sort/replay result embeds | Implemented | `src/factory/commands/game/SortRankedCommand.ts`, `src/factory/commands/game/ReplaySortCommand.ts` |

## 3. Remaining UX Gaps

### 3.1 Legacy plain-text command paths

Some command branches still return direct text strings instead of localized embed responses.

Primary examples:
- `src/factory/commands/game/SwapCommand.ts`
- `src/factory/commands/game/ReplaySortCommand.ts`

Impact:
- inconsistent command tone
- uneven guidance quality
- mixed localization behavior

### 3.2 Inconsistent language on edge messages

At least one usage hint still includes non-English wording (`!replay <número>`), which conflicts with the English-only documentation policy.

Primary example:
- `src/factory/commands/game/ReplaySortCommand.ts`

### 3.3 Partial multi-team UX parity

Core sorting and deployment support dynamic teams, but manual adjustment UX (`!swap`) remains a two-team flow.

Primary example:
- `src/factory/commands/game/SwapCommand.ts`

### 3.4 Prefix-only runtime communication

The project currently rejects chat-input slash execution in runtime. That behavior is valid, but should always be clearly communicated in help and user-facing onboarding copy.

Primary example:
- `src/app/events/interactionCreate.ts`

## 4. Recommended UX Work (Current)

### Priority 1: Response normalization

1. Migrate remaining plain-text responses in `SwapCommand` and `ReplaySortCommand` to `EmbedFactory` + localization keys.
2. Replace hardcoded usage strings with `commands.*` / `errors.*` localization entries.

### Priority 2: Language and wording cleanup

1. Ensure all user-facing response paths are English-only.
2. Standardize command usage hints and correction messages.

### Priority 3: Multi-team manual adjustment UX

1. Keep backward compatibility for current `!swap` behavior.
2. Add a generalized roster-adjustment flow that supports N-team sessions.

### Priority 4: Interaction polish

1. Keep interaction ownership guards and clear failure feedback.
2. Continue routing unauthorized/expired states through consistent warning embeds.

## 5. Validation Checklist for PR Reviews

Use this checklist when reviewing UX-affecting changes:

1. Are all new user-facing messages localized?
2. Are command outcomes rendered with consistent embed patterns?
3. Do failure paths include a clear next step?
4. Is message language consistent with the English documentation policy?
5. If a command touches team operations, does it preserve dynamic-team compatibility?

## 6. Conclusion

The project UX has improved significantly and already includes modern interaction patterns.

The remaining work is mainly consistency: removing residual plain-text paths, enforcing language uniformity, and completing multi-team parity for manual roster adjustments.
