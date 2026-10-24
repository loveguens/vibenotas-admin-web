import { LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import {
  resolveChatMedia,
  type ResolvedChatMedia,
} from "../services/chat-media-access.service";

type PrivateChatAudioProps = {
  messageId: string;
};

export function PrivateChatAudio({ messageId }: PrivateChatAudioProps) {
  return <PrivateChatAudioContent key={messageId} messageId={messageId} />;
}

function PrivateChatAudioContent({ messageId }: PrivateChatAudioProps) {
  const [media, setMedia] = useState<ResolvedChatMedia | null>(null);

  const [loading, setLoading] = useState(true);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    let current: ResolvedChatMedia | null = null;

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
      <div className="flex min-h-12 min-w-56 items-center justify-center rounded-2xl bg-black/10 px-4 dark:bg-black/20">
        <LoaderCircle size={20} className="animate-spin opacity-70" />
      </div>
    );
  }

  if (failed || !media) {
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
        src={media.url}
        className="h-10 w-56 max-w-full"
      />
    </div>
  );
}
