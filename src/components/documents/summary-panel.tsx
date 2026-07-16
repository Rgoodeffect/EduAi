"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@components/ui/button";
import { Alert, Spinner } from "@components/ui/feedback";

interface SummaryDTO {
  id: string;
  content: string;
  model: string;
  createdAt: string;
}

export function SummaryPanel({ documentId, initialSummary }: { documentId: string; initialSummary: SummaryDTO | null }) {
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    attemptsRef.current = 0;
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      const res = await fetch(`/api/documents/${documentId}/summary`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setPending(false);
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (attemptsRef.current > 60) {
        setPending(false);
        setError("Summary generation is taking longer than expected. Try refreshing shortly.");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
  }

  async function handleGenerate() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/documents/${documentId}/summary`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message ?? "Could not start summary generation.");
      setPending(false);
      return;
    }
    startPolling();
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {summary ? (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800">{summary.content}</div>
      ) : pending ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Spinner />
          Generating summary with the local model... this can take a minute.
        </div>
      ) : (
        <p className="text-sm text-gray-500">No summary yet.</p>
      )}
      <Button variant="outline" size="sm" onClick={handleGenerate} loading={pending} disabled={pending}>
        {summary ? "Regenerate summary" : "Generate summary"}
      </Button>
    </div>
  );
}
