"use client";

import { useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import { Input, Label } from "@components/ui/input";
import { Alert } from "@components/ui/feedback";
import { Card, CardBody } from "@components/ui/card";

export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (title.trim()) formData.append("title", title.trim());

    setLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Upload failed.");
        return;
      }
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Upload document</Button>;
  }

  return (
    <Card className="w-full max-w-lg">
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <Label htmlFor="doc-title">Title (optional)</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 - Photosynthesis" />
          </div>
          <div>
            <Label htmlFor="doc-file">PDF file</Label>
            <input
              id="doc-file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              required
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              Upload
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
