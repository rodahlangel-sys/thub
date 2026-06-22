import type { PrivateFileStorage } from "./types";

export function createPrivateFileStorageRouter(options: {
  activeProvider: "LOCAL" | "PERSISTENT_FILESYSTEM" | "CLOUDBASE";
  local: PrivateFileStorage;
  cloud: PrivateFileStorage;
}): PrivateFileStorage {
  const providerForKey = (storageKey: string) =>
    storageKey.startsWith("cloud://") ? options.cloud : options.local;
  const active =
    options.activeProvider === "CLOUDBASE" ? options.cloud : options.local;
  return {
    save: (input) => active.save(input),
    read: (storageKey) => providerForKey(storageKey).read(storageKey),
    delete: (storageKey) => providerForKey(storageKey).delete(storageKey),
    exists: (storageKey) => providerForKey(storageKey).exists(storageKey),
  };
}
