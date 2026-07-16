"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    setLoading(true);
    try {
      await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} loading={loading} className="text-red-600 hover:bg-red-50">
      Delete
    </Button>
  );
}
