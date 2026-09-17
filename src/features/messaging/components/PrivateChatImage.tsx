import { ImageOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import api from "../../../services/api";

type PrivateChatImageProps = {
  messageId: string;
  alt: string;
};

export function PrivateChatImage({ messageId, alt }: PrivateChatImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    let currentUrl: string | null = null;

    setLoading(true);
    setFailed(false);
    setObjectUrl(null);

    void api
      .get<Blob>(`/chat/messages/${messageId}/image`, {
        responseType: "blob",
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        currentUrl = URL.createObjectURL(response.data);

        setObjectUrl(currentUrl);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setLoading(false);
        setFailed(true);
      });

    return () => {
      controller.abort();

      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [messageId]);

  if (loading) {
    return (
      <div className="flex h-48 w-64 max-w-full items-center justify-center rounded-2xl bg-black/10 dark:bg-black/20">
        <LoaderCircle size={24} className="animate-spin opacity-70" />
      </div>
    );
  }

  if (failed || !objectUrl) {
    return (
      <div className="flex h-32 w-64 max-w-full flex-col items-center justify-center gap-2 rounded-2xl bg-black/10 text-xs opacity-70 dark:bg-black/20">
        <ImageOff size={24} />
        <span>No se pudo cargar la imagen</span>
      </div>
    );
  }

  return (
    <a
      href={objectUrl}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-2xl"
    >
      <img
        src={objectUrl}
        alt={alt}
        className="max-h-80 w-auto max-w-full rounded-2xl object-contain"
      />
    </a>
  );
}
