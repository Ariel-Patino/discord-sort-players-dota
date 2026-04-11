import { appConfig } from '@src/config/app-config';

export interface SetAttributeOption {
  label: string;
  value: string;
  description?: string;
}

export interface SetAttributeSession {
  id: string;
  ownerId: string;
  guildId: string;
  players: SetAttributeOption[];
  selectedPlayerIds: string[];
  lastAction: string | null;
  createdAt: number;
}

const setAttributeSessions = new Map<string, SetAttributeSession>();
const setAttributeSessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cloneOption(option: SetAttributeOption): SetAttributeOption {
  return { ...option };
}

function cloneSession(session: SetAttributeSession): SetAttributeSession {
  return {
    ...session,
    players: session.players.map(cloneOption),
    selectedPlayerIds: [...session.selectedPlayerIds],
  };
}

export function saveSetAttributeSession(
  session: SetAttributeSession
): SetAttributeSession {
  const storedSession = cloneSession(session);
  setAttributeSessions.set(session.id, storedSession);

  const existingTimer = setAttributeSessionTimers.get(session.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timeoutHandle = setTimeout(() => {
    deleteSetAttributeSession(session.id);
  }, appConfig.interactions.moveSelectionMs);

  setAttributeSessionTimers.set(session.id, timeoutHandle);
  return cloneSession(storedSession);
}

export function getSetAttributeSession(
  sessionId: string
): SetAttributeSession | undefined {
  const session = setAttributeSessions.get(sessionId);
  return session ? cloneSession(session) : undefined;
}

export function updateSetAttributeSession(
  sessionId: string,
  updates: Partial<Pick<SetAttributeSession, 'selectedPlayerIds' | 'lastAction'>>
): SetAttributeSession | undefined {
  const existingSession = setAttributeSessions.get(sessionId);

  if (!existingSession) {
    return undefined;
  }

  const updatedSession: SetAttributeSession = {
    ...existingSession,
    ...(updates.selectedPlayerIds
      ? { selectedPlayerIds: [...updates.selectedPlayerIds] }
      : {}),
    ...(updates.lastAction !== undefined
      ? { lastAction: updates.lastAction }
      : {}),
  };

  setAttributeSessions.set(sessionId, updatedSession);
  return cloneSession(updatedSession);
}

export function deleteSetAttributeSession(sessionId: string): void {
  const timer = setAttributeSessionTimers.get(sessionId);

  if (timer) {
    clearTimeout(timer);
    setAttributeSessionTimers.delete(sessionId);
  }

  setAttributeSessions.delete(sessionId);
}

export function isSetAttributeSessionExpired(
  session: SetAttributeSession
): boolean {
  return Date.now() - session.createdAt > appConfig.interactions.moveSelectionMs;
}
