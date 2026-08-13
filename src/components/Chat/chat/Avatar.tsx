import { Users } from "lucide-react";
import { getInitials } from "../features/utils";

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
  sm: "h-9 w-9 rounded-xl text-xs",
  md: "h-11 w-11 rounded-2xl text-sm",
  lg: "h-14 w-14 rounded-2xl text-base",
  xl: "h-20 w-20 rounded-[26px] text-xl",
};

const groupIconSizes: Record<AvatarSize, number> = {
  sm: 17,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Avatar({
  name,
  src,
  size = "md",
  group = false,
  online = false,
  className = "",
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (group) {
    return (
      <div
        className={`${sizeClass} ${className} flex shrink-0 items-center justify-center bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20`}
        aria-label={name ?? "Grupo"}
        title={name ?? "Grupo"}
      >
        <Users size={groupIconSizes[size]} />
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name ?? "Usuario"}
          className={`${sizeClass} border border-slate-700 object-cover`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          className={`${sizeClass} flex items-center justify-center bg-violet-500/15 font-bold text-violet-300 ring-1 ring-violet-400/20`}
          aria-label={name ?? "Usuario"}
          title={name ?? "Usuario"}
        >
          {getInitials(name)}
        </div>
      )}

      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400"
          title="En línea"
        />
      )}
    </div>
  );
}