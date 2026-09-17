import {
  Check,
  Clock3,
  MessageCircle,
  Search,
  ShieldOff,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { ReportUserModal } from "../features/messaging/components/ReportUserModal";
import { ConversationList } from "../features/messaging/components/ConversationList";
import { CreateGroupModal } from "../features/messaging/components/CreateGroupModal";
import { GroupInfoDrawer } from "../features/messaging/components/GroupInfoDrawer";
import { MessageActionsMenu } from "../features/messaging/components/MessageActionsMenu";
import { MessageList } from "../features/messaging/components/MessageList";
import { TemporaryMessagesModal } from "../features/messaging/components/TemporaryMessagesModal";
import { AddGroupMembersModal } from "../features/messaging/components/AddGroupMembersModal";
import { ShareMessageModal } from "../features/messaging/components/ShareMessageModal";
import { ForwardMessageModal } from "../features/messaging/components/ForwardMessageModal";
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
  getCurrentUser,
  getErrorMessage,
  getFixedMenuPosition,
  getTheme,
} from "../features/messaging/utils";
import { ScheduledMessagesModal } from "../features/messaging/components/ScheduledMessagesModal";
import { SearchMessagesModal } from "../features/messaging/components/SearchMessagesModal";
import { Avatar } from "../features/messaging/components/Avatar";

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversacionId } = useParams();
  const currentUser = getCurrentUser();

  const selectedConversationIdRef = useRef<string | null>(null);

  const chatBasePath = location.pathname.startsWith("/superadmin/")
    ? "/superadmin/chat"
    : "/admin/chat";

  const [activeTab, setActiveTab] = useState<ChatTab>(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");

    if (
      requestedTab === "amigos" ||
      requestedTab === "solicitudes" ||
      requestedTab === "bloqueados"
    ) {
      return requestedTab;
    }

    return "chats";
  });

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversacionId ?? null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(
    null,
  );
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);

  const [chatSearch, setChatSearch] = useState("");
  const [showArchivedConversations, setShowArchivedConversations] =
    useState(false);
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

  const [shareMessageTarget, setShareMessageTarget] = useState<Message | null>(
    null,
  );

  const [sharingMessage, setSharingMessage] = useState(false);

  const [forwardMessageTarget, setForwardMessageTarget] =
    useState<Message | null>(null);

  const [forwardingMessage, setForwardingMessage] = useState(false);

  const [conversationMenu, setConversationMenu] =
    useState<ConversationMenuState | null>(null);

  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isReportUserModalOpen, setIsReportUserModalOpen] = useState(false);
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
  const [isSearchMessagesOpen, setIsSearchMessagesOpen] = useState(false);

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
    setTemporaryMessagesDuration(
      selectedConversation?.temporaryMessagesDuration ?? "off",
    );
  }, [
    selectedConversation?.id,
    selectedConversation?.temporaryMessagesDuration,
  ]);

  useEffect(() => {
    selectedConversationTypeRef.current = selectedConversation?.tipo ?? null;

    setTypingUserIds([]);
  }, [selectedConversation?.id, selectedConversation?.tipo]);
  const filteredConversations = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    return conversations.filter((item) => {
      if (Boolean(item.isArchived) !== showArchivedConversations) {
        return false;
      }

      if (!query) {
        return true;
      }

      const title =
        item.tipo === "grupo"
          ? (item.titulo ?? "")
          : (item.otro_usuario_nombre ?? "");

      return `${title} ${item.ultimo_mensaje ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [chatSearch, conversations, showArchivedConversations]);

  const archivedConversationsCount = useMemo(
    () =>
      conversations.filter((conversation) => Boolean(conversation.isArchived))
        .length,
    [conversations],
  );
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

              /*
               * Archivar todavía se mantiene local
               * hasta agregar la vista de archivados.
               */
              isArchived: incoming.isArchived ?? false,

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

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

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
      /*
       * La petición puede terminar después de que
       * el usuario haya cambiado/cerrado el chat.
       *
       * En ese caso el error pertenece a una
       * selección antigua y no debe mostrarse.
       */
      if (selectedConversationIdRef.current === id) {
        setError(
          getErrorMessage(requestError, "No se pudieron cargar los mensajes."),
        );
      }
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
          console.info("[REALTIME] join response", {
            conversationId,
            response,
          });

          if (
            disposed ||
            response.ok ||
            selectedConversationIdRef.current !== conversationId
          ) {
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
          console.info("[REALTIME] conectado", {
            socketId: socket?.id,
            conversationId: selectedConversationIdRef.current,
          });

          joinSelectedConversation();
        });

        socket.on("chat:message:new", (event) => {
          console.info("[REALTIME] chat:message:new", {
            eventConversationId: event.conversationId,
            selectedConversationId: selectedConversationIdRef.current,
            messageId: event.message.id,
          });

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

        /*
         * Respaldo realtime por room privado del usuario.
         *
         * chat:message:new sigue siendo la vía principal.
         * notification:new garantiza que, aunque el cliente
         * todavía no haya entrado al room de conversación,
         * podamos sincronizar inmediatamente el chat.
         */
        socket.on("friendship:request:cancelled", (event) => {
          /*
           * Quitamos la tarjeta inmediatamente para que
           * la UI del receptor responda sin esperar otra
           * consulta de red.
           */
          setRequests((current) =>
            current.filter(
              (request) => request.amistad_id !== event.friendshipId,
            ),
          );

          /*
           * Después sincronizamos contra el backend,
           * que sigue siendo la fuente de verdad.
           */
          void loadRequests();
        });

        socket.on("notification:new", (event) => {
          if (event.notificationType !== "chat_message") {
            return;
          }

          const rawConversationId =
            event.data.conversationId ?? event.data.conversacion_id;

          if (typeof rawConversationId !== "string") {
            return;
          }

          const conversationId = rawConversationId.trim();

          if (!conversationId) {
            return;
          }

          console.log("[REALTIME] CHAT NOTIFICATION", {
            conversationId,
            selectedConversationId: selectedConversationIdRef.current,
          });

          void loadConversations(true);

          if (conversationId === selectedConversationIdRef.current) {
            void loadMessages(conversationId, true);

            void markConversationRead(conversationId);
          }
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
                setError(
                  "La sesión realtime expiró y no pudo renovarse.",
                );
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
    if (
      loadingConversations ||
      !selectedConversationId ||
      selectedConversation
    ) {
      return;
    }

    setSelectedConversationId(null);
    selectedConversationIdRef.current = null;

    navigate(chatBasePath, {
      replace: true,
    });
  }, [
    chatBasePath,
    loadingConversations,
    navigate,
    selectedConversation,
    selectedConversationId,
  ]);

  useEffect(() => {
    const id = conversacionId ?? null;

    if (id !== selectedConversationId) {
      setSelectedConversationId(id);
    }
  }, [conversacionId, selectedConversationId]);

  /*
   * El socket puede haberse conectado antes de que
   * el usuario seleccione una conversación.
   *
   * Por eso debemos entrar al room también cada vez
   * que cambia la conversación seleccionada.
   */
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;

    if (!selectedConversationId) {
      return;
    }

    const socket = chatSocketRef.current;

    if (!socket?.connected) {
      return;
    }

    const conversationId = selectedConversationId;

    console.info("[REALTIME] solicitando join", {
      socketId: socket.id,
      conversationId,
    });

    socket.emit(
      "chat:conversation:join",
      {
        conversationId,
      },
      (response) => {
        console.info("[REALTIME] join response", {
          conversationId,
          response,
        });

        if (
          response.ok ||
          selectedConversationIdRef.current !== conversationId
        ) {
          return;
        }

        setError(response.error.message);
      },
    );
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    void loadMessages(selectedConversationId);

    void markConversationRead(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    setChatTheme(selectedConversation.chatTheme ?? "violet");

    setTemporaryMessagesDuration(
      selectedConversation.temporaryMessagesDuration ?? "off",
    );
  }, [
    selectedConversation?.id,
    selectedConversation?.chatTheme,
    selectedConversation?.temporaryMessagesDuration,
  ]);

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

  /* NOTIFICATION_DEEP_LINK_TABS */
  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");

    if (requestedTab === "solicitudes") {
      setActiveTab("solicitudes");
      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;
      void Promise.all([loadRequests(), loadSentRequests()]);
      return;
    }

    if (requestedTab === "amigos") {
      setActiveTab("amigos");
      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;
      void loadFriends();
      return;
    }

    if (requestedTab === "bloqueados") {
      setActiveTab("bloqueados");
      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;
      void loadBlocked();
    }
  }, [location.search]);

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
          replyToMessageId: replyTo?.id ?? undefined,
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
  async function sendImage(file: File): Promise<void> {
    if (!selectedConversationId || sendingMessage) {
      return;
    }

    const contenido = messageText.trim();

    setSendingMessage(true);
    setError("");

    try {
      const clientMessageId = crypto.randomUUID();

      const formData = new FormData();

      formData.append("clientMessageId", clientMessageId);

      if (contenido) {
        formData.append("content", contenido);
      }

      if (replyTo?.id) {
        formData.append("replyToMessageId", replyTo.id);
      }

      formData.append("image", file);

      const response = await api.post(
        `/chat/conversations/${selectedConversationId}/images`,
        formData,
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
        await loadMessages(selectedConversationId, true);
      }

      stopLocalTyping();

      setMessageText("");
      setReplyTo(null);

      await loadConversations(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo enviar la imagen."));

      throw requestError;
    } finally {
      setSendingMessage(false);
    }
  }
  async function sendAudio(audio: Blob, durationMs: number): Promise<void> {
    if (!selectedConversationId || sendingMessage) {
      return;
    }

    const contenido = messageText.trim();

    setSendingMessage(true);
    setError("");

    try {
      const clientMessageId = crypto.randomUUID();

      const formData = new FormData();

      formData.append("clientMessageId", clientMessageId);

      formData.append(
        "durationMs",
        String(Math.max(1, Math.round(durationMs))),
      );

      if (contenido) {
        formData.append("content", contenido);
      }

      if (replyTo?.id) {
        formData.append("replyToMessageId", replyTo.id);
      }

      const mimeType = audio.type || "audio/webm";

      const extension = mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("wav")
            ? "wav"
            : mimeType.includes("mpeg")
              ? "mp3"
              : "webm";

      formData.append("audio", audio, `nota-de-voz.${extension}`);

      const response = await api.post(
        `/chat/conversations/${selectedConversationId}/audio`,
        formData,
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
        await loadMessages(selectedConversationId, true);
      }

      stopLocalTyping();

      setMessageText("");
      setReplyTo(null);

      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo enviar la nota de voz."),
      );

      throw requestError;
    } finally {
      setSendingMessage(false);
    }
  }
  async function saveEdit(messageId: string): Promise<void> {
    const contenido = editingText.trim();

    if (!contenido) return;

    try {
      await api.put(API_ROUTES.updateMessage(messageId), {
        content: contenido,
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

  async function toggleMessageFavorite(message: Message): Promise<void> {
    const favorite = !Boolean(message.favorito);

    try {
      setError("");

      await api.put(API_ROUTES.favoriteMessage(message.id), {
        favorite,
      });

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                favorito: favorite,
              }
            : item,
        ),
      );

      setToast(
        favorite
          ? "Mensaje guardado en favoritos."
          : "Mensaje quitado de favoritos.",
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo actualizar el favorito."),
      );
    }
  }
  function askDelete(message: Message, everyone: boolean): void {
    setConfirmAction({
      title: everyone
        ? "¿Eliminar para todos?"
        : "¿Eliminar para ti?",

      description: everyone
        ? "El mensaje dejará de estar disponible para todos los participantes."
        : "El mensaje desaparecerá solamente de tu vista.",

      confirmLabel: "Eliminar mensaje",
      tone: "danger",

      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          setError("");

          if (everyone) {
            await api.delete(API_ROUTES.deleteMessage(message.id));
          } else {
            await api.delete(API_ROUTES.deleteMessageForMe(message.id));
          }

          setMessages((current) =>
            everyone
              ? current.map((item) =>
                  item.id === message.id
                    ? {
                        ...item,
                        eliminado: 1,
                        contenido: "",
                      }
                    : item,
                )
              : current.filter((item) => item.id !== message.id),
          );

          if (replyTo?.id === message.id) {
            setReplyTo(null);
          }

          setConfirmAction(null);

          setToast(
            everyone
              ? "Mensaje eliminado para todos."
              : "Mensaje eliminado para ti.",
          );
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
    setError("");
    setShareMessageTarget(message);

    /*
     * Compartir trabaja con la lista real de amigos.
     * Abrimos el modal de inmediato y refrescamos
     * los datos en paralelo.
     */
    await loadFriends();
  }
  async function forwardMessage(message: Message): Promise<void> {
    setError("");
    setForwardMessageTarget(message);

    await loadFriends();
  }

  async function forwardMessageToTarget(
    message: Message,
    friendId: string | null,
    conversationId: string | null,
  ): Promise<void> {
    if (forwardingMessage || (!friendId && !conversationId)) {
      return;
    }

    setForwardingMessage(true);
    setError("");

    try {
      let destinationConversationId = conversationId;

      if (friendId) {
        const response = await api.post(API_ROUTES.createDirectChat, {
          userId: friendId,
        });

        const payload = response.data?.data ?? response.data;

        const resolvedConversationId =
          payload?.conversacion?.id ?? payload?.conversation?.id ?? payload?.id;

        if (typeof resolvedConversationId !== "string") {
          throw new Error("No se pudo resolver la conversación directa.");
        }

        destinationConversationId = resolvedConversationId;
      }

      if (!destinationConversationId) {
        throw new Error("No se seleccionó un destino.");
      }

      await api.post(API_ROUTES.forwardMessage(message.id), {
        conversationId: destinationConversationId,
        clientMessageId: crypto.randomUUID(),
      });

      setForwardMessageTarget(null);

      setToast("Mensaje reenviado correctamente.");

      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo reenviar el mensaje."),
      );
    } finally {
      setForwardingMessage(false);
    }
  }

  async function shareMessageToTargets(
    message: Message,
    friendIds: string[],
    groupConversationIds: string[],
  ): Promise<void> {
    if (
      sharingMessage ||
      (friendIds.length === 0 && groupConversationIds.length === 0)
    ) {
      return;
    }

    setSharingMessage(true);
    setError("");

    try {
      /*
       * Set evita reenviar dos veces a la misma
       * conversación si algún destino se repite.
       */
      const destinationConversationIds = new Set<string>(groupConversationIds);

      /*
       * Para cada amigo obtenemos o creamos su
       * conversación directa usando el endpoint
       * idempotente del backend.
       */
      for (const friendId of friendIds) {
        const response = await api.post(API_ROUTES.createDirectChat, {
          userId: friendId,
        });

        const payload = response.data?.data ?? response.data;

        const conversationId = String(payload?.conversacion?.id ?? "");

        if (!conversationId) {
          throw new Error(
            "El servidor no devolvió la conversación de uno de los amigos.",
          );
        }

        destinationConversationIds.add(conversationId);
      }

      /*
       * Cada destino utiliza un clientMessageId
       * distinto. Así cada forward mantiene su
       * propia idempotencia en el backend.
       */
      await Promise.all(
        Array.from(destinationConversationIds).map((conversationId) =>
          api.post(API_ROUTES.shareMessage(message.id), {
            conversationId,
            clientMessageId: crypto.randomUUID(),
          }),
        ),
      );

      const total = destinationConversationIds.size;

      setShareMessageTarget(null);

      setToast(
        total === 1
          ? "Mensaje compartido correctamente."
          : `Mensaje compartido en ${total} conversaciones.`,
      );

      /*
       * Refrescamos sidebar porque pueden haberse
       * creado conversaciones directas nuevas y
       * cambiaron las últimas actividades.
       */
      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo compartir el mensaje."),
      );
    } finally {
      setSharingMessage(false);
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

  async function toggleArchive(): Promise<void> {
    if (!selectedConversationId || !selectedConversation) {
      return;
    }

    const conversationId = selectedConversationId;

    const archived = !Boolean(selectedConversation.isArchived);

    try {
      setError("");

      await api.put(API_ROUTES.updateConversationSettings(conversationId), {
        archived,
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                isArchived: archived,
              }
            : conversation,
        ),
      );

      setConversationMenu(null);

      if (archived) {
        stopLocalTyping();

        setSelectedConversationId(null);

        selectedConversationIdRef.current = null;

        setMessages([]);

        navigate(chatBasePath);

        setToast("Conversación archivada.");
      } else {
        setShowArchivedConversations(false);

        setToast("Conversación desarchivada.");
      }

      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          archived
            ? "No se pudo archivar la conversación."
            : "No se pudo desarchivar la conversación.",
        ),
      );
    }
  }
  async function togglePin(): Promise<void> {
    if (!selectedConversationId) {
      return;
    }

    const conversationId = selectedConversationId;

    const pinned = !selectedIsPinned;

    try {
      setError("");

      await api.put(API_ROUTES.updateConversationSettings(conversationId), {
        pinned,
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                isPinned: pinned,
              }
            : conversation,
        ),
      );

      /*
       * El backend ordena las conversaciones
       * fijadas por encima de las demás.
       */
      await loadConversations(true);

      setConversationMenu(null);

      setToast(
        pinned
          ? "Conversación fijada arriba."
          : "Conversación quitada de fijados.",
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo actualizar la conversación fijada.",
        ),
      );
    }
  }

  async function toggleMute(): Promise<void> {
    if (!selectedConversationId) {
      return;
    }

    const conversationId = selectedConversationId;

    const muted = !selectedIsMuted;

    try {
      setError("");

      await api.put(API_ROUTES.updateConversationSettings(conversationId), {
        muted,
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                isMuted: muted,
              }
            : conversation,
        ),
      );

      setConversationMenu(null);

      setToast(muted ? "Chat silenciado." : "Notificaciones activadas.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo cambiar el estado de las notificaciones.",
        ),
      );
    }
  }

  async function selectTheme(id: ChatThemeId): Promise<void> {
    if (!selectedConversationId) {
      return;
    }

    const conversationId = selectedConversationId;

    try {
      setError("");

      await api.put(API_ROUTES.updateConversationSettings(conversationId), {
        theme: id,
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                chatTheme: id,
              }
            : conversation,
        ),
      );

      setChatTheme(id);

      setIsThemeModalOpen(false);

      setConversationMenu(null);

      setToast("Tema guardado para esta conversación.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo guardar el tema del chat."),
      );
    }
  }
  async function selectTemporary(value: TemporaryDuration): Promise<void> {
    if (!selectedConversationId) {
      return;
    }

    let durationSeconds: number;

    switch (value) {
      case "24h":
        durationSeconds = 86_400;
        break;

      case "7d":
        durationSeconds = 604_800;
        break;

      case "30d":
        durationSeconds = 2_592_000;
        break;

      case "off":
      default:
        durationSeconds = 0;
        break;
    }

    try {
      setError("");

      await api.put(API_ROUTES.temporaryMessages(selectedConversationId), {
        durationSeconds,
      });

      updateSelectedConversation({
        temporaryMessagesDuration: value,
      });

      setTemporaryMessagesDuration(value);
      setIsTemporaryMessagesModalOpen(false);

      setToast(
        value === "off"
          ? "Mensajes temporales desactivados."
          : `Mensajes temporales activados: ${value}.`,
      );

      /*
       * Recargamos desde el servidor para que el backend
       * sea la fuente de verdad.
       */
      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo actualizar la duración de los mensajes temporales.",
        ),
      );
    }
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

  async function cancelRequest(friendshipId: string): Promise<void> {
    if (cancelingRequestId !== null) {
      return;
    }

    try {
      setCancelingRequestId(friendshipId);
      setError("");

      await api.delete(API_ROUTES.cancelRequest(friendshipId));

      /*
       * Quitamos inmediatamente la tarjeta
       * antes de completar los refresh secundarios.
       */
      setSentRequests((current) =>
        current.filter((request) => request.amistad_id !== friendshipId),
      );

      await Promise.all([loadSentRequests(), loadRequests()]);

      if (peopleSearch.trim().length >= 2) {
        await searchPeople(peopleSearch);
      }

      setToast("Solicitud cancelada.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo cancelar la solicitud."),
      );

      /*
       * Si falló, recuperamos la lista canónica
       * desde el backend.
       */
      await loadSentRequests();
    } finally {
      setCancelingRequestId(null);
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

  async function blockConversationUser(): Promise<void> {
    const targetUserId = selectedConversation?.otro_usuario_id;

    if (
      !selectedConversation ||
      selectedConversation.tipo === "grupo" ||
      !targetUserId
    ) {
      setError("No se pudo identificar al usuario que quieres bloquear.");
      return;
    }

    try {
      setError("");

      await api.post(API_ROUTES.blockUser, {
        userId: targetUserId,
      });

      stopLocalTyping();

      setConversationMenu(null);

      /*
       * Quitamos primero el ID de la URL.
       *
       * Así el efecto que sincroniza conversacionId
       * no puede volver a seleccionar el chat que
       * acabamos de bloquear.
       */
      navigate(chatBasePath, {
        replace: true,
      });

      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;
      setMessages([]);

      await Promise.all([loadConversations(), loadFriends(), loadBlocked()]);

      setToast("Usuario bloqueado.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "No se pudo bloquear al usuario."),
      );
    }
  }

  async function unblockUser(id: string): Promise<void> {
    try {
      await api.delete(API_ROUTES.unblockUser(id));

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
      className="vn-chat-page min-h-0 transition-colors duration-300"
      onClick={closeMenus}
    >
      <main className="vn-chat-shell mx-auto flex h-[calc(100dvh-150px)] min-h-[480px] max-w-[1650px] flex-col overflow-hidden rounded-[28px] transition-colors duration-300">
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
                selectedConversationId={selectedConversation?.id ?? null}
                search={chatSearch}
                loading={loadingConversations}
                activeTab={activeTab}
                requestCount={requests.length}
                archivedCount={archivedConversationsCount}
                showArchived={showArchivedConversations}
                onTabChange={changeTab}
                onSearchChange={setChatSearch}
                onSelect={selectConversation}
                onCreateChat={() => changeTab("amigos")}
                onCreateGroup={() => {
                  void loadFriends().then(() => {
                    setIsCreateGroupOpen(true);
                  });
                }}
                onToggleArchived={() => {
                  setChatSearch("");

                  setSelectedConversationId(null);
                  selectedConversationIdRef.current = null;

                  setMessages([]);

                  setShowArchivedConversations((current) => !current);

                  navigate(chatBasePath);
                }}
              />

              <section
                className={`${
                  selectedConversation ? "flex" : "hidden lg:flex"
                } min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#0b1220]`}
              >
                {!selectedConversation ? (
                  <div className="vn-message-surface flex flex-1 items-center justify-center px-6 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                      <MessageCircle size={38} />
                    </div>

                    <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      Elige una conversación
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Selecciona un chat para ver los mensajes o busca un amigo
                      para iniciar una nueva conversación.
                    </p>

                    <button
                      type="button"
                      onClick={() => changeTab("amigos")}
                      className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-500"
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
                      onSendImage={sendImage}
                      onSendAudio={sendAudio}
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
              cancelingRequestId={cancelingRequestId}
              onAccept={acceptRequest}
              onReject={rejectRequest}
              onCancel={cancelRequest}
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
      </main>{" "}
      <ForwardMessageModal
        message={forwardMessageTarget}
        friends={friends}
        conversations={conversations}
        loadingFriends={loadingFriends}
        busy={forwardingMessage}
        onClose={() => {
          if (!forwardingMessage) {
            setForwardMessageTarget(null);
          }
        }}
        onForward={(friendId, conversationId) => {
          if (!forwardMessageTarget) {
            return Promise.resolve();
          }

          return forwardMessageToTarget(
            forwardMessageTarget,
            friendId,
            conversationId,
          );
        }}
      />
      <ShareMessageModal
        message={shareMessageTarget}
        friends={friends}
        conversations={conversations}
        loadingFriends={loadingFriends}
        busy={sharingMessage}
        onClose={() => {
          if (!sharingMessage) {
            setShareMessageTarget(null);
          }
        }}
        onShare={(friendIds, conversationIds) => {
          if (!shareMessageTarget) {
            return Promise.resolve();
          }

          return shareMessageToTargets(
            shareMessageTarget,
            friendIds,
            conversationIds,
          );
        }}
      />
      <MessageActionsMenu
        menu={messageMenu}
        mine={messageMenu?.message.emisor_id === currentUser?.id}
        onClose={() => setMessageMenu(null)}
        onCopy={(message) => void copyMessage(message)}
        onShare={(message) => void shareMessage(message)}
        onReply={(message) => setReplyTo(message)}
        onForward={(message) => void forwardMessage(message)}
        onFavorite={(message) => void toggleMessageFavorite(message)}
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
      <SearchMessagesModal
        open={isSearchMessagesOpen}
        conversationId={selectedConversationId}
        onClose={() => setIsSearchMessagesOpen(false)}
      />
      <ConversationActionsMenu
        menu={conversationMenu}
        isMuted={selectedIsMuted}
        isPinned={selectedIsPinned}
        isArchived={Boolean(selectedConversation?.isArchived)}
        onClose={() => setConversationMenu(null)}
        onInfo={() => setIsChatInfoOpen(true)}
        onPin={togglePin}
        onMute={toggleMute}
        onTheme={() => setIsThemeModalOpen(true)}
        onScheduledMessages={() => setIsScheduledMessagesOpen(true)}
        onTemporary={() => setIsTemporaryMessagesModalOpen(true)}
        onSearchMessages={() => setIsSearchMessagesOpen(true)}
        onCreateGroup={() => {
          void loadFriends().then(() => {
            setIsCreateGroupOpen(true);
          });
        }}
        onArchive={() => {
          void toggleArchive();
        }}
        onBlock={() => void blockConversationUser()}
        onReport={() => setIsReportUserModalOpen(true)}
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
      <ReportUserModal
        open={isReportUserModalOpen}
        conversationId={selectedConversationId}
        userName={selectedConversation?.otro_usuario_nombre ?? "Usuario"}
        onClose={() => setIsReportUserModalOpen(false)}
        onToast={setToast}
        onError={setError}
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
            <X size={16} />
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
  const hasQuery = search.trim().length >= 2;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50/60 dark:bg-[#0b1220]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-[#0d1526] sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-500">
            Comunidad
          </p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Amigos
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Encuentra personas e inicia conversaciones privadas.
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              {friends.length} {friends.length === 1 ? "amigo" : "amigos"}
            </span>
          </div>

          <div className="relative mt-5 max-w-2xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => void onSearch(event.target.value)}
              placeholder="Buscar por nombre, usuario o correo..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-500/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400/30 dark:focus:bg-white/[0.07]"
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-8">
          {hasQuery && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Resultados
                </h2>

                <span className="text-xs text-slate-400">
                  {results.length} encontrados
                </span>
              </div>

              {results.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-6 py-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
                  <Search
                    size={22}
                    className="mx-auto text-slate-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    No encontramos personas
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Prueba con otro nombre, usuario o correo completo.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {results.map((user) => (
                    <article
                      key={user.id}
                      className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-violet-400/20"
                    >
                      <Avatar name={user.nombre} src={user.avatar} size="md" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {user.nombre}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {user.username
                            ? `@${user.username}`
                            : "Sin nombre de usuario"}
                        </p>
                      </div>

                      {user.amistad_estado === "NONE" ? (
                        <button
                          type="button"
                          onClick={() => void onAdd(user.id)}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
                        >
                          <UserPlus size={14} />
                          Agregar
                        </button>
                      ) : (
                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${
                            user.amistad_estado === "FRIENDS"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          {user.amistad_estado === "PENDING_SENT"
                            ? "Enviada"
                            : user.amistad_estado === "PENDING_RECEIVED"
                              ? "Recibida"
                              : "Amigos"}
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Tu lista de amigos
              </h2>

              {friends.length > 0 && (
                <span className="text-xs text-slate-400">{friends.length}</span>
              )}
            </div>

            {loading ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-white/5" />

                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded-full bg-slate-100 dark:bg-white/5" />
                      <div className="h-2.5 w-1/2 rounded-full bg-slate-100 dark:bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <UserPlus size={25} className="mx-auto text-violet-400" />

                <p className="mt-3 font-black text-slate-800 dark:text-slate-200">
                  Tu lista está vacía
                </p>

                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  Busca personas arriba y envíales una solicitud de
                  amistad.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {friends.map((friend) => (
                  <article
                    key={friend.amistad_id}
                    className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-violet-400/20"
                  >
                    <Avatar
                      name={friend.nombre}
                      src={friend.avatar}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {friend.nombre}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {friend.username
                          ? `@${friend.username}`
                          : "Sin nombre de usuario"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onChat(friend.usuario_id)}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-500"
                      >
                        <MessageCircle size={14} />
                        Chat
                      </button>

                      <button
                        type="button"
                        onClick={() => void onRemove(friend.amistad_id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Eliminar amistad"
                        aria-label="Eliminar amistad"
                      >
                        <UserMinus size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function RequestsPanel({
  requests,
  sentRequests,
  loading,
  cancelingRequestId,
  onAccept,
  onReject,
  onCancel,
}: {
  requests: FriendRequest[];
  sentRequests: FriendRequest[];
  loading: boolean;
  cancelingRequestId: string | null;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50/60 dark:bg-[#0b1220]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-[#0d1526] sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-500">
            Comunidad
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Solicitudes
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestiona las solicitudes recibidas y las que siguen pendientes.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Recibidas
                </h2>

                {requests.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    {requests.length}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-[22px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-6 py-9 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <Check size={22} className="mx-auto text-emerald-500" />

                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Todo al día
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  No tienes solicitudes recibidas pendientes.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {requests.map((request) => (
                  <article
                    key={request.amistad_id}
                    className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
                  >
                    <Avatar
                      name={request.nombre}
                      src={request.avatar}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {request.nombre}
                      </p>

                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {request.username
                          ? `@${request.username}`
                          : "Sin nombre de usuario"}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void onAccept(request.amistad_id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500"
                        title="Aceptar"
                      >
                        <Check size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void onReject(request.amistad_id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Rechazar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Enviadas
              </h2>

              {sentRequests.length > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  {sentRequests.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-[22px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-6 py-9 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <Clock3 size={22} className="mx-auto text-slate-400" />

                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Sin solicitudes pendientes
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {sentRequests.map((request) => (
                  <article
                    key={request.amistad_id}
                    className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
                  >
                    <Avatar
                      name={request.nombre}
                      src={request.avatar}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {request.nombre}
                      </p>

                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {request.username
                          ? `@${request.username}`
                          : "Sin nombre de usuario"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        <Clock3 size={12} />
                        Pendiente
                      </span>

                      <button
                        type="button"
                        disabled={cancelingRequestId !== null}
                        onClick={() => void onCancel(request.amistad_id)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        title="Cancelar solicitud"
                      >
                        <X size={14} />

                        {cancelingRequestId === request.amistad_id
                          ? "Cancelando..."
                          : "Cancelar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
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
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50/60 dark:bg-[#0b1220]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-[#0d1526] sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-500">
            Privacidad
          </p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Usuarios bloqueados
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Administra las personas que no pueden enviarte solicitudes ni
                iniciar conversaciones privadas contigo.
              </p>
            </div>

            {!loading && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {users.length} {users.length === 1 ? "bloqueado" : "bloqueados"}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[74px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d1526]"
                />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center dark:border-white/10 dark:bg-[#0d1526]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300">
                <ShieldOff size={24} />
              </span>

              <h2 className="mt-4 text-base font-black text-slate-950 dark:text-white">
                No tienes usuarios bloqueados
              </h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Cuando bloquees a alguien aparecerá aquí y
                podrás desbloquearlo cuando quieras.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <article
                  key={user.bloqueo_id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm shadow-slate-200/30 dark:border-white/10 dark:bg-[#0d1526] dark:shadow-none"
                >
                  <Avatar
                    name={user.usuario.nombre}
                    src={user.usuario.avatar_url}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                      {user.usuario.nombre}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.usuario.username
                        ? `@${user.usuario.username}`
                        : "Usuario bloqueado"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onUnblock(user.usuario.id)}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                  >
                    Desbloquear
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
