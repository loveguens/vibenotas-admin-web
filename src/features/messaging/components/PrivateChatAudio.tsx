import { LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import api from "../../../services/api";

type PrivateChatAudioProps = {
  messageId: string;
};

export function PrivateChatAudio({ messageId }: PrivateChatAudioProps) {
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
      .get<Blob>(`/chat/messages/${messageId}/audio`, {
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
      <div className="flex min-h-12 min-w-56 items-center justify-center rounded-2xl bg-black/10 px-4 dark:bg-black/20">
        <LoaderCircle size={20} className="animate-spin opacity-70" />
      </div>
    );
  }

  if (failed || !objectUrl) {
    return (
      <div className="flex min-h-12 min-w-56 items-center gap-2 rounded-2xl bg-black/10 px-4 text-xs opacity-70 dark:bg-black/20">
        <VolumeX size={18} />
        <span>Audio no disponible</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-56 items-center gap-2 rounded-2xl bg-black/5 p-2 dark:bg-black/15">
      <Volume2 size={18} className="shrink-0" />

      <audio
        controls
        preload="metadata"
        src={objectUrl}
        className="h-10 w-56 max-w-full"
      />
    </div>
  );
}
