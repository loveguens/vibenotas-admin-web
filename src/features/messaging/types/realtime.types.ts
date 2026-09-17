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

export type ChatGroupRole = "OWNER" | "ADMIN" | "MEMBER";

export type RealtimeChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  type: string;
  content: string;
  clientMessageId: string | null;
  replyToMessageId?: string | null;

  replyTo?: {
    id: string;
    content: string | null;

    sender: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    } | null;
  } | null;
  forwardedFromMessageId?: string | null;
  copyKind?: "FORWARDED" | "SHARED" | null;
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
  eventType: "chat.message.created";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  message: RealtimeChatMessage;
};

export type ChatMessageEditedEvent = {
  eventId: string;
  eventType: "chat.message.edited";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;

  message: Omit<RealtimeChatMessage, "editedAt"> & {
    editedAt: string;
  };
};

export type ChatMessageDeletedEvent = {
  eventId: string;
  eventType: "chat.message.deleted";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  messageId: string;
  deletedAt: string;
  deletedByUserId: string | null;
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

export type ChatGroupMemberAddedEvent = {
  eventId: string;
  eventType: "chat.group.member.added";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;

  member: {
    userId: string;
    role: ChatGroupRole;
    joinedAt: string;
  };

  addedByUserId: string;
};

export type ChatGroupMemberRemovedEvent = {
  eventId: string;
  eventType: "chat.group.member.removed";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  userId: string;
  previousRole: ChatGroupRole;
  removedAt: string;
  removedByUserId: string;
  reason: string;
};

export type ChatGroupMemberRoleChangedEvent = {
  eventId: string;
  eventType: "chat.group.member.role_changed";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  userId: string;
  previousRole: ChatGroupRole;
  role: ChatGroupRole;
  changedAt: string;
  changedByUserId: string;
};

export type ChatGroupOwnerTransferredEvent = {
  eventId: string;
  eventType: "chat.group.owner.transferred";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  previousOwnerUserId: string;
  newOwnerUserId: string;
  previousOwnerNewRole: "ADMIN" | "MEMBER";
  transferredAt: string;
};

export type ChatGroupUpdatedEvent = {
  eventId: string;
  eventType: "chat.group.updated";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  title: string | null;
  avatarUrl: string | null;
  changedAt: string;
  changedByUserId: string;
};

export type ChatGroupDeletedEvent = {
  eventId: string;
  eventType: "chat.group.deleted";
  occurredAt: string;
  schemaVersion: number;

  conversationId: string;
  deletedAt: string;
  deletedByUserId: string | null;
};

export type FriendshipRequestCancelledEvent = {
  eventId: string;
  eventType: "friendship.request.cancelled";
  occurredAt: string;
  schemaVersion: 1;
  friendshipId: string;
  requesterUserId: string;
  cancelledAt: string;
};

export type NotificationNewEvent = {
  eventId: string;
  eventType: "notification.created";
  occurredAt: string;
  schemaVersion: 1;
  notificationType: string;
  sourceType: string;
  sourceId: string;
  data: Record<string, unknown>;
};
