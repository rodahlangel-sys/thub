export type StoredFile = {
  key: string;
  buffer: Buffer;
};

export type PaymentQrStorageScope = {
  kind: "payment-qr";
  ownerType: "platform" | "tutor";
  ownerId: string;
  qrType: "WECHAT" | "ALIPAY";
};

export type TutorVerificationStorageScope = {
  kind: "tutor-verification";
  tutorProfileId: string;
};

export type SavePrivateFileInput = {
  buffer: Buffer;
  extension: "jpg" | "jpeg" | "png" | "webp";
} & (
  | {
      tutorProfileId: string;
      scope?: TutorVerificationStorageScope;
    }
  | {
      tutorProfileId?: string;
      scope: PaymentQrStorageScope;
    }
);

export type PrivateFileStorage = {
  save(input: SavePrivateFileInput): Promise<string>;
  read(storageKey: string): Promise<StoredFile | null>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
};

export class PrivateFileStorageError extends Error {
  constructor(
    public readonly code:
      | "CLOUDBASE_CREDENTIALS_MISSING"
      | "CLOUDBASE_UPLOAD_FAILED"
      | "CLOUDBASE_READ_FAILED"
      | "CLOUDBASE_DELETE_FAILED",
    message = code,
  ) {
    super(message);
    this.name = "PrivateFileStorageError";
  }
}

const privateFileStorageErrorCodes = new Set([
  "CLOUDBASE_CREDENTIALS_MISSING",
  "CLOUDBASE_UPLOAD_FAILED",
  "CLOUDBASE_READ_FAILED",
  "CLOUDBASE_DELETE_FAILED",
]);

export function isPrivateFileStorageError(
  error: unknown,
): error is PrivateFileStorageError {
  return (
    error instanceof PrivateFileStorageError ||
    (
      typeof error === "object" &&
      error !== null &&
      (error as { name?: unknown }).name === "PrivateFileStorageError" &&
      privateFileStorageErrorCodes.has(String((error as { code?: unknown }).code))
    )
  );
}
