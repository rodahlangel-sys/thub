import type { PrivateFileStorage, SavePrivateFileInput } from "@/lib/storage";

export const MAX_PRIVATE_IMAGE_BYTES = 5 * 1024 * 1024;

export type ValidatedPrivateImageFile = {
  buffer: Buffer;
  extension: "jpg" | "jpeg" | "png" | "webp";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalName: string;
  sizeBytes: number;
};

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const extensionByMimeType: Record<
  ValidatedPrivateImageFile["mimeType"],
  Array<ValidatedPrivateImageFile["extension"]>
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

function getExtension(fileName: string) {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match?.[1] ?? "";
}

function detectImageMimeType(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function validatePrivateImageFile(
  file: FormDataEntryValue | null,
): Promise<ValidatedPrivateImageFile> {
  if (!(file instanceof File)) {
    throw new Error("请选择要上传的图片。");
  }

  if (file.size <= 0) {
    throw new Error("图片内容无法识别，请重新选择。");
  }

  if (file.size > MAX_PRIVATE_IMAGE_BYTES) {
    throw new Error("单张图片不能超过5MB。");
  }

  if (!allowedMimeTypes.includes(file.type as ValidatedPrivateImageFile["mimeType"])) {
    throw new Error("仅支持JPG、PNG或WebP图片。");
  }

  const extension = getExtension(file.name);
  const mimeType = file.type as ValidatedPrivateImageFile["mimeType"];
  const allowedExtensions = extensionByMimeType[mimeType];
  if (
    !allowedExtensions.includes(
      extension as ValidatedPrivateImageFile["extension"],
    )
  ) {
    throw new Error("仅支持JPG、PNG或WebP图片。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectImageMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== mimeType) {
    throw new Error("图片内容无法识别，请重新选择。");
  }

  return {
    buffer,
    extension: extension as ValidatedPrivateImageFile["extension"],
    mimeType,
    originalName: file.name,
    sizeBytes: file.size,
  };
}

export async function persistPrivateImageUpload(options: {
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
      // Preserve the database error; unreferenced object can be audited.
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
