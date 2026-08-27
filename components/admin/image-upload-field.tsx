"use client";

import { useRef, useState } from "react";
import { uploadAdminImage } from "@/actions/admin-upload";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadResult = { url?: string; error?: string };

interface ImageUploadFieldProps {
  name: string;
  label: string;
  defaultUrl?: string;
  folder?: string;
  /** Override the server action used to upload (defaults to the admin upload). */
  uploader?: (fd: FormData) => Promise<UploadResult>;
  /** Called whenever the field's URL value changes (manual override tracking). */
  onUrlChange?: (url: string) => void;
}

export function ImageUploadField({ name, label, defaultUrl = "", folder = "venues", uploader, onUrlChange }: ImageUploadFieldProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadGeneration = useRef(0);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError("File too large (max 50MB)");
      e.target.value = "";
      return;
    }
    const generation = ++uploadGeneration.current;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    try {
      const res = await (uploader ?? uploadAdminImage)(fd);
      // A later upload or a manually entered URL wins over an older response.
      if (generation !== uploadGeneration.current) return;
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.url) {
        setUrl(res.url);
        onUrlChange?.(res.url);
      }
    } catch {
      if (generation === uploadGeneration.current) setError("Upload failed. Please try again.");
    } finally {
      if (generation === uploadGeneration.current) setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <input type="hidden" name={name} value={url} />
      <Input
        value={url}
        onChange={(e) => {
          ++uploadGeneration.current;
          setUrl(e.target.value);
          onUrlChange?.(e.target.value);
        }}
        placeholder="Image URL"
        className="font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:underline">
            Preview
          </a>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
