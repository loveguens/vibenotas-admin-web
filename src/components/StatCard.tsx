import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  change?: string;
  positive?: boolean;
};

export default function StatCard({
  title,
  value,
  description,
  icon,
  change = "+0%",
  positive = true,
}: StatCardProps) {
  return (
    <article
      className="
        group relative overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        p-5
        shadow-xl shadow-slate-200/50
        backdrop-blur-xl
        transition duration-300

        hover:-translate-y-1
        hover:border-violet-300
        hover:shadow-violet-200/40

        dark:border-white/10
        dark:bg-[#1E293B]/80
        dark:shadow-black/10
        dark:hover:border-violet-400/30
        dark:hover:shadow-violet-950/30
      "
    >
      <div
        className="
          absolute -right-10 -top-10
          h-28 w-28
          rounded-full
          bg-violet-200/50
          blur-2xl
          transition

          group-hover:bg-violet-300/60

          dark:bg-violet-500/10
          dark:group-hover:bg-violet-500/20
        "
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="
              text-sm font-medium
              text-slate-600
              dark:text-slate-400
            "
          >
            {title}
          </p>

          <h3
            className="
              mt-3
              text-3xl font-bold
              tracking-tight
              text-slate-950
              dark:text-white
            "
          >
            {value}
          </h3>

          <p
            className="
              mt-2
              text-sm
              text-slate-500
              dark:text-slate-500
            "
          >
            {description}
          </p>
        </div>

        <div
          className="
            shrink-0
            rounded-2xl
            border border-violet-200
            bg-violet-100
            p-3
            text-violet-700
            shadow-lg shadow-violet-100/60

            dark:border-violet-400/20
            dark:bg-violet-500/10
            dark:text-violet-300
            dark:shadow-violet-950/20
          "
        >
          {icon}
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4">
        <span
          className={`
            inline-flex items-center gap-1
            rounded-full
            px-2.5 py-1
            text-xs font-semibold
            ${
              positive
                ? `
                  bg-emerald-100
                  text-emerald-700
                  dark:bg-emerald-500/10
                  dark:text-emerald-400
                `
                : `
                  bg-red-100
                  text-red-700
                  dark:bg-red-500/10
                  dark:text-red-400
                `
            }
          `}
        >
          <TrendingUp
            size={13}
            className={!positive ? "rotate-180" : ""}
          />
          {change}
        </span>

        <div
          className="
            flex h-7
            items-end gap-1
            opacity-80
            dark:opacity-100
          "
          aria-hidden="true"
        >
          <span className="h-2 w-1 rounded-full bg-violet-300 dark:bg-violet-500/40" />
          <span className="h-4 w-1 rounded-full bg-violet-400 dark:bg-violet-500/50" />
          <span className="h-3 w-1 rounded-full bg-violet-500 dark:bg-violet-500/70" />
          <span className="h-6 w-1 rounded-full bg-violet-600 dark:bg-violet-400" />
          <span className="h-5 w-1 rounded-full bg-violet-400 dark:bg-violet-300" />
        </div>
      </div>
    </article>
  );
}