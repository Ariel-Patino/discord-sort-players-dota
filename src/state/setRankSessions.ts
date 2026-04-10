import { appConfig } from '@src/config/app-config';

export interface SetRankOption {
  label: string;
  value: string;
  description?: string;
}

export interface SetRankSession {
  id: string;
  ownerId: string;
  guildId: string;
  players: SetRankOption[];
  selectedPlayerIds: string[];
  selectedRank: number | null;
  playerPage: number;
  createdAt: number;
}

const setRankSessions = new Map<string, SetRankSession>();
const setRankSessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cloneOption(option: SetRankOption): SetRankOption {
  return { ...option };
}

function cloneSession(session: SetRankSession): SetRankSession {
  return {
    ...session,
    players: session.players.map(cloneOption),
    selectedPlayerIds: [...session.selectedPlayerIds],
  };
}

export function saveSetRankSession(session: SetRankSession): SetRankSession {
  const storedSession = cloneSession(session);
  setRankSessions.set(session.id, storedSession);

  const existingTimer = setRankSessionTimers.get(session.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timeoutHandle = setTimeout(() => {
    deleteSetRankSession(session.id);
  }, appConfig.interactions.moveSelectionMs);

  setRankSessionTimers.set(session.id, timeoutHandle);
  return cloneSession(storedSession);
}

export function getSetRankSession(sessionId: string): SetRankSession | undefined {
  const session = setRankSessions.get(sessionId);
  return session ? cloneSession(session) : undefined;
}

export function updateSetRankSession(
  sessionId: string,
  updates: Partial<
    Pick<SetRankSession, 'selectedPlayerIds' | 'selectedRank' | 'playerPage'>
  >
): SetRankSession | undefined {
  const existingSession = setRankSessions.get(sessionId);

  if (!existingSession) {
    return undefined;
  }

  const updatedSession: SetRankSession = {
    ...existingSession,
    ...(updates.selectedPlayerIds
      ? { selectedPlayerIds: [...updates.selectedPlayerIds] }
      : {}),
    ...(updates.selectedRank !== undefined
      ? { selectedRank: updates.selectedRank }
      : {}),
    ...(updates.playerPage !== undefined ? { playerPage: updates.playerPage } : {}),
  };

  setRankSessions.set(sessionId, updatedSession);
  return cloneSession(updatedSession);
}

export function deleteSetRankSession(sessionId: string): void {
  const timer = setRankSessionTimers.get(sessionId);

  if (timer) {
    clearTimeout(timer);
    setRankSessionTimers.delete(sessionId);
  }

  setRankSessions.delete(sessionId);
}

export function isSetRankSessionExpired(session: SetRankSession): boolean {
  return Date.now() - session.createdAt > appConfig.interactions.moveSelectionMs;
}
