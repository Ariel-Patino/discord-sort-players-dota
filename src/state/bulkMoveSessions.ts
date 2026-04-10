import { appConfig } from '@src/config/app-config';

export interface BulkMoveOption {
  label: string;
  value: string;
  description?: string;
}

export interface BulkMoveSession {
  id: string;
  ownerId: string;
  guildId: string;
  members: BulkMoveOption[];
  channels: BulkMoveOption[];
  selectedMemberIds: string[];
  selectedChannelId: string | null;
  createdAt: number;
}

const bulkMoveSessions = new Map<string, BulkMoveSession>();
const bulkMoveSessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cloneOption(option: BulkMoveOption): BulkMoveOption {
  return { ...option };
}

function cloneSession(session: BulkMoveSession): BulkMoveSession {
  return {
    ...session,
    members: session.members.map(cloneOption),
    channels: session.channels.map(cloneOption),
    selectedMemberIds: [...session.selectedMemberIds],
  };
}

export function saveBulkMoveSession(session: BulkMoveSession): BulkMoveSession {
  const storedSession = cloneSession(session);
  bulkMoveSessions.set(session.id, storedSession);

  const existingTimer = bulkMoveSessionTimers.get(session.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timeoutHandle = setTimeout(() => {
    deleteBulkMoveSession(session.id);
  }, appConfig.interactions.moveSelectionMs);

  bulkMoveSessionTimers.set(session.id, timeoutHandle);
  return cloneSession(storedSession);
}

export function getBulkMoveSession(sessionId: string): BulkMoveSession | undefined {
  const session = bulkMoveSessions.get(sessionId);
  return session ? cloneSession(session) : undefined;
}

export function updateBulkMoveSession(
  sessionId: string,
  updates: Partial<Pick<BulkMoveSession, 'selectedMemberIds' | 'selectedChannelId'>>
): BulkMoveSession | undefined {
  const existingSession = bulkMoveSessions.get(sessionId);

  if (!existingSession) {
    return undefined;
  }

  const updatedSession: BulkMoveSession = {
    ...existingSession,
    ...(updates.selectedMemberIds
      ? { selectedMemberIds: [...updates.selectedMemberIds] }
      : {}),
    ...(updates.selectedChannelId !== undefined
      ? { selectedChannelId: updates.selectedChannelId }
      : {}),
  };

  bulkMoveSessions.set(sessionId, updatedSession);
  return cloneSession(updatedSession);
}

export function deleteBulkMoveSession(sessionId: string): void {
  const timer = bulkMoveSessionTimers.get(sessionId);

  if (timer) {
    clearTimeout(timer);
    bulkMoveSessionTimers.delete(sessionId);
  }

  bulkMoveSessions.delete(sessionId);
}

export function isBulkMoveSessionExpired(session: BulkMoveSession): boolean {
  return Date.now() - session.createdAt > appConfig.interactions.moveSelectionMs;
}
