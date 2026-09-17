import {
  CalendarClock,
  Camera,
  ImageIcon,
  Mic,
  Paperclip,
  Pause,
  Play,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { Message } from "../types/chat.types";

type ChatComposerProps = {
  value: string;
  replyTo: Message | null;
  sending: boolean;
  sendClass: string;

  onChange: (value: string) => void;
  onCancelReply: () => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  onSendImage: (file: File) => Promise<void>;

  onSendAudio: (audio: Blob, durationMs: number) => Promise<void>;

  onSchedule: (scheduledFor: string) => Promise<void>;
};

const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const CHAT_AUDIO_MAX_BYTES = 20 * 1024 * 1024;

const CHAT_AUDIO_MAX_DURATION_MS = 10 * 60 * 1000;

const CHAT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getMinimumDateTime(): string {
  const now = new Date();

  now.setMinutes(now.getMinutes() + 1);

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");

  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function autoCapitalizeMessage(value: string): string {
  return value.replace(
    /(^|[.!?]\s+|\n\s*)([a-záéíóúñü])/gu,
    (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`,
  );
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];

  return candidates.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  );
}

function normalizeAudioMimeType(mimeType: string): string | null {
  const value = mimeType.split(";")[0].trim().toLowerCase();

  if (
    value === "audio/webm" ||
    value === "audio/ogg" ||
    value === "audio/mp4" ||
    value === "audio/wav" ||
    value === "audio/mpeg"
  ) {
    return value;
  }

  if (value === "audio/x-m4a" || value === "audio/m4a") {
    return "audio/mp4";
  }

  if (
    value === "audio/x-wav" ||
    value === "audio/wave" ||
    value === "audio/vnd.wave"
  ) {
    return "audio/wav";
  }

  if (value === "audio/mp3") {
    return "audio/mpeg";
  }

  return null;
}

async function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);

    const audio = new Audio();

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();

      URL.revokeObjectURL(url);
    };

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : 1;

      cleanup();

      resolve(Math.max(1, duration));
    };

    audio.onerror = () => {
      cleanup();
      resolve(1);
    };

    audio.src = url;
  });
}

export function ChatComposer({
  value,
  replyTo,
  sending,
  sendClass,
  onChange,
  onCancelReply,
  onSubmit,
  onSendImage,
  onSendAudio,
  onSchedule,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const startedAtRef = useRef(0);

  const pausedAtRef = useRef<number | null>(null);

  const pausedTotalRef = useRef(0);

  const cancelRecordingRef = useRef(false);

  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [imageError, setImageError] = useState("");

  const [recording, setRecording] = useState(false);

  const [recordingPaused, setRecordingPaused] = useState(false);

  const [recordingDuration, setRecordingDuration] = useState(0);

  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

  const [recordedDuration, setRecordedDuration] = useState(0);

  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const [audioError, setAudioError] = useState("");

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const [scheduledFor, setScheduledFor] = useState(getMinimumDateTime());

  const [scheduling, setScheduling] = useState(false);

  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";

    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedImage);

    setImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedImage]);

  useEffect(() => {
    if (!recordedAudio) {
      setAudioPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(recordedAudio);

    setAudioPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recordedAudio]);

  useEffect(() => {
    if (!recording) {
      return;
    }

    const timer = window.setInterval(() => {
      if (recordingPaused) {
        return;
      }

      const elapsed =
        Date.now() - startedAtRef.current - pausedTotalRef.current;

      setRecordingDuration(Math.max(0, elapsed));

      if (elapsed >= CHAT_AUDIO_MAX_DURATION_MS) {
        const recorder = recorderRef.current;

        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [recording, recordingPaused]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;

        recorder.onstop = null;

        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopStream(): void {
    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;
  }

  function clearAudio(): void {
    setRecordedAudio(null);
    setRecordedDuration(0);
    setRecordingDuration(0);
    setAudioError("");
  }

  function chooseImage(file?: File): void {
    if (!file) {
      return;
    }

    setImageError("");

    if (!CHAT_IMAGE_TYPES.has(file.type)) {
      setImageError("Solo se permiten imágenes JPG, PNG o WEBP.");

      return;
    }

    if (file.size <= 0 || file.size > CHAT_IMAGE_MAX_BYTES) {
      setImageError("La imagen no puede superar los 10 MB.");

      return;
    }

    clearAudio();

    setSelectedImage(file);
    setAttachmentMenuOpen(false);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];

    event.target.value = "";

    chooseImage(file);
  }

  function removeSelectedImage(): void {
    if (sending) {
      return;
    }

    setSelectedImage(null);
    setImageError("");
  }

  async function startRecording(): Promise<void> {
    if (recording || sending) {
      return;
    }

    setAudioError("");
    setAttachmentMenuOpen(false);

    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      audioInputRef.current?.click();

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true,
        },
      });

      const mimeType = getRecorderMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      setSelectedImage(null);

      clearAudio();

      streamRef.current = stream;

      recorderRef.current = recorder;

      chunksRef.current = [];

      startedAtRef.current = Date.now();

      pausedAtRef.current = null;

      pausedTotalRef.current = 0;

      cancelRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopStream();

        recorderRef.current = null;

        chunksRef.current = [];

        setRecording(false);

        setRecordingPaused(false);

        setAudioError("Ocurrió un error durante la grabación.");
      };

      recorder.onstop = () => {
        if (pausedAtRef.current) {
          pausedTotalRef.current += Date.now() - pausedAtRef.current;

          pausedAtRef.current = null;
        }

        const duration = Math.max(
          1,
          Math.min(
            CHAT_AUDIO_MAX_DURATION_MS,

            Date.now() - startedAtRef.current - pausedTotalRef.current,
          ),
        );

        const wasCancelled = cancelRecordingRef.current;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });

        stopStream();

        recorderRef.current = null;

        chunksRef.current = [];

        setRecording(false);

        setRecordingPaused(false);

        if (wasCancelled) {
          setRecordingDuration(0);
          return;
        }

        if (blob.size <= 0) {
          setAudioError("No se pudo obtener audio de la grabación.");

          return;
        }

        if (blob.size > CHAT_AUDIO_MAX_BYTES) {
          setAudioError("La nota de voz no puede superar los 20 MB.");

          return;
        }

        setRecordedAudio(blob);

        setRecordedDuration(duration);

        setRecordingDuration(duration);
      };

      setRecordingDuration(0);

      setRecording(true);

      setRecordingPaused(false);

      recorder.start(250);
    } catch {
      stopStream();

      setAudioError(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador.",
      );
    }
  }

  function stopRecording(): void {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  }

  function toggleRecordingPause(): void {
    const recorder = recorderRef.current;

    if (!recorder) {
      return;
    }

    if (recorder.state === "recording") {
      recorder.pause();

      pausedAtRef.current = Date.now();

      setRecordingPaused(true);

      return;
    }

    if (recorder.state === "paused") {
      if (pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
      }

      pausedAtRef.current = null;

      recorder.resume();

      setRecordingPaused(false);
    }
  }

  function cancelCurrentRecording(): void {
    const recorder = recorderRef.current;

    cancelRecordingRef.current = true;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopStream();

      setRecording(false);

      setRecordingPaused(false);

      setRecordingDuration(0);
    }
  }

  async function handleAudioFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setAudioError("");

    if (file.size <= 0 || file.size > CHAT_AUDIO_MAX_BYTES) {
      setAudioError("El audio no puede superar los 20 MB.");

      return;
    }

    const normalizedMime = normalizeAudioMimeType(file.type);

    if (!normalizedMime) {
      setAudioError("El formato de audio no es compatible.");

      return;
    }

    const normalizedFile = new Blob([file], {
      type: normalizedMime,
    });

    const duration = await readAudioDuration(normalizedFile);

    if (duration > CHAT_AUDIO_MAX_DURATION_MS) {
      setAudioError("La nota de voz no puede superar los 10 minutos.");

      return;
    }

    setSelectedImage(null);

    setRecordedAudio(normalizedFile);

    setRecordedDuration(duration);

    setRecordingDuration(duration);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (recording || sending) {
      return;
    }

    if (!value.trim() && !selectedImage && !recordedAudio) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    if (recording) {
      event.preventDefault();
      return;
    }

    if (recordedAudio) {
      event.preventDefault();

      if (sending) {
        return;
      }

      try {
        setAudioError("");

        await onSendAudio(recordedAudio, Math.max(1, recordedDuration));

        clearAudio();
      } catch {
        setAudioError("No se pudo enviar la nota de voz.");
      }

      return;
    }

    if (selectedImage) {
      event.preventDefault();

      if (sending) {
        return;
      }

      try {
        setImageError("");

        await onSendImage(selectedImage);

        setSelectedImage(null);

        setAttachmentMenuOpen(false);
      } catch {
        setImageError("No se pudo enviar la imagen.");
      }

      return;
    }

    onSubmit(event);
  }

  function openScheduleModal(): void {
    if (selectedImage || recordedAudio || recording) {
      return;
    }

    if (!value.trim()) {
      setScheduleError("Escribe un mensaje antes de programarlo.");

      setIsScheduleOpen(true);

      return;
    }

    setScheduleError("");

    setScheduledFor(getMinimumDateTime());

    setIsScheduleOpen(true);
  }

  function closeScheduleModal(): void {
    if (scheduling) {
      return;
    }

    setIsScheduleOpen(false);

    setScheduleError("");
  }

  async function handleSchedule(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!value.trim()) {
      setScheduleError("Escribe un mensaje antes de programarlo.");

      return;
    }

    if (!scheduledFor) {
      setScheduleError("Selecciona una fecha y hora.");

      return;
    }

    const selectedDate = new Date(scheduledFor);

    if (Number.isNaN(selectedDate.getTime())) {
      setScheduleError("Selecciona una fecha válida.");

      return;
    }

    if (selectedDate <= new Date()) {
      setScheduleError("La fecha programada debe ser futura.");

      return;
    }

    try {
      setScheduling(true);

      setScheduleError("");

      await onSchedule(selectedDate.toISOString());

      onChange("");

      setIsScheduleOpen(false);

      setScheduledFor(getMinimumDateTime());
    } catch {
      setScheduleError("No se pudo programar el mensaje.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1526]/95 sm:px-5"
      >
        {replyTo && (
          <div className="mx-auto mb-2.5 flex max-w-3xl items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-400/20 dark:bg-violet-500/10">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-violet-700 dark:text-violet-300">
                Respondiendo a {replyTo.emisor_nombre}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {replyTo.contenido}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancelReply}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {selectedImage && imagePreviewUrl && (
          <div className="mx-auto mb-2.5 max-w-3xl">
            <div className="relative inline-block max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-1.5 dark:border-white/10 dark:bg-white/5">
              <img
                src={imagePreviewUrl}
                alt="Vista previa"
                className="max-h-52 max-w-full rounded-xl object-contain"
              />

              <button
                type="button"
                onClick={removeSelectedImage}
                disabled={sending}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur"
              >
                <X size={16} />
              </button>

              <p className="max-w-72 truncate px-2 pb-1 pt-2 text-xs text-slate-500 dark:text-slate-400">
                {selectedImage.name || "Foto"}
              </p>
            </div>
          </div>
        )}

        {recording && (
          <div className="mx-auto mb-2.5 flex max-w-3xl items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-red-600 dark:text-red-300">
                {recordingPaused ? "Grabación pausada" : "Grabando nota de voz"}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDuration(recordingDuration)} / 10:00
              </p>
            </div>

            <button
              type="button"
              onClick={toggleRecordingPause}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-white/10 dark:text-white"
              title={recordingPaused ? "Continuar" : "Pausar"}
            >
              {recordingPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
              title="Detener"
            >
              <Square size={14} fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={cancelCurrentRecording}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-100 dark:hover:bg-red-500/10"
              title="Cancelar"
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}

        {recordedAudio && audioPreviewUrl && !recording && (
          <div className="mx-auto mb-2.5 max-w-3xl rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/20 dark:bg-violet-500/10">
            <div className="flex items-center gap-3">
              <Mic
                size={18}
                className="shrink-0 text-violet-600 dark:text-violet-300"
              />

              <audio
                controls
                preload="metadata"
                src={audioPreviewUrl}
                className="h-10 min-w-0 flex-1"
              />

              <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                {formatDuration(recordedDuration)}
              </span>

              <button
                type="button"
                onClick={clearAudio}
                disabled={sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-100 dark:hover:bg-red-500/10"
                title="Eliminar grabación"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        )}

        {(imageError || audioError) && (
          <p className="mx-auto mb-2 max-w-3xl px-2 text-sm text-red-500">
            {imageError || audioError}
          </p>
        )}

        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/5 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-violet-400/30 dark:focus-within:bg-white/[0.06]">
          <div className="relative">
            <button
              type="button"
              disabled={sending || recording}
              onClick={() => setAttachmentMenuOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-violet-600 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-violet-300"
              title="Adjuntar"
            >
              <Paperclip size={18} />
            </button>

            {attachmentMenuOpen && (
              <div className="absolute bottom-12 left-0 z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#172033]">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                >
                  <ImageIcon size={17} />
                  Galería
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                >
                  <Camera size={17} />
                  Cámara
                </button>
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              capture
              onChange={(event) => void handleAudioFile(event)}
              className="hidden"
            />
          </div>

          <button
            type="button"
            disabled={
              sending || recording || Boolean(selectedImage || recordedAudio)
            }
            onClick={openScheduleModal}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-violet-600 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-violet-300"
            title="Programar mensaje"
          >
            <CalendarClock size={18} />
          </button>

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={sending || recording}
              maxLength={5000}
              onChange={(event) =>
                onChange(autoCapitalizeMessage(event.target.value))
              }
              onKeyDown={handleKeyDown}
              placeholder={
                recordedAudio
                  ? "Comentario opcional..."
                  : selectedImage
                    ? "Escribe un comentario..."
                    : "Escribe un mensaje..."
              }
              className="max-h-[120px] min-h-10 w-full resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {!value.trim() && !selectedImage && !recordedAudio ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => void startRecording()}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${sendClass}`}
              title="Grabar nota de voz"
            >
              <Mic size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={sending || recording}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${sendClass}`}
              aria-label={sending ? "Enviando" : "Enviar"}
            >
              <Send size={17} className={sending ? "animate-pulse" : ""} />
            </button>
          )}
        </div>

        <div className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between px-2">
          <p className="hidden text-[9px] text-slate-400 sm:block">
            Enter para enviar · Shift + Enter para nueva línea
          </p>

          <span className="ml-auto text-[9px] text-slate-400">
            {value.length}/5000
          </span>
        </div>
      </form>

      {isScheduleOpen && (
        <div className="fixed inset-0 z-[10120] flex items-end bg-slate-950/35 p-0 backdrop-blur-sm dark:bg-slate-950/75 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            onClick={closeScheduleModal}
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar programación"
          />

          <section className="relative w-full rounded-t-[30px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827] sm:max-w-md sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarClock size={21} />
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                  Programar mensaje
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Se enviará automáticamente en la fecha elegida.
                </p>
              </div>

              <button
                type="button"
                onClick={closeScheduleModal}
                disabled={scheduling}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="mt-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Fecha y hora de envío
              </label>

              <input
                type="datetime-local"
                value={scheduledFor}
                min={getMinimumDateTime()}
                disabled={scheduling}
                onChange={(event) => {
                  setScheduledFor(event.target.value);

                  setScheduleError("");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-violet-600 dark:text-violet-300">
                  Mensaje a programar
                </p>

                <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                  {value || "Aún no escribiste un mensaje."}
                </p>
              </div>

              {scheduleError && (
                <p className="mt-3 text-sm text-red-500">{scheduleError}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  disabled={scheduling}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!value.trim() || scheduling}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {scheduling ? "Programando..." : "Programar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
