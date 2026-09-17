import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Message from an unknown thrown value.
 *
 * Under `strict`, a caught value is `unknown`, so `error.message` is not
 * reachable without narrowing. This replaces the `catch (error: any)` casts
 * that used to be spread across the toast handlers.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return fallback
}
