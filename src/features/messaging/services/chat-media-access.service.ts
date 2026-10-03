import api from "../../../services/api";

export type ChatMediaAccessMode = "signed-url" | "authenticated-route";

export type ChatMediaKind = "IMAGE" | "AUDIO" | "VIDEO" | "FILE";

export type ChatMediaAccess = {
  accessMode: ChatMediaAccessMode;
  url: string;
  expiresAt: string | null;
  kind: ChatMediaKind;
  mimeType: string;
  originalName: string | null;
  sizeBytes: number;
  durationMs: number | null;
};

export type ResolvedChatMedia = {
  url: string;
  access: ChatMediaAccess;
  revoke: (() => void) | null;
};

type MediaAccessResponse = {
  success?: boolean;
  data?: ChatMediaAccess;
};

export async function getChatMediaAccess(
  messageId: string,
  signal?: AbortSignal,
): Promise<ChatMediaAccess> {
  const response = await api.get<MediaAccessResponse | ChatMediaAccess>(
    `/chat/messages/${messageId}/media-url`,
    {
      signal,
    },
  );

  const raw = response.data;

  const access =
    "data" in raw && raw.data ? raw.data : (raw as ChatMediaAccess);

  if (!access || typeof access.url !== "string" || !access.url.trim()) {
    throw new Error("El backend no devolvi? acceso al archivo.");
  }

  return access;
}

export async function resolveChatMedia(
  messageId: string,
  signal?: AbortSignal,
): Promise<ResolvedChatMedia> {
  const access = await getChatMediaAccess(messageId, signal);

  /*
   * Supabase:
   * el backend ya autoriz? al usuario y devuelve
   * una URL firmada temporal.
   */
  if (access.accessMode === "signed-url") {
    return {
      url: access.url,
      access,
      revoke: null,
    };
  }

  /*
   * Driver local:
   * seguimos pasando por Axios para incluir
   * Bearer + renovaci?n autom?tica de sesi?n.
   */
  const response = await api.get<Blob>(access.url, {
    responseType: "blob",
    signal,
  });

  const objectUrl = URL.createObjectURL(response.data);

  return {
    url: objectUrl,
    access,
    revoke: () => {
      URL.revokeObjectURL(objectUrl);
    },
  };
}
