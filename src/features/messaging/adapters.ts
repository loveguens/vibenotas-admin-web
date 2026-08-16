import type { Conversation, Message, MessageType } from "./types/chat.types";

import type {
  BackendChatMessage,
  BackendConversation,
} from "./types/backend.types";

import type { RealtimeChatMessage } from "./types/realtime.types";
function mapMessageType(type: string): MessageType {
  switch (type.trim().toLowerCase()) {
    case "text":
    case "texto":
      return "texto";

    case "system":
    case "sistema":
      return "sistema";

    case "image":
    case "imagen":
      return "imagen";

    case "file":
    case "archivo":
      return "archivo";

    case "audio":
      return "audio";

    default:
      return "texto";
  }
}

export function adaptMessage(message: BackendChatMessage): Message {
  return {
    id: message.id,
    conversacion_id: message.conversacion_id,

    emisor_id: message.remitente?.id ?? null,

    emisor_nombre: message.remitente?.nombre ?? "Sistema",

    emisor_avatar: message.remitente?.avatar_url ?? null,

    contenido: message.contenido ?? "",

    tipo: mapMessageType(message.tipo),

    leido: 0,

    editado: message.editado_en ? 1 : 0,

    eliminado: message.eliminado_en ? 1 : 0,

    creado_en: message.creado_en,

    actualizado_en: message.actualizado_en,

    client_message_id: message.client_message_id,

    es_mio: message.es_mio,
  };
}

export function adaptConversation(
  conversation: BackendConversation,
  currentUserId?: string | null,
): Conversation {
  const otherMember =
    conversation.tipo.toLowerCase() === "directa"
      ? conversation.miembros.find(
          (member) => member.usuario.id !== currentUserId,
        )
      : undefined;

  const lastMessage = conversation.ultimo_mensaje
    ? adaptMessage(conversation.ultimo_mensaje)
    : null;

  return {
    id: conversation.id,

    tipo: conversation.tipo.toLowerCase() === "grupo" ? "grupo" : "privado",

    titulo: conversation.titulo ?? null,

    creado_en: conversation.creado_en,

    actualizado_en: conversation.ultima_actividad_en,

    otro_usuario_id: otherMember?.usuario.id ?? null,

    otro_usuario_nombre: otherMember?.usuario.nombre ?? null,

    otro_usuario_avatar:
      otherMember?.usuario.avatar_url ?? conversation.avatar_url ?? null,

    ultimo_mensaje: lastMessage?.contenido ?? null,

    ultimo_mensaje_tipo: lastMessage?.tipo ?? null,

    ultimo_mensaje_fecha: lastMessage?.creado_en ?? null,

    no_leidos: conversation.mensajes_sin_leer ?? 0,

    presencia: conversation.presencia ?? null,

    isPinned: false,
    isMuted: false,
    isArchived: false,

    temporaryMessagesDuration: "off",
  };
}

export function adaptRealtimeMessage(
  message: RealtimeChatMessage,
  currentUserId: string,
): Message {
  return {
    id: message.id,

    conversacion_id: message.conversationId,

    emisor_id: message.senderUserId,

    emisor_nombre: message.sender?.displayName ?? "Sistema",

    emisor_avatar: message.sender?.avatarUrl ?? null,

    contenido: message.content,

    tipo: mapMessageType(message.type),

    leido: 0,

    editado: message.editedAt ? 1 : 0,

    eliminado: message.deletedAt ? 1 : 0,

    creado_en: message.createdAt,

    actualizado_en: message.updatedAt,

    client_message_id: message.clientMessageId,

    es_mio: message.senderUserId === currentUserId,
  };
}
