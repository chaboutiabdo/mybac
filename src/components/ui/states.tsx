import { Loader2, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * One loading, empty and error treatment for the whole app.
 *
 * These replace ~35 ad-hoc blocks: the spinner
 * `<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">`
 * was copy-pasted 17 times across 15 files, and every empty state was a bare
 * `<p className="text-muted-foreground">` with no icon and no way forward.
 */

export function Loading({
  label = "جارٍ التحميل…",
  className,
  full = false,
}: {
  label?: string
  className?: string
  full?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        full ? "min-h-[60vh]" : "py-12",
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-14 text-center",
        className
      )}
    >
      {Icon ? (
        <Icon className="mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.4} aria-hidden />
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = "تعذّر تحميل البيانات",
  description = "تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.",
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-destructive/25 bg-destructive-light px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-destructive/80">{description}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          أعد المحاولة
        </Button>
      ) : null}
    </div>
  )
}
