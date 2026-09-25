import { supabase } from "@/integrations/supabase/client";

/**
 * Opens an exam or correction PDF in a new tab. Stored papers are paths in the
 * `documents` bucket, opened through a one-hour signed URL; a few older rows
 * hold a full link. Throws when no link could be made. Shared by the exams
 * list and the AI solution page.
 */
export async function openStoredFile(path: string): Promise<void> {
  if (path.startsWith("http")) {
    window.open(path, "_blank", "noopener,noreferrer");
    return;
  }
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  if (!data?.signedUrl) throw new Error("Failed to get signed URL");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
