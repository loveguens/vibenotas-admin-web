import { ImageOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  resolveChatMedia,
  type ResolvedChatMedia,
} from "../services/chat-media-access.service";

type PrivateChatImageProps = {
  messageId: string;
  alt: string;
};

export function PrivateChatImage({ messageId, alt }: PrivateChatImageProps) {
  const [media, setMedia] = useState<ResolvedChatMedia | null>(null);

  const [loading, setLoading] = useState(true);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    let current: ResolvedChatMedia | null = null;

    setLoading(true);
    setFailed(false);
    setMedia(null);

    void resolveChatMedia(messageId, controller.signal)
      .then((resolved) => {
        if (controller.signal.aborted) {
          resolved.revoke?.();
          return;
        }

        current = resolved;

        setMedia(resolved);
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
      current?.revoke?.();
    };
  }, [messageId]);

  if (loading) {
    return (
      <div className="flex h-48 w-64 max-w-full items-center justify-center rounded-2xl bg-black/10 dark:bg-black/20">
        <LoaderCircle size={24} className="animate-spin opacity-70" />
      </div>
    );
  }

  if (failed || !media) {
    return (
      <div className="flex h-32 w-64 max-w-full flex-col items-center justify-center gap-2 rounded-2xl bg-black/10 text-xs opacity-70 dark:bg-black/20">
        <ImageOff size={24} />
        <span>No se pudo cargar la imagen</span>
      </div>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-2xl"
    >
      <img
        src={media.url}
        alt={alt}
        className="max-h-80 w-auto max-w-full rounded-2xl object-contain"
      />
    </a>
  );
}
