import * as FileSystem from 'expo-file-system/legacy';

/**
 * The custom background lives in Documents/backgrounds/. Only the relative
 * path is stored, because iOS can move the app container on update and an
 * absolute file:// URI would then point at nothing.
 */
export const BACKGROUNDS_DIR = 'backgrounds/';

/** Turn whatever is stored (relative, or a legacy absolute URI) into a URI that loads today. */
export function resolveBackgroundUri(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const root = FileSystem.documentDirectory;
  if (!root) return stored;
  if (!stored.includes('://')) return root + stored;
  // Legacy absolute path: keep the part under Documents/ and rejoin it.
  const i = stored.indexOf(BACKGROUNDS_DIR);
  return i >= 0 ? root + stored.slice(i) : stored;
}

/** Relative path for a freshly picked photo. Unique, so the image cache can't show the old one. */
export function newBackgroundPath(extension: string): string {
  return `${BACKGROUNDS_DIR}bg-${Date.now()}.${extension}`;
}

/** Remove a previously stored background file, if any. Never throws. */
export async function deleteBackgroundFile(stored: string | null | undefined) {
  const uri = resolveBackgroundUri(stored);
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Already gone, or not ours to delete.
  }
}
