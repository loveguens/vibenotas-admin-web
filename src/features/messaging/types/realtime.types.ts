export type RealtimeErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_REQUEST"
  | "FORBIDDEN"
  | "CONVERSATION_NOT_FOUND"
  | "REALTIME_UNAVAILABLE";

export type RealtimeFailure = {
  ok: false;
  error: {
    code: RealtimeErrorCode;
    message: string;
  };
};

export type RealtimeChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  type: string;
  content: string;
  clientMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;

  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export type ChatMessageNewEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  schemaVersion: number;
  conversationId: string;
  message: RealtimeChatMessage;
};

export type JoinConversationResponse =
  | {
      ok: true;
      data: {
        conversationId: string;
      };
    }
  | RealtimeFailure;

export type TypingResponse =
  | {
      ok: true;
      data: {
        conversationId: string;
        isTyping: boolean;
        delivered: boolean;
      };
    }
  | RealtimeFailure;

export type ChatTypingUpdatedEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  occurredAt: string;
};

export type ChatReadUpdatedEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  schemaVersion: number;
  conversationId: string;
  userId: string;
  readAt: string;
};

export type ChatPresenceUpdatedEvent = {
  userId: string;
  status: string;
  online: boolean;
  occurredAt: string;
  lastSeenAt: string | null;
};
