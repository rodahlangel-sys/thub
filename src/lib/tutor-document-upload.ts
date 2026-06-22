import type { PrivateFileStorage, SavePrivateFileInput } from "./storage";

export async function persistTutorDocumentUpload(options: {
  storage: PrivateFileStorage;
  input: SavePrivateFileInput;
  oldStorageKeys: string[];
  commit: (newStorageKey: string) => Promise<void>;
  onCleanupError?: (error: unknown) => void;
}) {
  const newStorageKey = await options.storage.save(options.input);
  try {
    await options.commit(newStorageKey);
  } catch (error) {
    try {
      await options.storage.delete(newStorageKey);
    } catch {
      // Preserve the database error; the new object is unreferenced and can be audited.
    }
    throw error;
  }

  for (const oldStorageKey of options.oldStorageKeys) {
    try {
      await options.storage.delete(oldStorageKey);
    } catch (error) {
      options.onCleanupError?.(error);
    }
  }
  return newStorageKey;
}
