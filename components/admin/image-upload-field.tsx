"use client";

import { useRef, useState } from "react";
import { uploadAdminImage } from "@/actions/admin-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadFieldProps {
  name: string;
  label: string;
  defaultUrl?: string;
  folder?: string;
}

export function ImageUploadField({ name, label, defaultUrl = "", folder = "venues" }: ImageUploadFieldProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const res = await uploadAdminImage(fd);
    setUploading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.url) setUrl(res.url);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <input type="hidden" name={name} value={url} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Image URL" className="font-mono text-xs" />
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
