export type BackendChatUser = {
  id: string;
  nombre: string;
  avatar_url: string | null;
};

export type BackendChatMember = {
  usuario: BackendChatUser;
  rol: string;
  unido_en: string;
};

export type BackendPresence = {
  status?: string;
  estado?: string;
  online?: boolean;
  occurredAt?: string | null;
  lastSeenAt?: string | null;
  ultima_vez_en_linea?: string | null;
} | null;

export type BackendChatMessage = {
  id: string;
  conversacion_id: string;
  remitente: BackendChatUser | null;
  es_mio: boolean;
  tipo: string;
  contenido: string | null;
  client_message_id: string | null;
  editado_en: string | null;
  eliminado_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type BackendConversation = {
  id: string;
  tipo: string;
  titulo: string;
  avatar_url?: string | null;
  ultima_actividad_en: string;
  creado_en: string;
  mensajes_sin_leer: number;
  presencia?: BackendPresence;
  miembros: BackendChatMember[];
  ultimo_mensaje: BackendChatMessage | null;
};

export type ListConversationsResponse = {
  total: number;
  sin_leer: number;
  conversaciones: BackendConversation[];
};

export type ListMessagesResponse = {
  conversacion_id: string;
  mensajes: BackendChatMessage[];
  siguiente_cursor: string | null;
  hay_mas: boolean;
};

export type CreateDirectConversationResponse = {
  conversacion: BackendConversation;
};

export type SendMessageResponse = {
  mensaje: BackendChatMessage;
  ya_existente: boolean;
};
