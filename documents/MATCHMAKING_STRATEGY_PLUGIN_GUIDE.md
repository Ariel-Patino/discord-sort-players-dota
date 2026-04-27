# Matchmaking Strategy Plugin Guide

_Last verified: 2026-04-27_

_Technology context: Built with Node.js runtime and TypeScript._

This project now treats matchmaking as a pluggable strategy rather than a hardcoded game-specific rule set.

## Purpose

The core plugin should not know what a `carry`, `tank`, `support`, `healer`, or `duelist` is.

Instead, the active strategy provides:

- the balancing logic
- the constraint validation logic
- the available attribute names
- the human-facing labels for those attributes
- the strategy identity used by configuration

## Core contract

The contract lives in `src/domain/services/IMatchmakingStrategy.ts`.

An implementation must provide:

- `getStrategyId()`
- `getDisplayName()`
- `getAttributeDefinitions()`
- `getAvailableAttributes()`
- `calculateTeamBalance(players, options)`
- `validateConstraints(team, options)`

The important design rule is:

1. the core bot calls the interface
2. the strategy owns game-specific semantics
3. the selected strategy is resolved from configuration

## Default strategy

The default implementation is currently:

- `src/domain/services/Dota1MatchmakingStrategy.ts`

It is registered in:

- `src/config/matchmaking-strategy.ts`

By default, the bot uses:

```env
MATCHMAKING_STRATEGY=dota1
```

If the variable is omitted, `dota1` is used automatically.

## How strategy selection works

`src/config/matchmaking-strategy.ts` contains a registry of strategy factories.

The active strategy is selected through the `MATCHMAKING_STRATEGY` environment variable.

Current flow:

1. read `MATCHMAKING_STRATEGY`
2. look up the strategy in the registry
3. instantiate that strategy
4. expose it as `activeMatchmakingStrategy`

If the ID is unknown, startup fails with a clear error listing the available strategy IDs.

## How to add a new strategy

Example target files:

- `src/domain/services/LeagueOfLegendsStrategy.ts`
- `src/domain/services/ValorantStrategy.ts`

### Step 1: create the class

Implement `IMatchmakingStrategy` directly, or extend the generic rule-based engine `MatchRulesProvider` if your game fits that model.

Example outline:

```ts
import MatchRulesProvider from '@src/domain/services/MatchRulesProvider';
import type { MatchRuleConfig } from '@src/config/gameRules';

const LEAGUE_MATCH_RULES: MatchRuleConfig[] = [
  {
    id: '5v5-league-core',
    minTeamSize: 5,
    constraints: [
      { attribute: 'jungler', minCount: 1, minProficiency: 60 },
      { attribute: 'support', minCount: 1, minProficiency: 60 },
    ],
  },
];

export default class LeagueOfLegendsStrategy extends MatchRulesProvider {
  constructor() {
    super(LEAGUE_MATCH_RULES, {
      strategyId: 'league',
      displayName: 'League of Legends Matchmaking',
      attributeLabels: {
        jungler: 'Jungler',
        support: 'Support',
        marksman: 'Marksman',
      },
    });
  }
}
```

### Step 2: register the strategy

In `src/config/matchmaking-strategy.ts`, add it to the registry.

Example:

```ts
const matchmakingStrategyRegistry = {
  dota1: () => new Dota1MatchmakingStrategy(),
  league: () => new LeagueOfLegendsStrategy(),
};
```

### Step 3: select it from the environment

```env
MATCHMAKING_STRATEGY=league
```

No core plugin code should need to change.

## UI behavior

The attribute UI now reads button names from the active strategy and from attributes already present in player data.

This means:

1. attributes declared by the strategy appear automatically
2. attributes added dynamically by users also appear automatically
3. labels come from the strategy instead of hardcoded plugin defaults

## Extension guideline

When building a new strategy:

1. keep game-specific names and labels inside the strategy class
2. keep plugin-wide logic generic
3. avoid embedding game-specific assumptions outside the strategy layer
4. register the strategy in one place only: `src/config/matchmaking-strategy.ts`

That keeps the plugin stable while allowing multiple game modes to coexist.