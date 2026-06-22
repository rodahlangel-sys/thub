export type StoredFile = {
  key: string;
  buffer: Buffer;
};

export type SavePrivateFileInput = {
  buffer: Buffer;
  extension: "jpg" | "jpeg" | "png" | "webp";
  tutorProfileId: string;
};

export type PrivateFileStorage = {
  save(input: SavePrivateFileInput): Promise<string>;
  read(storageKey: string): Promise<StoredFile | null>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
};
