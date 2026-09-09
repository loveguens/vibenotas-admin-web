import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import {
  adaptConversation,
  adaptMessage,
  adaptRealtimeMessage,
} from "../features/messaging/adapters";
import type {
  BackendChatMessage,
  BackendConversation,
  BackendFriend,
  BackendFriendRequest,
  BackendFriendSearchResult,
} from "../features/messaging/types/backend.types";
import { ChatComposer } from "../features/messaging/components/ChatComposer";
import { ChatHeader } from "../features/messaging/components/ChatHeader";
import { ChatInfoDrawer } from "../features/messaging/components/ChatInfoDrawer";
import { ChatSidebar } from "../features/messaging/components/ChatSidebar";
import { ChatThemeModal } from "../features/messaging/components/ChatThemeModal";
import { ConfirmActionModal } from "../features/messaging/components/ConfirmActionModal";
import { ConversationActionsMenu } from "../features/messaging/components/ConversationActionsMenu";
import { ConversationList } from "../features/messaging/components/ConversationList";
import { CreateGroupModal } from "../features/messaging/components/CreateGroupModal";
import { GroupInfoDrawer } from "../features/messaging/components/GroupInfoDrawer";
import { MessageActionsMenu } from "../features/messaging/components/MessageActionsMenu";
import { MessageList } from "../features/messaging/components/MessageList";
import { TemporaryMessagesModal } from "../features/messaging/components/TemporaryMessagesModal";
import { AddGroupMembersModal } from "../features/messaging/components/AddGroupMembersModal";
import { API_ROUTES } from "../features/messaging/constants";
import {
  createChatRealtimeSocket,
  getRealtimeErrorCode,
  refreshChatRealtimeAuthentication,
  type ChatRealtimeSocket,
} from "../features/messaging/services/chat-realtime.service";
import type {
  BlockedUser,
  ChatTab,
  ChatThemeId,
  ConfirmAction,
  Conversation,
  ConversationMenuState,
  Friend,
  FriendRequest,
  GroupMember,
  GroupRole,
  Message,
  MessageMenuState,
  SearchUser,
  TemporaryDuration,
} from "../features/messaging/types/chat.types";
import {
  getConversationTheme,
  getCurrentUser,
  getErrorMessage,
  getFixedMenuPosition,
  getTheme,
  persistConversationTheme,
} from "../features/messaging/utils";
import { ScheduledMessagesModal } from "../features/messaging/components/ScheduledMessagesModal";

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversacionId } = useParams();
  const currentUser = getCurrentUser();

  const selectedConversationIdRef = useRef<string | null>(null);

  const chatBasePath =
    currentUser?.rol === "super_admin" || currentUser?.rol === "superadmin"
      ? "/superadmin/chat"
      : "/admin/chat";

  const [activeTab, setActiveTab] = useState<ChatTab>("chats");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversacionId ?? null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);

  const [chatSearch, setChatSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const typingStopTimerRef = useRef<number | null>(null);

  const localTypingActiveRef = useRef(false);

  const localTypingConversationRef = useRef<string | null>(null);

  const remoteTypingTimersRef = useRef<Map<string, number>>(new Map());

  const markReadInFlightRef = useRef<Set<string>>(new Set());

  const selectedConversationTypeRef = useRef<Conversation["tipo"] | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [messageMenu, setMessageMenu] = useState<MessageMenuState | null>(null);

  const [conversationMenu, setConversationMenu] =
    useState<ConversationMenuState | null>(null);

  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const [isTemporaryMessagesModalOpen, setIsTemporaryMessagesModalOpen] =
    useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  const [confirmBusy, setConfirmBusy] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [editingText, setEditingText] = useState("");

  const [chatTheme, setChatTheme] = useState<ChatThemeId>("violet");

  const [temporaryMessagesDuration, setTemporaryMessagesDuration] =
    useState<TemporaryDuration>("off");

  const [loadingConversations, setLoadingConversations] = useState(true);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [isScheduledMessagesOpen, setIsScheduledMessagesOpen] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [nearEnd, setNearEnd] = useState(true);

  const messageAreaRef = useRef<HTMLDivElement | null>(null);
  const chatSocketRef = useRef<ChatRealtimeSocket | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  const selectedConversation = useMemo(() => {
    return (
      conversations.find((item) => item.id === selectedConversationId) ?? null
    );
  }, [conversations, selectedConversationId]);

  const selectedIsMuted = Boolean(selectedConversation?.isMuted);
  const selectedIsPinned = Boolean(selectedConversation?.isPinned);

  const theme = getTheme(chatTheme);

  useEffect(() => {
    selectedConversationTypeRef.current = selectedConversation?.tipo ?? null;

    setTypingUserIds([]);
  }, [selectedConversation?.id, selectedConversation?.tipo]);
  const filteredConversations = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    if (!query) {
      return conversations.filter((item) => !item.isArchived);
    }

    return conversations.filter((item) => {
      const title =
        item.tipo === "grupo"
          ? (item.titulo ?? "")
          : (item.otro_usuario_nombre ?? "");

      return (
        !item.isArchived &&
        `${title} ${item.ultimo_mensaje ?? ""}`.toLowerCase().includes(query)
      );
    });
  }, [chatSearch, conversations]);

  const loadConversations = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoadingConversations(true);
        }

        const response = await api.get(API_ROUTES.conversations);
        const payload = response.data?.data ?? response.data;

        const raw = (payload?.conversaciones ?? []) as BackendConversation[];

        const adapted = raw.map((incoming) =>
          adaptConversation(incoming, currentUser?.id ?? null),
        );

        setConversations((old) =>
          adapted.map((incoming) => {
            const previous = old.find((item) => item.id === incoming.id);

            return {
              ...incoming,
              isPinned: previous?.isPinned ?? false,
              isMuted: previous?.isMuted ?? false,
              isArchived: previous?.isArchived ?? false,
              temporaryMessagesDuration:
                previous?.temporaryMessagesDuration ?? "off",
            };
          }),
        );
      } catch (requestError) {
        setError(
          getErrorMessage(requestError, "No se pudieron cargar los chats."),
        );
      } finally {
        if (!silent) {
          setLoadingConversations(false);
        }
      }
    },
    [currentUser?.id],
  );

  const loadMessages = useCallback(async (id: string, keepPosition = false) => {
    try {
      setLoadingMessages(!keepPosition);

      const response = await api.get(API_ROUTES.conversationMessages(id));

      const payload = response.data?.data ?? response.data;

      const raw = (payload?.mensajes ?? []) as BackendChatMessage[];

      const incoming = raw.map(adaptMessage);

      setMessages((old) => {
        const messagesAreUnchanged =
          keepPosition &&
          old.length === incoming.length &&
          old.every(
            (message, index) =>
              message.id === incoming[index]?.id &&
              message.actualizado_en === incoming[index]?.actualizado_en,
          );

        if (messagesAreUnchanged) {
          return old;
        }

        return incoming;
      });
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudieron cargar los mensajes."),
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);

      const response = await api.get<{
        success: boolean;
        data: {
          amigos: BackendFriend[];
        };
      }>(API_ROUTES.friends);

      const payload = response.data?.data ?? response.data;

      const incoming = payload?.amigos ?? [];

      setFriends(
        incoming.map((item) => ({
          amistad_id: item.amistad_id,
          usuario_id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar_url,
          amigos_desde: item.amigos_desde,
        })),
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo cargar la lista de amigos."),
      );
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);

      const response = await api.get<{
        success: boolean;
        data: {
          solicitudes: BackendFriendRequest[];
        };
      }>(API_ROUTES.receivedRequests);

      const payload = response.data?.data ?? response.data;

      const incoming = payload?.solicitudes ?? [];

      setRequests(
        incoming.map((item) => ({
          amistad_id: item.id,
          usuario_id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar_url,
          creado_en: item.creado_en,
          solicitado_por_mi: item.solicitado_por_mi,
        })),
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudieron cargar las solicitudes."),
      );
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadSentRequests = useCallback(async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: {
          solicitudes: BackendFriendRequest[];
        };
      }>(API_ROUTES.sentRequests);

      const payload = response.data?.data ?? response.data;

      const incoming = payload?.solicitudes ?? [];

      setSentRequests(
        incoming.map((item) => ({
          amistad_id: item.id,
          usuario_id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar_url,
          creado_en: item.creado_en,
          solicitado_por_mi: item.solicitado_por_mi,
        })),
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron cargar las solicitudes enviadas.",
        ),
      );
    }
  }, []);

  const loadBlocked = useCallback(async () => {
    try {
      setLoadingBlocked(true);

      const response = await api.get(API_ROUTES.blocked);
      const payload = response.data?.data ?? response.data;

      setBlockedUsers(payload?.bloqueados ?? []);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron cargar los usuarios bloqueados.",
        ),
      );
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const currentUserId = currentUser.id;

    let disposed = false;

    let socket: ChatRealtimeSocket | null = null;

    let refreshingAuthentication = false;

    function joinSelectedConversation(): void {
      const conversationId = selectedConversationIdRef.current;

      if (!conversationId || !socket?.connected) {
        return;
      }

      socket.emit(
        "chat:conversation:join",
        {
          conversationId,
        },
        (response) => {
          if (disposed || response.ok) {
            return;
          }

          setError(response.error.message);
        },
      );
    }

    async function connectRealtime(): Promise<void> {
      try {
        socket = await createChatRealtimeSocket();

        if (disposed) {
          socket.disconnect();
          return;
        }

        chatSocketRef.current = socket;

        socket.on("connect", () => {
          joinSelectedConversation();
        });

        socket.on("chat:message:new", (event) => {
          if (event.conversationId !== event.message.conversationId) {
            return;
          }

          const incomingMessage = adaptRealtimeMessage(
            event.message,
            currentUserId,
          );

          const currentSelectedId = selectedConversationIdRef.current;

          if (event.conversationId === currentSelectedId) {
            setMessages((old) => {
              const alreadyExists = old.some(
                (message) =>
                  message.id === incomingMessage.id ||
                  (incomingMessage.client_message_id &&
                    message.client_message_id ===
                      incomingMessage.client_message_id),
              );

              if (alreadyExists) {
                return old;
              }

              return [...old, incomingMessage];
            });

            setNearEnd(true);
          }

          void loadConversations(true);
        });

        socket.on("chat:message:edited", (event) => {
          if (event.conversationId !== event.message.conversationId) {
            return;
          }

          if (event.conversationId === selectedConversationIdRef.current) {
            const editedMessage = adaptRealtimeMessage(
              event.message,
              currentUserId,
            );

            setMessages((old) =>
              old.map((message) => {
                if (message.id !== editedMessage.id) {
                  return message;
                }

                /*
                 * Conservamos estado puramente
                 * local del frontend, por ejemplo
                 * read receipt, favoritos,
                 * reacciones y reply preview.
                 */
                return {
                  ...message,

                  contenido: editedMessage.contenido,

                  tipo: editedMessage.tipo,

                  emisor_id: editedMessage.emisor_id,

                  emisor_nombre: editedMessage.emisor_nombre,

                  emisor_avatar: editedMessage.emisor_avatar,

                  client_message_id: editedMessage.client_message_id,

                  es_mio: editedMessage.es_mio,

                  editado: 1,

                  eliminado: editedMessage.eliminado,

                  actualizado_en: editedMessage.actualizado_en,
                };
              }),
            );
          }

          /*
           * Si se editó el último mensaje,
           * actualizamos también el preview
           * de la lista de conversaciones.
           */
          void loadConversations(true);
        });

        socket.on("chat:message:deleted", (event) => {
          if (event.conversationId === selectedConversationIdRef.current) {
            setMessages((old) =>
              old.map((message) =>
                message.id === event.messageId
                  ? {
                      ...message,

                      eliminado: 1,

                      actualizado_en: event.deletedAt,
                    }
                  : message,
              ),
            );
          }

          /*
           * El backend decide cuál pasa a ser
           * ultimo_mensaje después del borrado,
           * así que recargamos solo la lista
           * de conversaciones.
           */
          void loadConversations(true);
        });

        socket.on("chat:typing:updated", (event) => {
          if (
            event.userId === currentUserId ||
            event.conversationId !== selectedConversationIdRef.current
          ) {
            return;
          }

          const oldTimer = remoteTypingTimersRef.current.get(event.userId);

          if (oldTimer !== undefined) {
            window.clearTimeout(oldTimer);

            remoteTypingTimersRef.current.delete(event.userId);
          }

          if (!event.isTyping) {
            setTypingUserIds((old) => old.filter((id) => id !== event.userId));

            return;
          }

          setTypingUserIds((old) =>
            old.includes(event.userId) ? old : [...old, event.userId],
          );

          const timer = window.setTimeout(() => {
            setTypingUserIds((old) => old.filter((id) => id !== event.userId));

            remoteTypingTimersRef.current.delete(event.userId);
          }, 3500);

          remoteTypingTimersRef.current.set(event.userId, timer);
        });

        socket.on("chat:read:updated", (event) => {
          if (event.userId === currentUserId) {
            setConversations((old) =>
              old.map((conversation) =>
                conversation.id === event.conversationId
                  ? {
                      ...conversation,
                      no_leidos: 0,
                    }
                  : conversation,
              ),
            );

            return;
          }

          if (
            event.conversationId !== selectedConversationIdRef.current ||
            selectedConversationTypeRef.current !== "privado"
          ) {
            return;
          }

          const readAt = Date.parse(event.readAt);

          if (Number.isNaN(readAt)) {
            return;
          }

          setMessages((old) =>
            old.map((message) => {
              if (message.emisor_id !== currentUserId) {
                return message;
              }

              const createdAt = Date.parse(message.creado_en);

              if (Number.isNaN(createdAt) || createdAt > readAt) {
                return message;
              }

              return {
                ...message,
                leido: 1,
              };
            }),
          );
        });

        socket.on("chat:presence:updated", (event) => {
          setConversations((old) =>
            old.map((conversation) => {
              if (conversation.otro_usuario_id !== event.userId) {
                return conversation;
              }

              return {
                ...conversation,

                presencia: {
                  status: event.status,

                  online: event.online,

                  occurredAt: event.occurredAt,

                  lastSeenAt: event.lastSeenAt,
                },
              };
            }),
          );
        });

        socket.on("chat:group:updated", (event) => {
          setConversations((old) =>
            old.map((conversation) =>
              conversation.id === event.conversationId
                ? {
                    ...conversation,

                    titulo: event.title ?? conversation.titulo,

                    avatar_url: event.avatarUrl,

                    actualizado_en: event.changedAt,
                  }
                : conversation,
            ),
          );

          if (event.conversationId === selectedConversationIdRef.current) {
            void loadGroupDetail(event.conversationId);
          }

          void loadConversations(true);
        });

        socket.on("chat:group:deleted", (event) => {
          setConversations((old) =>
            old.filter(
              (conversation) => conversation.id !== event.conversationId,
            ),
          );

          if (event.conversationId !== selectedConversationIdRef.current) {
            return;
          }

          setMessages([]);
          setGroupMembers([]);
          setMyGroupRole(null);

          setIsGroupInfoOpen(false);
          setIsChatInfoOpen(false);

          setSelectedConversationId(null);

          selectedConversationIdRef.current = null;

          navigate(chatBasePath);
        });

        socket.on("chat:group:member:added", (event) => {
          refreshRealtimeGroup(event.conversationId);
        });

        socket.on("chat:group:member:removed", (event) => {
          if (event.userId === currentUserId) {
            setConversations((old) =>
              old.filter(
                (conversation) => conversation.id !== event.conversationId,
              ),
            );

            if (selectedConversationIdRef.current === event.conversationId) {
              setMessages([]);
              setGroupMembers([]);
              setMyGroupRole(null);

              setSelectedConversationId(null);

              selectedConversationIdRef.current = null;

              setIsGroupInfoOpen(false);

              navigate(chatBasePath);
            }

            return;
          }

          refreshRealtimeGroup(event.conversationId);
        });

        socket.on("chat:group:member:role-changed", (event) => {
          refreshRealtimeGroup(event.conversationId);
        });

        socket.on("chat:group:owner:transferred", (event) => {
          refreshRealtimeGroup(event.conversationId);
        });

        socket.on("connect_error", (connectionError) => {
          if (disposed) {
            return;
          }

          const code = getRealtimeErrorCode(connectionError);

          if (code !== "AUTHENTICATION_REQUIRED") {
            setError("No se pudo conectar al servicio realtime.");
            return;
          }

          if (refreshingAuthentication) {
            return;
          }

          refreshingAuthentication = true;

          void refreshChatRealtimeAuthentication(socket!)
            .then(() => {
              if (!disposed) {
                socket?.connect();
              }
            })
            .catch(() => {
              if (!disposed) {
                setError("La sesión realtime expiró y no pudo renovarse.");
              }

              socket?.disconnect();
            })
            .finally(() => {
              refreshingAuthentication = false;
            });
        });

        socket.connect();
      } catch (connectionError) {
        if (!disposed) {
          setError(
            getErrorMessage(
              connectionError,
              "No se pudo iniciar el servicio realtime.",
            ),
          );
        }
      }
    }

    void connectRealtime();

    return () => {
      disposed = true;

      if (chatSocketRef.current === socket) {
        chatSocketRef.current = null;
      }

      for (const timer of remoteTypingTimersRef.current.values()) {
        window.clearTimeout(timer);
      }

      remoteTypingTimersRef.current.clear();

      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const socket = chatSocketRef.current;

    if (!socket?.connected) {
      return;
    }

    socket.emit(
      "chat:conversation:join",
      {
        conversationId: selectedConversationId,
      },
      (response) => {
        if (response.ok) {
          return;
        }

        setError(response.error.message);
      },
    );
  }, [selectedConversationId]);
  useEffect(() => {
    const id = conversacionId ?? null;

    if (id && id !== selectedConversationId) {
      setSelectedConversationId(id);
    }
  }, [conversacionId, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    setChatTheme(getConversationTheme(selectedConversationId));

    setTemporaryMessagesDuration(
      selectedConversation?.temporaryMessagesDuration ?? "off",
    );

    void loadMessages(selectedConversationId);

    void markConversationRead(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMessageMenu(null);
        setConversationMenu(null);
      }
    };

    window.addEventListener("keydown", close);

    return () => {
      window.removeEventListener("keydown", close);
    };
  }, []);

  useEffect(() => {
    if (!nearEnd) return;

    requestAnimationFrame(() => {
      messageAreaRef.current?.scrollTo({
        top: messageAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, nearEnd]);

  function refreshRealtimeGroup(conversationId: string): void {
    void loadConversations(true);

    if (conversationId === selectedConversationIdRef.current) {
      void loadGroupDetail(conversationId);
    }
  }

  function closeMenus(): void {
    setMessageMenu(null);
    setConversationMenu(null);
  }

  function selectConversation(id: string): void {
    closeMenus();
    setSelectedConversationId(id);
    setActiveTab("chats");
    setReplyTo(null);

    navigate(`${chatBasePath}/${id}`);
  }

  function changeTab(tab: ChatTab): void {
    closeMenus();
    setActiveTab(tab);
    setSelectedConversationId(null);

    navigate(chatBasePath);

    if (tab === "amigos") {
      void loadFriends();
    }

    if (tab === "solicitudes") {
      void Promise.all([loadRequests(), loadSentRequests()]);
    }

    if (tab === "bloqueados") {
      void loadBlocked();
    }
  }

  function openMessageActions(
    button: HTMLButtonElement,
    message: Message,
  ): void {
    setConversationMenu(null);

    setMessageMenu({
      message,
      position: getFixedMenuPosition(
        button,
        224,
        message.emisor_id === currentUser?.id ? 420 : 330,
      ),
    });
  }

  function openConversationActions(button: HTMLButtonElement): void {
    if (!selectedConversation) return;

    setMessageMenu(null);

    setConversationMenu({
      conversation: selectedConversation,
      position: getFixedMenuPosition(button, 256, 580),
    });
  }

  function emitTyping(conversationId: string, isTyping: boolean): void {
    const socket = chatSocketRef.current;

    if (!socket?.connected) {
      return;
    }

    const eventName = isTyping ? "chat:typing:start" : "chat:typing:stop";

    socket.emit(
      eventName,
      {
        conversationId,
      },
      () => {
        /*
         * Typing es best-effort.
         * Un fallo no debe bloquear escritura
         * ni mostrar errores persistentes.
         */
      },
    );
  }

  function stopLocalTyping(): void {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);

      typingStopTimerRef.current = null;
    }

    const conversationId = localTypingConversationRef.current;

    if (conversationId && localTypingActiveRef.current) {
      emitTyping(conversationId, false);
    }

    localTypingActiveRef.current = false;

    localTypingConversationRef.current = null;
  }

  function handleMessageTextChange(value: string): void {
    setMessageText(value);

    const conversationId = selectedConversationId;

    if (!conversationId) {
      stopLocalTyping();
      return;
    }

    if (!value.trim()) {
      stopLocalTyping();
      return;
    }

    if (
      localTypingConversationRef.current &&
      localTypingConversationRef.current !== conversationId
    ) {
      stopLocalTyping();
    }

    if (!localTypingActiveRef.current) {
      emitTyping(conversationId, true);

      localTypingActiveRef.current = true;

      localTypingConversationRef.current = conversationId;
    }

    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      stopLocalTyping();
    }, 1500);
  }

  async function markConversationRead(conversationId: string): Promise<void> {
    if (markReadInFlightRef.current.has(conversationId)) {
      return;
    }

    markReadInFlightRef.current.add(conversationId);

    try {
      await api.put(API_ROUTES.markConversationRead(conversationId));

      setConversations((old) =>
        old.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                no_leidos: 0,
              }
            : conversation,
        ),
      );
    } catch {
      /*
       * No bloqueamos el chat si falla
       * únicamente la confirmación de lectura.
       */
    } finally {
      markReadInFlightRef.current.delete(conversationId);
    }
  }
  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const contenido = messageText.trim();

    if (!contenido || !selectedConversationId || sendingMessage) {
      return;
    }

    /*
     * El backend V2 todavía no expone reply_to
     * en SendChatMessageDto.
     *
     * No enviamos ni simulamos datos que el
     * servidor no pueda persistir.
     */
    if (replyTo) {
      setError(
        "Las respuestas a mensajes todavía no están disponibles en el contrato actual del backend.",
      );
      return;
    }

    setSendingMessage(true);
    setError("");

    try {
      /*
       * UUID v4 generado por el cliente.
       *
       * El backend lo utiliza como clave
       * idempotente para impedir duplicados
       * cuando una solicitud se reintenta.
       */
      const clientMessageId = crypto.randomUUID();

      const response = await api.post(
        API_ROUTES.conversationMessages(selectedConversationId),
        {
          clientMessageId,
          content: contenido,
        },
      );

      const payload = response.data?.data ?? response.data;

      const createdRaw = payload?.mensaje as BackendChatMessage | undefined;

      const created = createdRaw ? adaptMessage(createdRaw) : null;

      if (created) {
        setMessages((old) => {
          const alreadyExists = old.some(
            (message) =>
              message.id === created.id ||
              (created.client_message_id &&
                message.client_message_id === created.client_message_id),
          );

          if (alreadyExists) {
            return old;
          }

          return [...old, created];
        });

        setNearEnd(true);
      } else {
        /*
         * Fallback seguro:
         * si el backend confirma la operación
         * pero no devuelve mensaje, recargamos
         * la fuente de verdad.
         */
        await loadMessages(selectedConversationId, true);
      }

      stopLocalTyping();

      setMessageText("");
      setReplyTo(null);

      await loadConversations(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo enviar el mensaje."));
    } finally {
      setSendingMessage(false);
    }
  }
  async function saveEdit(messageId: string): Promise<void> {
    const contenido = editingText.trim();

    if (!contenido) return;

    try {
      await api.put(API_ROUTES.updateMessage(messageId), {
        contenido,
      });

      setMessages((old) =>
        old.map((message) =>
          message.id === messageId
            ? {
                ...message,
                contenido,
                editado: 1,
              }
            : message,
        ),
      );

      setEditingMessageId(null);
      setEditingText("");

      await loadConversations(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo editar el mensaje."));
    }
  }

  function askDelete(message: Message, everyone: boolean): void {
    setConfirmAction({
      title: everyone ? "¿Eliminar para todos?" : "¿Eliminar de tu vista?",
      description: everyone
        ? "La acción necesita que el backend confirme que el mensaje puede borrarse para todos."
        : "Esta acción eliminará el mensaje de tu vista. El endpoint actual elimina el mensaje; adapta el backend para diferenciar ambos casos.",
      confirmLabel: "Eliminar mensaje",
      tone: "danger",
      onConfirm: async () => {
        try {
          setConfirmBusy(true);

          await api.delete(API_ROUTES.deleteMessage(message.id), {
            data: {
              scope: everyone ? "everyone" : "mine",
            },
          });

          setMessages((old) =>
            everyone
              ? old.map((item) =>
                  item.id === message.id
                    ? {
                        ...item,
                        eliminado: 1,
                        contenido: "",
                      }
                    : item,
                )
              : old.filter((item) => item.id !== message.id),
          );

          setConfirmAction(null);
        } catch (requestError) {
          setError(
            getErrorMessage(requestError, "No se pudo eliminar el mensaje."),
          );
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  }

  async function copyMessage(message: Message): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.contenido);
      setToast("Mensaje copiado.");
    } catch {
      setError("No se pudo copiar el mensaje.");
    }
  }

  async function shareMessage(message: Message): Promise<void> {
    try {
      const text = `${message.emisor_nombre}: ${message.contenido}`;

      if (navigator.share) {
        await navigator.share({
          title: "Mensaje de VibeNotas",
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }

      setToast("Mensaje preparado para compartir.");
    } catch {
      // El usuario cerró la ventana de compartir.
    }
  }

  function updateSelectedConversation(patch: Partial<Conversation>): void {
    if (!selectedConversationId) return;

    setConversations((old) =>
      old.map((item) =>
        item.id === selectedConversationId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function togglePin(): void {
    updateSelectedConversation({
      isPinned: !selectedIsPinned,
    });

    setToast(
      selectedIsPinned
        ? "Conversación quitada de fijados."
        : "Conversación fijada arriba.",
    );
  }

  function toggleMute(): void {
    updateSelectedConversation({
      isMuted: !selectedIsMuted,
    });

    setToast(
      selectedIsMuted ? "Notificaciones activadas." : "Chat silenciado.",
    );
  }

  function selectTheme(id: ChatThemeId): void {
    if (!selectedConversationId) return;

    persistConversationTheme(selectedConversationId, id);
    setChatTheme(id);
    setIsThemeModalOpen(false);

    setToast("Tema guardado solo para esta conversación.");
  }

  function selectTemporary(value: TemporaryDuration): void {
    updateSelectedConversation({
      temporaryMessagesDuration: value,
    });

    setTemporaryMessagesDuration(value);
    setIsTemporaryMessagesModalOpen(false);

    setMessages((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        conversacion_id: selectedConversationId ?? "",
        emisor_id: null,
        emisor_nombre: "Sistema",
        contenido: `Mensajes temporales configurados: ${
          value === "off" ? "desactivados" : value
        }.`,
        tipo: "sistema",
        leido: 1,
        editado: 0,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      },
    ]);

    setToast(
      "Configuración guardada visualmente; falta confirmar el endpoint PHP.",
    );
  }

  function futureAction(title: string, description: string): void {
    setConfirmAction({
      title,
      description,
      confirmLabel: "Entendido",
      tone: "primary",
      onConfirm: () => setConfirmAction(null),
    });
  }

  async function createOrOpenPrivateChat(friendId: string): Promise<void> {
    try {
      const response = await api.post(API_ROUTES.createDirectChat, {
        userId: friendId,
      });

      const payload = response.data?.data ?? response.data;
      const id = String(payload?.conversacion?.id ?? "");

      if (!id) {
        throw new Error("El servidor no devolvió el ID.");
      }

      await loadConversations(true);
      selectConversation(id);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo iniciar la conversación privada.",
        ),
      );
    }
  }

  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  const [myGroupRole, setMyGroupRole] = useState<GroupRole | null>(null);

  const [savingGroupMetadata, setSavingGroupMetadata] = useState(false);

  async function searchPeople(value: string): Promise<void> {
    setPeopleSearch(value);

    const query = value.trim();

    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await api.get<{
        success: boolean;
        data: {
          resultados: BackendFriendSearchResult[];
        };
      }>(API_ROUTES.searchUsers(query));

      const payload = response.data?.data ?? response.data;

      const incoming = payload?.resultados ?? [];

      setSearchUsers(
        incoming.map((item) => ({
          id: item.usuario.id,
          nombre: item.usuario.nombre,
          username: item.usuario.username,
          avatar: item.usuario.avatar_url,
          amistad_id: item.amistad.id,
          amistad_estado: item.amistad.estado,
        })),
      );
    } catch {
      setSearchUsers([]);
    }
  }

  async function sendFriendRequest(userId: string): Promise<void> {
    try {
      await api.post(API_ROUTES.requestFriendship, {
        userId,
      });

      await Promise.all([
        searchPeople(peopleSearch),
        loadRequests(),
        loadSentRequests(),
      ]);
      setToast("Solicitud enviada.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo enviar la solicitud."),
      );
    }
  }

  async function acceptRequest(id: string): Promise<void> {
    try {
      await api.put(API_ROUTES.acceptRequest(id));

      await Promise.all([loadRequests(), loadFriends()]);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo aceptar la solicitud."),
      );
    }
  }

  async function rejectRequest(id: string): Promise<void> {
    try {
      await api.put(API_ROUTES.rejectRequest(id));
      await loadRequests();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo rechazar la solicitud."),
      );
    }
  }

  async function removeFriendship(friendshipId: string): Promise<void> {
    try {
      await api.delete(API_ROUTES.removeFriendship(friendshipId));

      await loadFriends();

      if (peopleSearch.trim().length >= 2) {
        await searchPeople(peopleSearch);
      }

      setToast("Amistad eliminada.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo eliminar la amistad."),
      );
    }
  }

  async function unblockUser(id: string): Promise<void> {
    try {
      await api.post(API_ROUTES.unblockUser(id));

      await loadBlocked();

      setToast("Usuario desbloqueado.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo desbloquear al usuario."),
      );
    }
  }

  async function createGroup(name: string, memberIds: string[]): Promise<void> {
    const title = name.trim();

    if (!title || memberIds.length === 0) {
      return;
    }

    setCreatingGroup(true);
    setError("");

    try {
      const response = await api.post(API_ROUTES.createGroup, {
        title,
        memberUserIds: memberIds,
      });

      const groupId = response.data?.data?.conversacion?.id;

      if (typeof groupId !== "string" || !groupId) {
        throw new Error("El servidor no devolvió el ID del grupo.");
      }

      setIsCreateGroupOpen(false);

      await loadConversations(true);

      selectConversation(groupId);

      setToast("Grupo creado correctamente.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo crear el grupo."));
    } finally {
      setCreatingGroup(false);
    }
  }

  async function addMembersToGroup(memberIds: string[]): Promise<void> {
    if (!selectedConversation || memberIds.length === 0) {
      return;
    }

    const conversationId = selectedConversation.id;

    setAddingMembers(true);
    setError("");

    try {
      for (const userId of memberIds) {
        const response = await api.post(
          API_ROUTES.addGroupMember(conversationId),
          {
            userId,
          },
        );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ??
              "No se pudo agregar una persona al grupo.",
          );
        }
      }

      await Promise.all([
        loadGroupDetail(conversationId),
        loadConversations(true),
      ]);

      setIsAddMembersOpen(false);

      setToast(
        memberIds.length === 1
          ? "Persona agregada correctamente al grupo."
          : `${memberIds.length} personas agregadas correctamente al grupo.`,
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron agregar las personas al grupo.",
        ),
      );
    } finally {
      setAddingMembers(false);
    }
  }

  function askDeleteSelectedGroup(): void {
    if (!selectedConversation || myGroupRole !== "owner") {
      return;
    }

    const conversationId = selectedConversation.id;

    const groupName = selectedConversation.titulo?.trim() || "este grupo";

    setConfirmAction({
      title: "Eliminar grupo",
      description:
        `Se eliminará “${groupName}” para todos los miembros. ` +
        "Esta acción no se puede deshacer.",

      confirmLabel: "Eliminar grupo",
      tone: "danger",

      onConfirm: async () => {
        await api.delete(API_ROUTES.deleteGroup(conversationId));

        setConversations((old) =>
          old.filter((conversation) => conversation.id !== conversationId),
        );

        setMessages([]);
        setGroupMembers([]);
        setMyGroupRole(null);

        setIsGroupInfoOpen(false);
        setIsChatInfoOpen(false);

        setSelectedConversationId(null);
        selectedConversationIdRef.current = null;

        navigate(chatBasePath);

        setToast("Grupo eliminado correctamente.");
      },
    });
  }

  async function loadGroupDetail(groupId: string): Promise<void> {
    setLoadingGroupMembers(true);

    try {
      const response = await api.get(API_ROUTES.groupMembers(groupId));

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ??
            "No se pudo cargar la información del grupo.",
        );
      }

      const data = response.data.data;

      const members: GroupMember[] = Array.isArray(data?.miembros)
        ? data.miembros
        : [];

      const role: unknown = data?.mi_rol;

      setGroupMembers(members);

      setMyGroupRole(
        role === "owner" || role === "admin" || role === "member" ? role : null,
      );
    } catch (requestError) {
      setGroupMembers([]);
      setMyGroupRole(null);

      setError(
        getErrorMessage(
          requestError,
          "No se pudo cargar la información del grupo.",
        ),
      );
    } finally {
      setLoadingGroupMembers(false);
    }
  }

  async function updateSelectedGroupMetadata(changes: {
    title?: string;
    avatarUrl?: string | null;
  }): Promise<void> {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    const payload: {
      title?: string;
      avatarUrl?: string | null;
    } = {};

    if (changes.title !== undefined) {
      const title = changes.title.trim();

      if (!title) {
        setError("El nombre del grupo no puede estar vacío.");

        return;
      }

      payload.title = title;
    }

    if (changes.avatarUrl !== undefined) {
      payload.avatarUrl =
        changes.avatarUrl === null ? null : changes.avatarUrl.trim();
    }

    if (payload.title === undefined && payload.avatarUrl === undefined) {
      return;
    }

    setSavingGroupMetadata(true);
    setError("");

    try {
      const response = await api.put(
        API_ROUTES.updateGroup(conversationId),
        payload,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ?? "No se pudo actualizar el grupo.",
        );
      }

      const updated = response.data.data?.conversacion;

      if (updated) {
        setConversations((old) =>
          old.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,

                  titulo: updated.titulo ?? conversation.titulo,

                  avatar_url: updated.avatar_url ?? null,

                  actualizado_en:
                    response.data.data?.modificado_en ??
                    conversation.actualizado_en,
                }
              : conversation,
          ),
        );
      }

      await loadConversations(true);

      setToast(
        response.data?.data?.modificado === false
          ? "El grupo ya estaba actualizado."
          : "Grupo actualizado correctamente.",
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo actualizar el grupo."),
      );
    } finally {
      setSavingGroupMetadata(false);
    }
  }

  async function removeMemberFromGroup(userId: string): Promise<void> {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    setError("");

    try {
      await api.delete(API_ROUTES.removeGroupMember(conversationId, userId));

      await Promise.all([
        loadGroupDetail(conversationId),
        loadConversations(true),
      ]);

      setToast("Persona eliminada correctamente del grupo.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo quitar a la persona del grupo.",
        ),
      );
    }
  }

  async function changeGroupMemberRole(
    userId: string,
    role: "ADMIN" | "MEMBER",
  ): Promise<void> {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    setError("");

    try {
      await api.put(API_ROUTES.updateGroupMemberRole(conversationId, userId), {
        role,
      });

      await Promise.all([
        loadGroupDetail(conversationId),
        loadConversations(true),
      ]);

      setToast(
        role === "ADMIN"
          ? "Miembro promovido a administrador."
          : "Administrador cambiado a miembro.",
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo cambiar el rol del miembro."),
      );
    }
  }

  async function transferGroupOwnership(userId: string): Promise<void> {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    setError("");

    try {
      await api.put(API_ROUTES.transferGroupOwner(conversationId), {
        userId,
      });

      await Promise.all([
        loadGroupDetail(conversationId),
        loadConversations(true),
      ]);

      setToast("Propiedad del grupo transferida correctamente.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo transferir la propiedad del grupo.",
        ),
      );
    }
  }

  async function leaveSelectedGroup(): Promise<void> {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    setError("");

    try {
      await api.delete(API_ROUTES.leaveGroup(conversationId));

      setIsGroupInfoOpen(false);
      setIsChatInfoOpen(false);

      setGroupMembers([]);
      setMyGroupRole(null);
      setMessages([]);

      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;

      await loadConversations(true);

      navigate(chatBasePath);

      setToast("Saliste del grupo.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo salir del grupo."));
    }
  }

  const unreadChats = conversations.reduce(
    (total, item) => total + Number(item.no_leidos ?? 0),
    0,
  );

  async function scheduleMessage(programadoPara: string): Promise<void> {
    if (!selectedConversationId) {
      throw new Error("Selecciona una conversación.");
    }

    const contenido = messageText.trim();

    if (!contenido) {
      throw new Error("Escribe un mensaje.");
    }

    await api.post("/chat/scheduled-messages", {
      conversacion_id: selectedConversationId,
      contenido,
      programado_para: programadoPara,
    });

    setToast("Mensaje programado correctamente.");
  }

  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();

    return messages.filter((message, index) => {
      const key = `${message.id}-${message.creado_en ?? index}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [messages]);

  return (
    <div
      className="vn-chat-page min-h-[calc(100vh-72px)] transition-colors duration-300 md:p-5"
      onClick={closeMenus}
    >
      <main className="vn-chat-shell mx-auto flex h-[calc(100vh-72px)] max-w-[1650px] overflow-hidden transition-colors duration-300 md:h-[calc(100vh-112px)] md:rounded-[32px]">
        <ChatSidebar
          activeTab={activeTab}
          unreadChats={unreadChats}
          requestCount={requests.length}
          currentUser={currentUser}
          onBack={() => navigate(-1)}
          onTabChange={changeTab}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeTab === "chats" && (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ConversationList
                conversations={filteredConversations}
                selectedConversationId={selectedConversationId}
                search={chatSearch}
                loading={loadingConversations}
                activeTab={activeTab}
                requestCount={requests.length}
                onTabChange={changeTab}
                onSearchChange={setChatSearch}
                onSelect={selectConversation}
                onCreateChat={() => changeTab("amigos")}
                onCreateGroup={() => setIsCreateGroupOpen(true)}
              />

              <section
                className={`${
                  selectedConversationId ? "flex" : "hidden lg:flex"
                } min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${theme.background}`}
              >
                {!selectedConversation ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-600 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/15 dark:text-violet-300">
                      <MessageCircle size={38} />
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                      Tus conversaciones, en un lugar
                    </h2>

                    <p className="mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                      Selecciona un chat para ver los mensajes o busca un amigo
                      para iniciar una nueva conversación.
                    </p>

                    <button
                      type="button"
                      onClick={() => changeTab("amigos")}
                      className="mt-6 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400"
                    >
                      Buscar amigos
                    </button>
                  </div>
                ) : (
                  <>
                    <ChatHeader
                      conversation={selectedConversation}
                      isPinned={selectedIsPinned}
                      typingLabel={
                        typingUserIds.length > 0
                          ? selectedConversation.tipo === "grupo"
                            ? typingUserIds.length === 1
                              ? "Alguien está escribiendo…"
                              : `${typingUserIds.length} personas están escribiendo…`
                            : "Escribiendo…"
                          : null
                      }
                      presenceOnline={
                        selectedConversation.presencia?.online ??
                        String(
                          selectedConversation.presencia?.status ??
                            selectedConversation.presencia?.estado ??
                            "",
                        ).toUpperCase() === "ONLINE"
                      }
                      lastSeenAt={
                        selectedConversation.presencia?.lastSeenAt ??
                        selectedConversation.presencia?.ultima_vez_en_linea ??
                        null
                      }
                      onBack={() => {
                        setSelectedConversationId(null);
                        navigate(chatBasePath);
                      }}
                      onOpenInfo={() => setIsChatInfoOpen(true)}
                      onOpenMenu={openConversationActions}
                    />

                    <div
                      ref={messageAreaRef}
                      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
                    >
                      <MessageList
                        messages={uniqueMessages}
                        currentUserId={currentUser?.id}
                        isGroup={selectedConversation.tipo === "grupo"}
                        loading={loadingMessages}
                        mineBubbleClass={theme.mineBubble}
                        editingMessageId={editingMessageId}
                        editingText={editingText}
                        onEditingTextChange={setEditingText}
                        onCancelEdit={() => {
                          setEditingMessageId(null);
                          setEditingText("");
                        }}
                        onSaveEdit={saveEdit}
                        onOpenActions={openMessageActions}
                        onNearEndChange={setNearEnd}
                        showJump={!nearEnd}
                        onJumpToBottom={() => {
                          setNearEnd(true);

                          messageAreaRef.current?.scrollTo({
                            top: messageAreaRef.current.scrollHeight,
                            behavior: "smooth",
                          });
                        }}
                      />
                    </div>

                    <ChatComposer
                      value={messageText}
                      replyTo={replyTo}
                      sending={sendingMessage}
                      sendClass={theme.sendButton}
                      onChange={handleMessageTextChange}
                      onCancelReply={() => setReplyTo(null)}
                      onSubmit={sendMessage}
                      onSchedule={scheduleMessage}
                    />
                  </>
                )}
              </section>
            </div>
          )}

          {activeTab === "amigos" && (
            <FriendsPanel
              friends={friends}
              search={peopleSearch}
              results={searchUsers}
              loading={loadingFriends}
              onSearch={searchPeople}
              onAdd={sendFriendRequest}
              onChat={createOrOpenPrivateChat}
              onRemove={removeFriendship}
            />
          )}

          {activeTab === "solicitudes" && (
            <RequestsPanel
              requests={requests}
              sentRequests={sentRequests}
              loading={loadingRequests}
              onAccept={acceptRequest}
              onReject={rejectRequest}
            />
          )}

          {activeTab === "bloqueados" && (
            <BlockedPanel
              users={blockedUsers}
              loading={loadingBlocked}
              onUnblock={unblockUser}
            />
          )}
        </section>
      </main>

      <MessageActionsMenu
        menu={messageMenu}
        mine={messageMenu?.message.emisor_id === currentUser?.id}
        onClose={() => setMessageMenu(null)}
        onCopy={(message) => void copyMessage(message)}
        onShare={(message) => void shareMessage(message)}
        onReply={(message) => setReplyTo(message)}
        onForward={(message) =>
          futureAction(
            "Reenviar mensaje",
            `El mensaje “${message.contenido.slice(
              0,
              80,
            )}” está listo para conectar con POST /chat/messages/${
              message.id
            }/forward.`,
          )
        }
        onFavorite={(message) => {
          setMessages((old) =>
            old.map((item) =>
              item.id === message.id
                ? {
                    ...item,
                    favorito: !item.favorito,
                  }
                : item,
            ),
          );

          setToast("Favorito actualizado localmente.");
        }}
        onInfo={(message) =>
          futureAction(
            "Información del mensaje",
            `Enviado por ${message.emisor_nombre} el ${
              message.creado_en
            }. Estado de lectura: ${message.leido ? "leído" : "enviado"}.`,
          )
        }
        onEdit={(message) => {
          setEditingMessageId(message.id);
          setEditingText(message.contenido);
        }}
        onDeleteMine={(message) => askDelete(message, false)}
        onDeleteAll={(message) => askDelete(message, true)}
        onReport={() =>
          futureAction(
            "Reportar mensaje",
            "Crea POST /chat/messages/{id}/report para guardar y revisar los reportes.",
          )
        }
      />

      <ScheduledMessagesModal
        open={isScheduledMessagesOpen}
        conversationId={selectedConversationId}
        onClose={() => setIsScheduledMessagesOpen(false)}
        onToast={setToast}
        onError={setError}
      />

      <ConversationActionsMenu
        menu={conversationMenu}
        isMuted={selectedIsMuted}
        isPinned={selectedIsPinned}
        onClose={() => setConversationMenu(null)}
        onInfo={() => setIsChatInfoOpen(true)}
        onPin={togglePin}
        onMute={toggleMute}
        onTheme={() => setIsThemeModalOpen(true)}
        onScheduledMessages={() => setIsScheduledMessagesOpen(true)}
        onTemporary={() => setIsTemporaryMessagesModalOpen(true)}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onArchive={() => {
          updateSelectedConversation({
            isArchived: true,
          });

          setSelectedConversationId(null);
          navigate(chatBasePath);

          setToast(
            "Archivada localmente; conecta PUT /chat/conversations/{id}/archive para persistir.",
          );
        }}
        onBlock={() =>
          futureAction(
            "Bloquear usuario",
            "Crea POST /chat/conversations/{id}/block y valida que no se pueda iniciar un chat privado con usuarios bloqueados.",
          )
        }
        onReport={() =>
          futureAction(
            "Reportar usuario",
            "Crea el controlador PHP de reportes de usuario antes de activar esta acción.",
          )
        }
        onDeleteLocal={() =>
          futureAction(
            "Eliminar conversación de mi vista",
            "Crea DELETE /chat/conversations/{id}/local para ocultarla sin borrar mensajes del otro usuario.",
          )
        }
        onLeaveGroup={() => {
          void leaveSelectedGroup();
        }}
      />

      <ChatInfoDrawer
        open={isChatInfoOpen}
        conversation={selectedConversation}
        muted={selectedIsMuted}
        temporaryDuration={temporaryMessagesDuration}
        onClose={() => setIsChatInfoOpen(false)}
        onMute={toggleMute}
        onTheme={() => setIsThemeModalOpen(true)}
        onTemporary={() => setIsTemporaryMessagesModalOpen(true)}
        onOpenGroupInfo={() => {
          if (!selectedConversation) return;

          setIsChatInfoOpen(false);
          void loadGroupDetail(selectedConversation.id);
          setIsGroupInfoOpen(true);
        }}
      />

      <GroupInfoDrawer
        open={isGroupInfoOpen}
        conversation={selectedConversation}
        members={groupMembers}
        loading={loadingGroupMembers}
        myRole={myGroupRole}
        onClose={() => setIsGroupInfoOpen(false)}
        onAddMember={() => {
          setIsGroupInfoOpen(false);
          setIsAddMembersOpen(true);
        }}
        onRemoveMember={(userId) => {
          void removeMemberFromGroup(userId);
        }}
        onPromoteMember={(userId) => {
          void changeGroupMemberRole(userId, "ADMIN");
        }}
        onDemoteMember={(userId) => {
          void changeGroupMemberRole(userId, "MEMBER");
        }}
        onTransferOwnership={(userId) => {
          void transferGroupOwnership(userId);
        }}
        onLeaveGroup={() => {
          void leaveSelectedGroup();
        }}
        savingMetadata={savingGroupMetadata}

        onUpdateMetadata={(changes) => {
          void updateSelectedGroupMetadata(changes);
        }}

        onDeleteGroup={askDeleteSelectedGroup}
      />

      <CreateGroupModal
        open={isCreateGroupOpen}
        friends={friends}
        creating={creatingGroup}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={createGroup}
      />

      <AddGroupMembersModal
        open={isAddMembersOpen}
        friends={friends}
        existingMemberIds={groupMembers.map((member) => member.usuario.id)}
        saving={addingMembers}
        onClose={() => setIsAddMembersOpen(false)}
        onAdd={addMembersToGroup}
      />

      <ChatThemeModal
        open={isThemeModalOpen}
        value={chatTheme}
        onClose={() => setIsThemeModalOpen(false)}
        onChange={selectTheme}
      />

      <TemporaryMessagesModal
        open={isTemporaryMessagesModalOpen}
        value={temporaryMessagesDuration}
        onClose={() => setIsTemporaryMessagesModalOpen(false)}
        onChange={selectTemporary}
      />

      <ConfirmActionModal
        action={confirmAction}
        busy={confirmBusy}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmAction(null);
          }
        }}
      />

      {(error || toast) && (
        <div
          className={`fixed bottom-5 right-5 z-[10100] flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl ${
            error
              ? "border-red-500/30 bg-slate-900 text-red-100"
              : "border-emerald-500/30 bg-slate-900 text-emerald-100"
          }`}
        >
          <span className="flex-1">{error || toast}</span>

          <button
            type="button"
            onClick={() => {
              setError("");
              setToast("");
            }}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function FriendsPanel({
  friends,
  search,
  results,
  loading,
  onSearch,
  onAdd,
  onChat,
  onRemove,
}: {
  friends: Friend[];
  search: string;
  results: SearchUser[];
  loading: boolean;
  onSearch: (value: string) => Promise<void>;
  onAdd: (id: string) => Promise<void>;
  onChat: (id: string) => Promise<void>;
  onRemove: (friendshipId: string) => Promise<void>;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="vn-chat-divider border-b bg-white/70 px-5 py-6 backdrop-blur-xl dark:bg-slate-950/25 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
          Comunidad
        </p>

        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Amigos
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Busca personas, envía solicitudes e inicia conversaciones.
        </p>

        <input
          value={search}
          onChange={(event) => void onSearch(event.target.value)}
          placeholder="Buscar por nombre, usuario o correo completo..."
          className="vn-chat-input mt-5 w-full max-w-2xl rounded-2xl px-4 py-3 text-sm transition"
        />
      </header>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {search.trim().length >= 2 && (
          <div className="mb-8 grid gap-3 lg:grid-cols-2">
            {results.map((user) => (
              <article
                key={user.id}
                className="vn-chat-card flex items-center gap-3 rounded-2xl p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 font-bold text-violet-300">
                  {user.nombre.slice(0, 1)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                    {user.nombre}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user.username
                      ? `@${user.username}`
                      : "Sin nombre de usuario"}
                  </p>
                </div>

                {user.amistad_estado === "NONE" ? (
                  <button
                    type="button"
                    onClick={() => void onAdd(user.id)}
                    className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white"
                  >
                    Agregar
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    {user.amistad_estado === "PENDING_SENT"
                      ? "Solicitud enviada"
                      : user.amistad_estado === "PENDING_RECEIVED"
                        ? "Solicitud recibida"
                        : "Ya son amigos"}
                  </span>
                )}
              </article>
            ))}
          </div>
        )}

        <h2 className="mb-4 text-sm font-bold text-white">
          Tu lista de amigos
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando amigos...</p>
        ) : friends.length === 0 ? (
          <p className="vn-chat-empty rounded-3xl p-10 text-center">
            Tu lista está vacía.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {friends.map((friend) => (
              <article
                key={friend.amistad_id}
                className="vn-chat-card rounded-3xl p-5"
              >
                <p className="font-bold text-slate-950 dark:text-white">
                  {friend.nombre}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {friend.username
                    ? `@${friend.username}`
                    : "Sin nombre de usuario"}
                </p>

                <button
                  type="button"
                  onClick={() => void onChat(friend.usuario_id)}
                  className="mt-5 w-full rounded-xl bg-violet-500/15 px-4 py-2.5 text-sm font-bold text-violet-300 hover:bg-violet-500 hover:text-white"
                >
                  Abrir chat
                </button>

                <button
                  type="button"
                  onClick={() => void onRemove(friend.amistad_id)}
                  className="mt-2 w-full rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/10"
                >
                  Eliminar amigo
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RequestsPanel({
  requests,
  sentRequests,
  loading,
  onAccept,
  onReject,
}: {
  requests: FriendRequest[];
  sentRequests: FriendRequest[];
  loading: boolean;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="vn-chat-divider border-b bg-white/70 px-5 py-6 backdrop-blur-xl dark:bg-slate-950/25 sm:px-8">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Solicitudes de amistad
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Revisa las solicitudes que recibiste y las que todavía están
          pendientes.
        </p>
      </header>

      <div className="flex-1 space-y-10 overflow-y-auto p-5 sm:p-8">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Recibidas</h2>

            {requests.length > 0 && (
              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                {requests.length}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-slate-500">Cargando solicitudes...</p>
          ) : requests.length === 0 ? (
            <p className="vn-chat-empty rounded-3xl p-8 text-center">
              No tienes solicitudes recibidas pendientes.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {requests.map((request) => (
                <article
                  key={request.amistad_id}
                  className="vn-chat-card rounded-3xl p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 font-bold text-violet-300">
                      {request.nombre.slice(0, 1)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950 dark:text-white">
                        {request.nombre}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {request.username
                          ? `@${request.username}`
                          : "Sin nombre de usuario"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => void onAccept(request.amistad_id)}
                      className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400"
                    >
                      Aceptar
                    </button>

                    <button
                      type="button"
                      onClick={() => void onReject(request.amistad_id)}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Enviadas</h2>

            {sentRequests.length > 0 && (
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-300">
                {sentRequests.length}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-slate-500">Cargando solicitudes...</p>
          ) : sentRequests.length === 0 ? (
            <p className="vn-chat-empty rounded-3xl p-8 text-center">
              No tienes solicitudes enviadas pendientes.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {sentRequests.map((request) => (
                <article
                  key={request.amistad_id}
                  className="vn-chat-card rounded-3xl p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 font-bold text-slate-300">
                      {request.nombre.slice(0, 1)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950 dark:text-white">
                        {request.nombre}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {request.username
                          ? `@${request.username}`
                          : "Sin nombre de usuario"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-300">
                      Pendiente
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function BlockedPanel({
  users,
  loading,
  onUnblock,
}: {
  users: BlockedUser[];
  loading: boolean;
  onUnblock: (id: string) => Promise<void>;
}) {
  return (
    <section className="flex-1 overflow-y-auto p-5 sm:p-8">
      <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        Usuarios bloqueados
      </h1>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Estas personas no pueden iniciar conversaciones contigo.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-slate-500">Cargando usuarios bloqueados...</p>
        ) : users.length === 0 ? (
          <p className="vn-chat-empty rounded-3xl p-10 text-center">
            No tienes usuarios bloqueados.
          </p>
        ) : (
          users.map((user) => (
            <article
              key={user.amistad_id}
              className="vn-chat-card rounded-3xl p-5"
            >
              <p className="font-bold text-slate-950 dark:text-white">
                {user.nombre}
              </p>

              <p className="text-xs text-slate-500">{user.correo}</p>

              <button
                type="button"
                onClick={() => void onUnblock(user.usuario_id)}
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Desbloquear
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
