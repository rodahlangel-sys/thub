import { randomUUID } from "node:crypto";
import { init } from "@cloudbase/node-sdk";
import type {
  PrivateFileStorage,
  SavePrivateFileInput,
  StoredFile,
} from "./types";

const PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;
const CLOUD_PATH_PATTERN =
  /^private\/tutor-verification\/([A-Za-z0-9_-]{1,191})\/([A-Za-z0-9_-]+)\.(jpg|jpeg|png|webp)$/;

export type CloudBaseStorageClient = {
  uploadFile(input: { cloudPath: string; fileContent: Buffer }): Promise<{ fileID: string }>;
  downloadFile(input: { fileID: string }): Promise<{ fileContent?: string | Buffer }>;
  deleteFile(input: { fileList: string[] }): Promise<{
    fileList: Array<{ fileID: string; code: string }>;
  }>;
};

function isNotFoundError(error: unknown) {
  const code = String((error as { code?: unknown })?.code ?? "");
  return /NOT.?EXIST|NON.?EXIST|NOT.?FOUND|NO.?SUCH/i.test(code);
}

export function buildCloudVerificationPath(
  tutorProfileId: string,
  extension: SavePrivateFileInput["extension"],
  uuid: () => string = randomUUID,
) {
  if (!PROFILE_ID_PATTERN.test(tutorProfileId)) {
    throw new Error("Invalid tutor profile storage scope");
  }
  const generatedId = uuid();
  if (!/^[A-Za-z0-9_-]+$/.test(generatedId)) {
    throw new Error("Invalid generated storage identifier");
  }
  return `private/tutor-verification/${tutorProfileId}/${generatedId}.${extension}`;
}

export function parseCloudStorageKey(storageKey: string) {
  let parsed: URL;
  try {
    parsed = new URL(storageKey);
  } catch {
    throw new Error("Invalid CloudBase storage key");
  }
  const cloudPath = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (
    parsed.protocol !== "cloud:" ||
    !parsed.hostname ||
    parsed.search ||
    parsed.hash ||
    !CLOUD_PATH_PATTERN.test(cloudPath)
  ) {
    throw new Error("Invalid CloudBase storage key");
  }
  return { cloudPath };
}

export function createCloudBasePrivateFileStorage(options: {
  client: CloudBaseStorageClient;
  uuid?: () => string;
}): PrivateFileStorage {
  const { client, uuid = randomUUID } = options;
  return {
    async save(input) {
      const cloudPath = buildCloudVerificationPath(
        input.tutorProfileId,
        input.extension,
        uuid,
      );
      const result = await client.uploadFile({
        cloudPath,
        fileContent: input.buffer,
      });
      parseCloudStorageKey(result.fileID);
      return result.fileID;
    },

    async read(storageKey): Promise<StoredFile | null> {
      parseCloudStorageKey(storageKey);
      try {
        const result = await client.downloadFile({ fileID: storageKey });
        if (result.fileContent === undefined) return null;
        const buffer = Buffer.isBuffer(result.fileContent)
          ? result.fileContent
          : Buffer.from(result.fileContent);
        return { key: storageKey, buffer };
      } catch (error) {
        if (isNotFoundError(error)) return null;
        throw new Error("CloudBase private file read failed");
      }
    },

    async delete(storageKey) {
      parseCloudStorageKey(storageKey);
      try {
        const result = await client.deleteFile({ fileList: [storageKey] });
        const code = result.fileList[0]?.code;
        if (code && code !== "SUCCESS" && code !== "0") {
          throw new Error("DELETE_FAILED");
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw new Error("CloudBase private file delete failed");
        }
      }
    },

    async exists(storageKey) {
      return (await this.read(storageKey)) !== null;
    },
  };
}

export function createCloudBasePrivateFileStorageFromEnvironment(options: {
  envId: string;
  region: string;
}) {
  const app = init({ env: options.envId, region: options.region });
  return createCloudBasePrivateFileStorage({ client: app });
}
