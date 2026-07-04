import { randomUUID } from "node:crypto";
import cloudbase from "@cloudbase/node-sdk";
import type {
  PrivateFileStorage,
  PrivateFileStorageError as PrivateFileStorageErrorType,
  SavePrivateFileInput,
  StoredFile,
} from "./types";
import { PrivateFileStorageError } from "./types";

const PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;
const PAYMENT_QR_OWNER_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;
const CLOUD_PATH_PATTERN =
  /^(private\/tutor-verification\/([A-Za-z0-9_-]{1,191})\/([A-Za-z0-9_-]+)\.(jpg|jpeg|png|webp)|private\/payment-qrcodes\/(platform|tutor)\/([A-Za-z0-9_-]{1,191})\/(WECHAT|ALIPAY)\/([A-Za-z0-9_-]+)\.(jpg|jpeg|png|webp))$/;

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

function isMissingCredentialError(error: unknown) {
  const code = String((error as { code?: unknown })?.code ?? "");
  const message = String((error as { message?: unknown })?.message ?? "");
  return (
    /missing secretId or secretKey/i.test(message) &&
    (!code || code === "INVALID_PARAM")
  );
}

function storageError(code: PrivateFileStorageErrorType["code"]) {
  return new PrivateFileStorageError(code);
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

export function buildCloudPaymentQrPath(
  scope: {
    ownerType: "platform" | "tutor";
    ownerId: string;
    qrType: "WECHAT" | "ALIPAY";
  },
  extension: SavePrivateFileInput["extension"],
  uuid: () => string = randomUUID,
) {
  if (!PAYMENT_QR_OWNER_ID_PATTERN.test(scope.ownerId)) {
    throw new Error("Invalid payment QR storage scope");
  }
  const generatedId = uuid();
  if (!/^[A-Za-z0-9_-]+$/.test(generatedId)) {
    throw new Error("Invalid generated storage identifier");
  }
  return `private/payment-qrcodes/${scope.ownerType}/${scope.ownerId}/${scope.qrType}/${generatedId}.${extension}`;
}

function buildCloudPath(
  input: SavePrivateFileInput,
  uuid: () => string = randomUUID,
) {
  if (input.scope?.kind === "payment-qr") {
    return buildCloudPaymentQrPath(input.scope, input.extension, uuid);
  }

  const tutorProfileId =
    input.scope?.kind === "tutor-verification"
      ? input.scope.tutorProfileId
      : input.tutorProfileId;
  if (!tutorProfileId) {
    throw new Error("Invalid tutor profile storage scope");
  }
  return buildCloudVerificationPath(tutorProfileId, input.extension, uuid);
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
      const cloudPath = buildCloudPath(input, uuid);
      try {
        const result = await client.uploadFile({
          cloudPath,
          fileContent: input.buffer,
        });
        parseCloudStorageKey(result.fileID);
        return result.fileID;
      } catch (error) {
        if (isMissingCredentialError(error)) {
          throw storageError("CLOUDBASE_CREDENTIALS_MISSING");
        }
        throw storageError("CLOUDBASE_UPLOAD_FAILED");
      }
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
        if (isMissingCredentialError(error)) {
          throw storageError("CLOUDBASE_CREDENTIALS_MISSING");
        }
        throw storageError("CLOUDBASE_READ_FAILED");
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
          if (isMissingCredentialError(error)) {
            throw storageError("CLOUDBASE_CREDENTIALS_MISSING");
          }
          throw storageError("CLOUDBASE_DELETE_FAILED");
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
  accessKey?: string;
}) {
  const app = cloudbase.init({
    env: options.envId,
    region: options.region,
    ...(options.accessKey ? { accessKey: options.accessKey } : {}),
  });
  return createCloudBasePrivateFileStorage({ client: app });
}
