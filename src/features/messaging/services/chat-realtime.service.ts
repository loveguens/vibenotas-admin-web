import { io, type Socket } from "socket.io-client";

import { getAccessToken, refreshAccessToken } from "../../../services/api";

import type {
  ChatMessageNewEvent,
  ChatPresenceUpdatedEvent,
  ChatReadUpdatedEvent,
  ChatTypingUpdatedEvent,
  JoinConversationResponse,
  TypingResponse,
} from "../types/realtime.types";

type ServerToClientEvents = {
  "chat:message:new": (event: ChatMessageNewEvent) => void;

  "chat:typing:updated": (event: ChatTypingUpdatedEvent) => void;

  "chat:read:updated": (event: ChatReadUpdatedEvent) => void;

  "chat:presence:updated": (event: ChatPresenceUpdatedEvent) => void;
};

type ClientToServerEvents = {
  "chat:conversation:join": (
    payload: {
      conversationId: string;
    },
    acknowledge: (response: JoinConversationResponse) => void,
  ) => void;

  "chat:typing:start": (
    payload: {
      conversationId: string;
    },
    acknowledge: (response: TypingResponse) => void,
  ) => void;

  "chat:typing:stop": (
    payload: {
      conversationId: string;
    },
    acknowledge: (response: TypingResponse) => void,
  ) => void;
};

export type ChatRealtimeSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

const REALTIME_URL =
  import.meta.env.VITE_REALTIME_URL ?? "http://localhost:3001";

async function resolveAccessToken(): Promise<string> {
  const currentAccessToken = getAccessToken();

  if (currentAccessToken) {
    return currentAccessToken;
  }

  return refreshAccessToken();
}

export async function createChatRealtimeSocket(): Promise<ChatRealtimeSocket> {
  const accessToken = await resolveAccessToken();

  const socket = io(REALTIME_URL, {
    autoConnect: false,

    auth: {
      accessToken,
    },
  }) as ChatRealtimeSocket;

  return socket;
}

export async function refreshChatRealtimeAuthentication(
  socket: ChatRealtimeSocket,
): Promise<void> {
  const accessToken = await refreshAccessToken();

  socket.auth = {
    accessToken,
  };
}

export function getRealtimeErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }

  const data = (
    error as {
      data?: unknown;
    }
  ).data;

  if (typeof data !== "object" || data === null || !("code" in data)) {
    return null;
  }

  const code = (
    data as {
      code?: unknown;
    }
  ).code;

  return typeof code === "string" ? code : null;
}
