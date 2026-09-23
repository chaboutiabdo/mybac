import { Atom, BookOpen, Briefcase, Cog, FlaskConical, Globe, LayoutGrid, Sigma } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { STREAMS, SUBJECTS, TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

export interface PillOption {
  value: string;
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

const STREAM_ICONS: Record<string, LucideIcon> = {
  "Sciences Expérimentales": FlaskConical,
  "Mathématiques": Sigma,
  "Technique Mathématiques": Cog,
  "Gestion Économie": Briefcase,
  "Lettres et Philosophie": BookOpen,
  "Langues Étrangères": Globe,
};

export const STREAM_OPTIONS: PillOption[] = STREAMS.map((s) => ({ ...s, icon: STREAM_ICONS[s.value] }));

/** Only maths and physics have content, so only they get a filter. */
export const SUBJECT_OPTIONS: PillOption[] = SUBJECTS.filter((s) => s.value === "Math" || s.value === "Physics").map(
  (s) => ({ ...s, icon: s.value === "Math" ? Sigma : Atom })
);

const pill = (active: boolean) =>
  cn(
    "flex h-12 shrink-0 items-center gap-2.5 rounded-full pe-5 ps-2 text-[15px] transition-colors",
    active ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card-raised"
  );

/**
 * The mockup's filter pills: "الكل" and one pill per option, each wearing its
 * tone. `null` means all. Without `onChange` they are a static showcase (the
 * landing page).
 */
export default function FilterPills({
  options,
  value = null,
  onChange,
  label,
  wrap = false,
}: {
  options: PillOption[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  label: string;
  /** wrap onto more lines instead of scrolling: for narrow cards, where a clipped pill looks missing */
  wrap?: boolean;
}) {
  const Tag = onChange ? "button" : "span";

  return (
    <div
      className={cn("flex gap-3", wrap ? "flex-wrap" : "no-scrollbar -mx-1 overflow-x-auto px-1 pb-1")}
      role="group"
      aria-label={label}
    >
      <Tag
        {...(onChange && { type: "button" as const, "aria-pressed": value === null, onClick: () => onChange(null) })}
        className={pill(value === null)}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            value === null ? "bg-primary-foreground/15" : "bg-muted"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
        الكل
      </Tag>

      {options.map((o) => {
        const active = value === o.value;
        return (
          <Tag
            key={o.value}
            {...(onChange && {
              type: "button" as const,
              "aria-pressed": active,
              onClick: () => onChange(active ? null : o.value),
            })}
            className={pill(active)}
          >
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-foreground", TONE_BG[o.tone])}>
              <o.icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            {o.label}
          </Tag>
        );
      })}
    </div>
  );
}
