import type { ReactNode } from "react";

/**
 * Every page opens the way the dashboard does: a large light title, a muted
 * line under it, and any page-level action at the far end.
 */
export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[40px] font-light leading-[1.1] tracking-tight sm:text-[52px]">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-muted-foreground sm:text-lg">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
