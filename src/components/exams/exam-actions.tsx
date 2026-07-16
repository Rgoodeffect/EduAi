"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import { Alert } from "@components/ui/feedback";

export function ExamManagementActions({ examId, status }: { examId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function callAction(action: "publish" | "archive" | "delete") {
    setError(null);
    setLoading(action);
    try {
      const method = action === "delete" ? "DELETE" : "PATCH";
      const url = action === "delete" ? `/api/exams/${examId}` : `/api/exams/${examId}/${action}`;
      const res = await fetch(url, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message ?? `Could not ${action} exam.`);
        return;
      }
      if (action === "delete") {
        router.push("/exams");
      } else {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Button size="sm" onClick={() => callAction("publish")} loading={loading === "publish"}>
            Publish
          </Button>
        )}
        {status === "PUBLISHED" && (
          <Button size="sm" variant="outline" onClick={() => callAction("archive")} loading={loading === "archive"}>
            Archive
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            if (confirm("Delete this exam? This cannot be undone.")) callAction("delete");
          }}
          loading={loading === "delete"}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function StartAttemptButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/attempts`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Could not start the exam.");
        return;
      }
      router.push(`/exams/${examId}/take?attemptId=${data.attemptId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <Alert>{error}</Alert>}
      <Button onClick={handleStart} loading={loading}>
        Start exam
      </Button>
    </div>
  );
}
