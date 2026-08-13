import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { ChatComposer } from "../components/Chat/chat/ChatComposer";
import { ChatHeader } from "../components/Chat/chat/ChatHeader";
import { ChatInfoDrawer } from "../components/Chat/chat/ChatInfoDrawer";
import { ChatSidebar } from "../components/Chat/chat/ChatSidebar";
import { ChatThemeModal } from "../components/Chat/chat/ChatThemeModal";
import { ConfirmActionModal } from "../components/Chat/chat/ConfirmActionModal";
import { ConversationActionsMenu } from "../components/Chat/chat/ConversationActionsMenu";
import { ConversationList } from "../components/Chat/chat/ConversationList";
import { CreateGroupModal } from "../components/Chat/chat/CreateGroupModal";
import { GroupInfoDrawer } from "../components/Chat/chat/GroupInfoDrawer";
import { MessageActionsMenu } from "../components/Chat/chat/MessageActionsMenu";
import { MessageList } from "../components/Chat/chat/MessageList";
import { TemporaryMessagesModal } from "../components/Chat/chat/TemporaryMessagesModal";
import { AddGroupMembersModal } from "../components/Chat/chat/AddGroupMembersModal";
import {
  API_ROUTES,
  WEBSOCKET_URL,
} from "../components/Chat/features/constants";
import type {
  BlockedUser,
  ChatTab,
  ChatThemeId,
  ConfirmAction,
  Conversation,
  ConversationMenuState,
  Friend,
  FriendRequest,
  Message,
  MessageMenuState,
  SearchUser,
  TemporaryDuration,
} from "../components/Chat/features/types";
import {
  getConversationTheme,
  getCurrentUser,
  getErrorMessage,
  getFixedMenuPosition,
  getTheme,
  persistConversationTheme,
} from "../components/Chat/features/utils";
import { ScheduledMessagesModal } from "../components/Chat/chat/ScheduledMessagesModal";


