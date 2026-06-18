"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import type { TutorDocumentType } from "@prisma/client";

type TutorDocumentUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  documentType: TutorDocumentType;
  documentId?: string;
  label: string;
  disabled?: boolean;
};

function SubmitButton({
  disabled,
  label,
}: {
  disabled?: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#117b7a] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(17,123,122,0.18)] transition hover:bg-[#0d6d6c] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "上传中..." : label}
    </button>
  );
}

export function TutorDocumentUploadForm({
  action,
  documentType,
  documentId,
  label,
  disabled,
}: TutorDocumentUploadFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string>("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setPreviewUrl(null);
      setFileInfo("");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFileInfo(`${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  }

  function clearSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileInfo("");
  }

  return (
    <form action={action} className="space-y-3">
      <input name="documentType" type="hidden" value={documentType} />
      {documentId ? <input name="documentId" type="hidden" value={documentId} /> : null}
      <label className="block">
        <span className="text-sm font-medium text-[#2d4650]">选择图片</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full rounded-xl border border-[#d9e5e2] bg-white px-3 py-2 text-sm text-[#2d4650] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e7f3ef] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#0f6f70]"
          disabled={disabled}
          name="document"
          onChange={handleFileChange}
          required
          type="file"
        />
      </label>

      {previewUrl ? (
        <div className="rounded-2xl border border-[#d9e5e2] bg-[#fbfdfb] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="待上传证明预览"
            className="max-h-48 w-full rounded-xl object-contain"
            src={previewUrl}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#60716c]">
            <span>{fileInfo}</span>
            <button
              className="font-semibold text-[#0f6f70] hover:text-[#0b5f5f]"
              onClick={clearSelection}
              type="button"
            >
              取消选择
            </button>
          </div>
        </div>
      ) : null}

      <SubmitButton disabled={disabled} label={label} />
    </form>
  );
}
