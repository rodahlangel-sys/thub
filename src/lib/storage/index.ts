import { getServerEnv } from "@/lib/env";
import { createLocalPrivateFileStorage } from "./local-storage";
import type { PrivateFileStorage } from "./types";

let configuredStorage: PrivateFileStorage | null = null;

function getPrivateFileStorage() {
  if (!configuredStorage) {
    const env = getServerEnv();
    configuredStorage = createLocalPrivateFileStorage(env.privateFileStorageRoot);
  }

  return configuredStorage;
}

export const privateFileStorage: PrivateFileStorage = {
  save: (input) => getPrivateFileStorage().save(input),
  read: (storageKey) => getPrivateFileStorage().read(storageKey),
  delete: (storageKey) => getPrivateFileStorage().delete(storageKey),
  exists: (storageKey) => getPrivateFileStorage().exists(storageKey),
};

export type {
  PrivateFileStorage,
  SavePrivateFileInput,
  StoredFile,
} from "./types";
