export type ChatTab = "chats" | "amigos" | "solicitudes" | "bloqueados";

export type ConversationType = "privado" | "grupo" | "soporte";

export type MessageType = "texto" | "imagen" | "archivo" | "audio" | "sistema";

export type CurrentUser = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  avatar?: string | null;
};

export type ChatPresence = {
  status?: string;
  estado?: string;
  online?: boolean;
  occurredAt?: string | null;
  lastSeenAt?: string | null;
  ultima_vez_en_linea?: string | null;
};

export type Conversation = {
  id: string;
  tipo: ConversationType;
  titulo: string | null;
  creado_en: string;
  actualizado_en: string;

  otro_usuario_id?: string | null;
  otro_usuario_nombre?: string | null;
  otro_usuario_correo?: string | null;
  otro_usuario_avatar?: string | null;

  ultimo_mensaje?: string | null;
  ultimo_mensaje_tipo?: MessageType | null;
  ultimo_mensaje_fecha?: string | null;
  no_leidos?: number;

  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;

  temporaryMessagesDuration?: TemporaryDuration;

  presencia?: ChatPresence | null;
};

export type ReplyPreview = {
  id: string;
  emisor_nombre: string;
  contenido: string;
};

export type Message = {
  id: string;
  conversacion_id: string;

  emisor_id: string | null;
  emisor_nombre: string;
  emisor_avatar?: string | null;

  contenido: string;
  tipo: MessageType;

  leido: number;
  editado: number;
  eliminado?: number;

  creado_en: string;
  actualizado_en: string;

  archivo_url?: string | null;
  archivo_nombre?: string | null;

  reply_to?: ReplyPreview | null;

  reenviado?: number;
  favorito?: boolean;
  fijado?: boolean;

  reacciones?: Array<{
    emoji: string;
    total: number;
    mine?: boolean;
  }>;

  client_message_id?: string | null;
  es_mio?: boolean;
};

export type Friend = {
  amistad_id: string;
  usuario_id: string;
  nombre: string;
  correo: string;
  avatar?: string | null;
  usuario_estado: string;
};

export type FriendRequest = {
  amistad_id: string;
  usuario_id: string;
  nombre: string;
  correo: string;
  avatar?: string | null;
  creado_en: string;
};

export type BlockedUser = Friend;

export type SearchUser = {
  id: string;
  nombre: string;
  correo: string;
  avatar?: string | null;
  estado: string;
  rol_nombre?: string | null;
  amistad_estado?: string | null;
};

export type FixedMenuPosition = {
  x: number;
  y: number;
};

export type MessageMenuState = {
  message: Message;
  position: FixedMenuPosition;
} | null;

export type ConversationMenuState = {
  conversation: Conversation;
  position: FixedMenuPosition;
} | null;

export type ChatThemeId =
  "violet" | "blue" | "emerald" | "rose" | "amber" | "slate" | "midnight";

export type TemporaryDuration = "off" | "24h" | "7d" | "30d" | "custom";

export type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "primary";
  onConfirm: () => Promise<void> | void;
};

export type GroupDraft = {
  nombre: string;
  memberIds: string[];
};
