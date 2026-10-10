import { FileText, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  resolveChatMedia,
  type ResolvedChatMedia,
} from "../services/chat-media-access.service";

type PrivateChatFileProps = {
  messageId: string;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PrivateChatFile({ messageId }: PrivateChatFileProps) {
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
      <div className="flex min-h-14 min-w-56 items-center justify-center rounded-xl bg-black/10 px-4 dark:bg-black/20">
        <LoaderCircle size={20} className="animate-spin opacity-70" />
      </div>
    );
  }

  if (failed || !media) {
    return (
      <div className="flex min-h-14 min-w-56 items-center gap-3 rounded-xl bg-black/10 px-3 text-sm opacity-70 dark:bg-black/20">
        <FileText size={21} />
        <span>Archivo no disponible</span>
      </div>
    );
  }

  const name = media.access.originalName?.trim() || "Archivo adjunto";

  const size = formatBytes(media.access.sizeBytes);

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-56 max-w-72 items-center gap-3 rounded-xl bg-black/5 p-3 text-sm transition hover:bg-black/10 dark:bg-black/15"
    >
      <FileText size={22} className="shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{name}</span>

        {size && (
          <span className="mt-0.5 block text-[11px] opacity-65">{size}</span>
        )}
      </span>
    </a>
  );
}
