import { getServerEnv } from "@/lib/env";
import { createLocalPrivateFileStorage } from "./local-storage";
import { createCloudBasePrivateFileStorageFromEnvironment } from "./cloudbase-storage";
import { createPrivateFileStorageRouter } from "./router";
import type { PrivateFileStorage } from "./types";

let configuredStorage: PrivateFileStorage | null = null;

function getPrivateFileStorage() {
  if (!configuredStorage) {
    const env = getServerEnv();
    const local = createLocalPrivateFileStorage(env.privateFileStorageRoot);
    let cloudStorage: PrivateFileStorage | null = null;
    const getCloudStorage = () => {
      cloudStorage ??= createCloudBasePrivateFileStorageFromEnvironment({
        envId: env.cloudbaseEnvId,
        region: env.cloudbaseRegion,
        accessKey: env.cloudbaseApiKey,
      });
      return cloudStorage;
    };
    const cloud: PrivateFileStorage = {
      save: (input) => getCloudStorage().save(input),
      read: (storageKey) => getCloudStorage().read(storageKey),
      delete: (storageKey) => getCloudStorage().delete(storageKey),
      exists: (storageKey) => getCloudStorage().exists(storageKey),
    };
    configuredStorage = createPrivateFileStorageRouter({
      activeProvider: env.storageProvider,
      local,
      cloud,
    });
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
export { isPrivateFileStorageError, PrivateFileStorageError } from "./types";
