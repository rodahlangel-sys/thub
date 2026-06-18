import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  PrivateFileStorage,
  SavePrivateFileInput,
  StoredFile,
} from "./types";

const STORAGE_KEY_PATTERN = /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

function resolveStoragePath(storageRoot: string, storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid private file key");
  }

  const resolvedPath = path.resolve(storageRoot, storageKey);
  const resolvedRoot = path.resolve(storageRoot);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid private file path");
  }

  return resolvedPath;
}

export function createLocalPrivateFileStorage(storageRoot: string): PrivateFileStorage {
  return {
  async save(input: SavePrivateFileInput) {
    await fs.mkdir(storageRoot, { recursive: true });

    const key = `${randomUUID()}.${input.extension}`;
    const filePath = resolveStoragePath(storageRoot, key);
    await fs.writeFile(filePath, input.buffer, { flag: "wx" });

    return key;
  },

  async read(storageKey: string): Promise<StoredFile | null> {
    try {
      const filePath = resolveStoragePath(storageRoot, storageKey);
      const buffer = await fs.readFile(filePath);

      return {
        key: storageKey,
        buffer,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  },

  async delete(storageKey: string) {
    try {
      const filePath = resolveStoragePath(storageRoot, storageKey);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to delete private file", error);
      }
    }
  },

  async exists(storageKey: string) {
    try {
      const filePath = resolveStoragePath(storageRoot, storageKey);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  };
}

export const localPrivateFileStorage = createLocalPrivateFileStorage(
  path.join(process.cwd(), ".data", "tutor-verification"),
);
