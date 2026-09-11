import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getInitials } from "../utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: AvatarSize;
  group?: boolean;
  online?: boolean;
  className?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const groupIconSizes: Record<AvatarSize, number> = {
  sm: 17,
  md: 20,
  lg: 24,
  xl: 32,
};

function resolveAvatarUrl(value?: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  const apiBase = String(
    import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  )
    .trim()
    .replace(/\/+$/, "");

  const relativePath = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;

  return `${apiBase}${relativePath}`;
}

export function Avatar({
  name,
  src,
  size = "md",
  group = false,
  online = false,
  className = "",
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  const resolvedSrc = useMemo(() => resolveAvatarUrl(src), [src]);

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !imageFailed;

  if (group) {
    if (showImage) {
      return (
        <img
          src={resolvedSrc ?? undefined}
          alt={name ?? "Grupo"}
          onError={() => setImageFailed(true)}
          className={`${sizeClass} ${className} shrink-0 rounded-full border border-slate-200 object-cover dark:border-white/10`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} ${className} flex shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20`}
        title={name ?? "Grupo"}
      >
        <Users size={groupIconSizes[size]} />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={resolvedSrc ?? undefined}
          alt={name ?? "Usuario"}
          onError={() => setImageFailed(true)}
          className={`${sizeClass} rounded-full border border-slate-200 object-cover dark:border-white/10`}
        />
      ) : (
        <div
          className={`${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 font-black text-violet-600 ring-1 ring-violet-200 dark:from-violet-500/15 dark:to-fuchsia-500/10 dark:text-violet-300 dark:ring-violet-400/20`}
          title={name ?? "Usuario"}
        >
          {getInitials(name)}
        </div>
      )}

      {online && (
        <span
          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500 dark:border-[#0d1526]"
          title="En l?nea"
        />
      )}
    </div>
  );
}