export default function ChatPage() {
  const navigate = useNavigate();
  const { conversacionId } = useParams();
  const currentUser = getCurrentUser();
  const token = localStorage.getItem("token");

  const selectedConversationIdRef = useRef<number | null>(null);

  const chatBasePath =
    currentUser?.rol === "super_admin" ||
    currentUser?.rol === "superadmin"
      ? "/superadmin/chat"
      : "/admin/chat";

  const [activeTab, setActiveTab] = useState<ChatTab>("chats");

  const [selectedConversationId, setSelectedConversationId] =
    useState<number | null>(
      conversacionId ? Number(conversacionId) : null
    );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);

  const [chatSearch, setChatSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [messageMenu, setMessageMenu] =
    useState<MessageMenuState | null>(null);

  const [conversationMenu, setConversationMenu] =
    useState<ConversationMenuState | null>(null);

  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const [
    isTemporaryMessagesModalOpen,
    setIsTemporaryMessagesModalOpen,
  ] = useState(false);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [confirmBusy, setConfirmBusy] = useState(false);

  const [editingMessageId, setEditingMessageId] =
    useState<number | null>(null);

  const [editingText, setEditingText] = useState("");

  const [chatTheme, setChatTheme] =
    useState<ChatThemeId>("violet");

  const [
    temporaryMessagesDuration,
    setTemporaryMessagesDuration,
  ] = useState<TemporaryDuration>("off");

  const [loadingConversations, setLoadingConversations] =
    useState(true);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [isScheduledMessagesOpen, setIsScheduledMessagesOpen] =
  useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [nearEnd, setNearEnd] = useState(true);

  const messageAreaRef = useRef<HTMLDivElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
  selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  const selectedConversation = useMemo(() => {
    return (
      conversations.find(
        (item) => item.id === selectedConversationId
      ) ?? null
    );
  }, [conversations, selectedConversationId]);

  const selectedIsMuted = Boolean(selectedConversation?.isMuted);
  const selectedIsPinned = Boolean(selectedConversation?.isPinned);

  const theme = getTheme(chatTheme);

  const filteredConversations = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    if (!query) {
      return conversations.filter((item) => !item.isArchived);
    }

    return conversations.filter((item) => {
      const title =
        item.tipo === "grupo"
          ? item.titulo ?? ""
          : item.otro_usuario_nombre ?? "";

      return (
        !item.isArchived &&
        `${title} ${item.ultimo_mensaje ?? ""}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [chatSearch, conversations]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoadingConversations(true);
      }

      const response = await api.get(API_ROUTES.conversations);
      const payload = response.data?.data ?? response.data;

      const raw = (payload?.conversaciones ?? []) as Conversation[];

      setConversations((old) =>
        raw.map((incoming) => {
          const previous = old.find(
            (item) => item.id === incoming.id
          );

          return {
            ...incoming,
            isPinned: previous?.isPinned ?? false,
            isMuted: previous?.isMuted ?? false,
            isArchived: previous?.isArchived ?? false,
            temporaryMessagesDuration:
              previous?.temporaryMessagesDuration ?? "off",
          };
        })
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron cargar los chats."
        )
      );
    } finally {
      if (!silent) {
        setLoadingConversations(false);
      }
    }
  }, []);

  const loadMessages = useCallback(
    async (id: number, keepPosition = false) => {
      try {
        setLoadingMessages(!keepPosition);

        const response = await api.get(
          API_ROUTES.conversationMessages(id)
        );

        const payload = response.data?.data ?? response.data;

        const incoming = (payload?.mensajes ?? []) as Message[];

        setMessages((old) => {
          const messagesAreUnchanged =
            keepPosition &&
            old.length === incoming.length &&
            old.every(
              (message, index) =>
                message.id === incoming[index]?.id &&
                message.actualizado_en ===
                  incoming[index]?.actualizado_en
            );

          if (messagesAreUnchanged) {
            return old;
          }

          return incoming;
        });
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "No se pudieron cargar los mensajes."
          )
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);

      const response = await api.get(API_ROUTES.friends);
      const payload = response.data?.data ?? response.data;

      setFriends(payload?.amigos ?? []);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo cargar la lista de amigos."
        )
      );
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);

      const response = await api.get(API_ROUTES.requests);
      const payload = response.data?.data ?? response.data;

      setRequests(payload?.solicitudes ?? []);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudieron cargar las solicitudes."
        )
      );
    } finally {
      setLoadingRequests(false);
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
          "No se pudieron cargar los usuarios bloqueados."
        )
      );
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  useEffect(() => {
  const savedToken = localStorage.getItem("token");

  if (!savedToken) {
    navigate("/login", { replace: true });
  }
}, [navigate]);

  useEffect(() => {
  const savedToken = localStorage.getItem("token");

if (!savedToken) {
  return;
}

  void Promise.all([
    loadConversations(),
    loadFriends(),
    loadRequests(),
    loadBlocked(),
  ]);
  }, [
    token,
    currentUser?.id,
    loadBlocked,
    loadConversations,
    loadFriends,
    loadRequests,
  ]);

    useEffect(() => {

  const savedToken = localStorage.getItem("token");

  if (!savedToken || !currentUser?.id) {
    return;
  }

  const safeToken = savedToken;

  let reconnectTimer: number | null = null;
  let manuallyClosed = false;
  let reconnectAttempts = 0;

  function connectWebSocket(): void {
    if (manuallyClosed) {
      return;
    }

    const socket = new WebSocket(
      `${WEBSOCKET_URL}?token=${encodeURIComponent(safeToken)}`
    );

    websocketRef.current = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      console.log("WebSocket conectado.");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event?: string;
          data?: {
            message?: Message;
            conversation_id?: number;
            usuario_id?: number;
            is_typing?: boolean;
          };
        };

        if (payload.event !== "new_message") {
          return;
        }

        const incomingMessage = payload.data?.message;

        if (!incomingMessage) {
          return;
        }

        const conversationId = Number(incomingMessage.conversacion_id);
        const currentSelectedId = selectedConversationIdRef.current;

        setMessages((old) => {
          const alreadyExists = old.some(
            (message) => Number(message.id) === Number(incomingMessage.id)
          );

          if (alreadyExists) {
            return old;
          }

          if (conversationId !== currentSelectedId) {
            return old;
          }

          return [...old, incomingMessage];
        });

        void loadConversations(true);

        if (conversationId === currentSelectedId) {
          setNearEnd(true);
        }
      } catch {
        console.warn("Evento WebSocket inválido.");
      }
    };

    socket.onerror = () => {
      console.warn("Error de conexión WebSocket.");
    };

    socket.onclose = () => {
      websocketRef.current = null;

      if (manuallyClosed) {
        return;
      }

      reconnectAttempts += 1;

      const delay = Math.min(3000 * reconnectAttempts, 15000);

      reconnectTimer = window.setTimeout(() => {
        connectWebSocket();
      }, delay);
    };
  }

  connectWebSocket();

  return () => {
    manuallyClosed = true;

    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }

    websocketRef.current?.close();
    websocketRef.current = null;
  };
}, [currentUser?.id, loadConversations]);

  useEffect(() => {
  const savedToken = localStorage.getItem("token");

  if (!savedToken) {
    return;
  }

  const timer = window.setInterval(() => {
    void loadConversations(true);
  }, 20000);

  return () => {
    window.clearInterval(timer);
  };
}, [loadConversations]);

  useEffect(() => {
    const id = conversacionId ? Number(conversacionId) : null;

    if (id && id !== selectedConversationId) {
      setSelectedConversationId(id);
    }
  }, [conversacionId, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    setChatTheme(getConversationTheme(selectedConversationId));

    setTemporaryMessagesDuration(
      selectedConversation?.temporaryMessagesDuration ?? "off"
    );

    void loadMessages(selectedConversationId);
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

  function closeMenus(): void {
    setMessageMenu(null);
    setConversationMenu(null);
  }

  function selectConversation(id: number): void {
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
      void loadRequests();
    }

    if (tab === "bloqueados") {
      void loadBlocked();
    }
  }

  function openMessageActions(
    button: HTMLButtonElement,
    message: Message
  ): void {
    setConversationMenu(null);

    setMessageMenu({
      message,
      position: getFixedMenuPosition(
        button,
        224,
        Number(message.emisor_id) === currentUser?.id ? 420 : 330
      ),
    });
  }

  function openConversationActions(
    button: HTMLButtonElement
  ): void {
    if (!selectedConversation) return;

    setMessageMenu(null);

    setConversationMenu({
      conversation: selectedConversation,
      position: getFixedMenuPosition(button, 256, 580),
    });
  }

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const contenido = messageText.trim();

    if (
      !contenido ||
      !selectedConversationId ||
      sendingMessage
    ) {
      return;
    }

    try {
      setSendingMessage(true);

      const response = await api.post(
        API_ROUTES.conversationMessages(selectedConversationId),
        {
          contenido,
          tipo: "texto",
          ...(replyTo
            ? {
                reply_to_id: replyTo.id,
              }
            : {}),
        }
      );

      const payload = response.data?.data ?? response.data;

      const created = payload?.mensaje as Message | undefined;

      if (created) {
        setMessages((old) => [
          ...old,
          {
            ...created,
            emisor_nombre:
              created.emisor_nombre ||
              currentUser?.nombre ||
              "Tú",
            emisor_avatar:
              created.emisor_avatar ??
              currentUser?.avatar ??
              null,
            reply_to: replyTo
              ? {
                  id: replyTo.id,
                  emisor_nombre: replyTo.emisor_nombre,
                  contenido: replyTo.contenido,
                }
              : null,
          },
        ]);
      } else {
        await loadMessages(selectedConversationId, true);
      }

      setMessageText("");
      setReplyTo(null);

      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo enviar el mensaje."
        )
      );
    } finally {
      setSendingMessage(false);
    }
  }

  async function saveEdit(messageId: number): Promise<void> {
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
            : message
        )
      );

      setEditingMessageId(null);
      setEditingText("");

      await loadConversations(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo editar el mensaje."
        )
      );
    }
  }

  function askDelete(message: Message, everyone: boolean): void {
    setConfirmAction({
      title: everyone
        ? "¿Eliminar para todos?"
        : "¿Eliminar de tu vista?",
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
                    : item
                )
              : old.filter((item) => item.id !== message.id)
          );

          setConfirmAction(null);
        } catch (requestError) {
          setError(
            getErrorMessage(
              requestError,
              "No se pudo eliminar el mensaje."
            )
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

  function updateSelectedConversation(
    patch: Partial<Conversation>
  ): void {
    if (!selectedConversationId) return;

    setConversations((old) =>
      old.map((item) =>
        item.id === selectedConversationId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function togglePin(): void {
    updateSelectedConversation({
      isPinned: !selectedIsPinned,
    });

    setToast(
      selectedIsPinned
        ? "Conversación quitada de fijados."
        : "Conversación fijada arriba."
    );
  }

  function toggleMute(): void {
    updateSelectedConversation({
      isMuted: !selectedIsMuted,
    });

    setToast(
      selectedIsMuted
        ? "Notificaciones activadas."
        : "Chat silenciado."
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
        id: -Date.now(),
        conversacion_id: selectedConversationId ?? 0,
        emisor_id: 0,
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
      "Configuración guardada visualmente; falta confirmar el endpoint PHP."
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

  async function createOrOpenPrivateChat(
    friendId: number
  ): Promise<void> {
    try {
      const response = await api.post(
        API_ROUTES.createPrivateChat,
        {
          amigo_id: friendId,
        }
      );

      const payload = response.data?.data ?? response.data;
      const id = Number(payload?.conversacion_id);

      if (!id) {
        throw new Error("El servidor no devolvió el ID.");
      }

      await loadConversations(true);
      selectConversation(id);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo iniciar la conversación privada."
        )
      );
    }
  }

  const [groupMembers, setGroupMembers] = useState<
  {
    usuario_id: number;
    rol: "admin" | "miembro";
    nombre: string;
    correo: string;
    foto_perfil?: string | null;
  }[]
>([]);

const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
const [myGroupRole, setMyGroupRole] = useState<"admin" | "miembro">("miembro");

  async function searchPeople(value: string): Promise<void> {
    setPeopleSearch(value);

    if (value.trim().length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await api.get(
        API_ROUTES.searchUsers(value)
      );

      const payload = response.data?.data ?? response.data;

      setSearchUsers(payload?.usuarios ?? []);
    } catch {
      setSearchUsers([]);
    }
  }

  async function sendFriendRequest(
    userId: number
  ): Promise<void> {
    try {
      await api.post(API_ROUTES.requestFriendship, {
        amigo_id: userId,
      });

      await searchPeople(peopleSearch);

      setToast("Solicitud enviada.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo enviar la solicitud."
        )
      );
    }
  }

  async function acceptRequest(id: number): Promise<void> {
    try {
      await api.put(API_ROUTES.acceptRequest(id));

      await Promise.all([loadRequests(), loadFriends()]);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo aceptar la solicitud."
        )
      );
    }
  }

  async function rejectRequest(id: number): Promise<void> {
    try {
      await api.put(API_ROUTES.rejectRequest(id));
      await loadRequests();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo rechazar la solicitud."
        )
      );
    }
  }

  async function unblockUser(id: number): Promise<void> {
    try {
      await api.post(API_ROUTES.unblockUser(id));

      await loadBlocked();

      setToast("Usuario desbloqueado.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No se pudo desbloquear al usuario."
        )
      );
    }
  }

  function createGroup(
    name: string,
    memberIds: number[]
  ): void {
    setCreatingGroup(true);

    futureAction(
      "Grupo listo para conectar",
      `El formulario validó “${name}” con ${memberIds.length} miembro(s). Crea POST /chat/groups en PHP y luego sustituye esta acción visual por api.post(API_ROUTES.createGroup, { nombre: name, miembros: memberIds }).`
    );

    setCreatingGroup(false);
    setIsCreateGroupOpen(false);
  }

  async function addMembersToGroup(
  memberIds: number[]
): Promise<void> {
  if (!selectedConversation || memberIds.length === 0) {
    return;
  }

  setAddingMembers(true);
  setError("");

  try {
    for (const usuarioId of memberIds) {
      const response = await api.post(
        API_ROUTES.addGroupMember(selectedConversation.id),
        {
          usuario_id: usuarioId,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "No se pudo agregar una persona al grupo."
        );
      }
    }

    setToast(
      memberIds.length === 1
        ? "Persona agregada correctamente al grupo."
        : `${memberIds.length} personas agregadas correctamente al grupo.`
    );

    setIsAddMembersOpen(false);
  } catch (error) {
  setError(
    getErrorMessage(
      error,
      "No se pudieron agregar las personas al grupo."
    )
  );
} finally {
  setAddingMembers(false);
}
}

async function loadGroupDetail(groupId: number): Promise<void> {
  setLoadingGroupMembers(true);

  try {
    const response = await api.get(
      `/chat/groups/${groupId}`
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
          "No se pudo cargar la información del grupo."
      );
    }

    setGroupMembers(response.data.data?.miembros ?? []);
    setMyGroupRole(
      response.data.data?.mi_rol === "admin"
        ? "admin"
        : "miembro"
    );
  } catch (error) {
    setError(
      getErrorMessage(
        error,
        "No se pudo cargar la información del grupo."
      )
    );
  } finally {
    setLoadingGroupMembers(false);
  }
}

async function removeMemberFromGroup(userId: number): Promise<void> {
  if (!selectedConversation) {
    return;
  }

  setError("");

  try {
    const response = await api.delete(
      API_ROUTES.removeGroupMember(
        selectedConversation.id,
        userId,
      ),
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message ||
          "No se pudo quitar a la persona del grupo.",
      );
    }

    setToast("Persona eliminada correctamente del grupo.");
    await loadGroupDetail(selectedConversation.id);
  } catch (error) {
    setError(
      getErrorMessage(
        error,
        "No se pudo quitar a la persona del grupo.",
      ),
    );
  }
}

  const unreadChats = conversations.reduce(
    (total, item) => total + Number(item.no_leidos ?? 0),
    0
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
      className="min-h-[calc(100vh-72px)] bg-[#0B1120] text-slate-100 md:p-5"
      onClick={closeMenus}
    >
      <main className="mx-auto flex h-[calc(100vh-72px)] max-w-[1650px] overflow-hidden bg-[#111827] md:h-[calc(100vh-112px)] md:rounded-[30px] md:border md:border-slate-800 md:shadow-2xl md:shadow-black/30">
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
                    <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/15">
                      <MessageCircle size={38} />
                    </div>

                    <h2 className="text-2xl font-bold text-white">
                      Tus conversaciones, en un lugar
                    </h2>

                    <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
                      Selecciona un chat para ver los mensajes o busca
                      un amigo para iniciar una nueva conversación.
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
                        isGroup={
                          selectedConversation.tipo === "grupo"
                        }
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
                      onChange={setMessageText}
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
            />
          )}

          {activeTab === "solicitudes" && (
            <RequestsPanel
              requests={requests}
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
        mine={
          Number(messageMenu?.message.emisor_id) === currentUser?.id
        }
        onClose={() => setMessageMenu(null)}
        onCopy={(message) => void copyMessage(message)}
        onShare={(message) => void shareMessage(message)}
        onReply={(message) => setReplyTo(message)}
        onForward={(message) =>
          futureAction(
            "Reenviar mensaje",
            `El mensaje “${message.contenido.slice(
              0,
              80
            )}” está listo para conectar con POST /chat/messages/${
              message.id
            }/forward.`
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
                : item
            )
          );

          setToast("Favorito actualizado localmente.");
        }}
        onInfo={(message) =>
          futureAction(
            "Información del mensaje",
            `Enviado por ${message.emisor_nombre} el ${
              message.creado_en
            }. Estado de lectura: ${
              message.leido ? "leído" : "enviado"
            }.`
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
            "Crea POST /chat/messages/{id}/report para guardar y revisar los reportes."
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
        onTemporary={() =>
          setIsTemporaryMessagesModalOpen(true)
        }
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onArchive={() => {
          updateSelectedConversation({
            isArchived: true,
          });

          setSelectedConversationId(null);
          navigate(chatBasePath);

          setToast(
            "Archivada localmente; conecta PUT /chat/conversations/{id}/archive para persistir."
          );
        }}
        onBlock={() =>
          futureAction(
            "Bloquear usuario",
            "Crea POST /chat/conversations/{id}/block y valida que no se pueda iniciar un chat privado con usuarios bloqueados."
          )
        }
        onReport={() =>
          futureAction(
            "Reportar usuario",
            "Crea el controlador PHP de reportes de usuario antes de activar esta acción."
          )
        }
        onDeleteLocal={() =>
          futureAction(
            "Eliminar conversación de mi vista",
            "Crea DELETE /chat/conversations/{id}/local para ocultarla sin borrar mensajes del otro usuario."
          )
        }
        onLeaveGroup={() =>
          futureAction(
            "Salir del grupo",
            "Crea POST /chat/groups/{id}/leave y actualiza la lista de conversaciones."
          )
        }
      />

      <ChatInfoDrawer
        open={isChatInfoOpen}
        conversation={selectedConversation}
        muted={selectedIsMuted}
        temporaryDuration={temporaryMessagesDuration}
        onClose={() => setIsChatInfoOpen(false)}
        onMute={toggleMute}
        onTheme={() => setIsThemeModalOpen(true)}
        onTemporary={() =>
          setIsTemporaryMessagesModalOpen(true)
        }
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
        isAdmin={myGroupRole === "admin"}
        onClose={() => setIsGroupInfoOpen(false)}
        onAddMember={() => {
          setIsGroupInfoOpen(false);
          setIsAddMembersOpen(true);
        }}
        onRemoveMember={removeMemberFromGroup}
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
        existingMemberIds={[]}
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
        onClose={() =>
          setIsTemporaryMessagesModalOpen(false)
        }
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
}: {
  friends: Friend[];
  search: string;
  results: SearchUser[];
  loading: boolean;
  onSearch: (value: string) => Promise<void>;
  onAdd: (id: number) => Promise<void>;
  onChat: (id: number) => Promise<void>;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-slate-800 bg-slate-950/20 px-5 py-5 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400">
          Comunidad
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white">
          Amigos
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Busca personas, envía solicitudes e inicia conversaciones.
        </p>

        <input
          value={search}
          onChange={(event) => void onSearch(event.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="mt-5 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
        />
      </header>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        {search.trim().length >= 2 && (
          <div className="mb-8 grid gap-3 lg:grid-cols-2">
            {results.map((user) => (
              <article
                key={user.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/45 p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 font-bold text-violet-300">
                  {user.nombre.slice(0, 1)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {user.nombre}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user.correo}
                  </p>
                </div>

                {user.amistad_estado ? (
                  <span className="text-xs text-slate-400">
                    {user.amistad_estado}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onAdd(user.id)}
                    className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white"
                  >
                    Agregar
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        <h2 className="mb-4 text-sm font-bold text-white">
          Tu lista de amigos
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">
            Cargando amigos...
          </p>
        ) : friends.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
            Tu lista está vacía.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {friends.map((friend) => (
              <article
                key={friend.amistad_id}
                className="rounded-3xl border border-slate-800 bg-slate-900/45 p-4"
              >
                <p className="font-bold text-white">
                  {friend.nombre}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {friend.correo}
                </p>

                <button
                  type="button"
                  onClick={() => void onChat(friend.usuario_id)}
                  className="mt-5 w-full rounded-xl bg-violet-500/15 px-4 py-2.5 text-sm font-bold text-violet-300 hover:bg-violet-500 hover:text-white"
                >
                  Abrir chat
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
  loading,
  onAccept,
  onReject,
}: {
  requests: FriendRequest[];
  loading: boolean;
  onAccept: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}) {
  return (
    <section className="flex-1 overflow-y-auto p-5 sm:p-8">
      <h1 className="text-2xl font-bold text-white">
        Solicitudes de amistad
      </h1>

      <p className="mt-1 text-sm text-slate-400">
        Decide quién puede entrar a tu red de contactos.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-slate-500">
            Cargando solicitudes...
          </p>
        ) : requests.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
            No tienes solicitudes pendientes.
          </p>
        ) : (
          requests.map((request) => (
            <article
              key={request.amistad_id}
              className="rounded-3xl border border-slate-800 bg-slate-900/45 p-5"
            >
              <p className="font-bold text-white">
                {request.nombre}
              </p>

              <p className="text-xs text-slate-500">
                {request.correo}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void onAccept(request.amistad_id)
                  }
                  className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Aceptar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void onReject(request.amistad_id)
                  }
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300"
                >
                  Rechazar
                </button>
              </div>
            </article>
          ))
        )}
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
  onUnblock: (id: number) => Promise<void>;
}) {
  return (
    <section className="flex-1 overflow-y-auto p-5 sm:p-8">
      <h1 className="text-2xl font-bold text-white">
        Usuarios bloqueados
      </h1>

      <p className="mt-1 text-sm text-slate-400">
        Estas personas no pueden iniciar conversaciones contigo.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-slate-500">
            Cargando usuarios bloqueados...
          </p>
        ) : users.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
            No tienes usuarios bloqueados.
          </p>
        ) : (
          users.map((user) => (
            <article
              key={user.amistad_id}
              className="rounded-3xl border border-slate-800 bg-slate-900/45 p-5"
            >
              <p className="font-bold text-white">
                {user.nombre}
              </p>

              <p className="text-xs text-slate-500">
                {user.correo}
              </p>

              <button
                type="button"
                onClick={() => void onUnblock(user.usuario_id)}
                className="mt-5 w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
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