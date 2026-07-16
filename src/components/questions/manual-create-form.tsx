"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import { Input, Label, Select, Textarea } from "@components/ui/input";
import { Alert } from "@components/ui/feedback";
import { Card, CardBody } from "@components/ui/card";

export function ManualCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "SHORT_ANSWER",
    difficulty: "MEDIUM",
    prompt: "",
    correctAnswer: "",
    explanation: "",
    tags: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          difficulty: form.difficulty,
          prompt: form.prompt,
          correctAnswer: form.correctAnswer,
          explanation: form.explanation || null,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Could not create question.");
        return;
      }
      setForm({ type: "SHORT_ANSWER", difficulty: "MEDIUM", prompt: "", correctAnswer: "", explanation: "", tags: "" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Add question manually
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-type">Type</Label>
              <Select id="m-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short answer</option>
                <option value="ESSAY">Essay</option>
                <option value="FILL_IN_BLANK">Fill in the blank</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-difficulty">Difficulty</Label>
              <Select
                id="m-difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="m-prompt">Question prompt</Label>
            <Textarea
              id="m-prompt"
              required
              rows={2}
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="m-answer">Correct answer</Label>
            <Input
              id="m-answer"
              required
              value={form.correctAnswer}
              onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
              placeholder={form.type === "MULTIPLE_CHOICE" ? "e.g. A" : undefined}
            />
          </div>
          <div>
            <Label htmlFor="m-explanation">Explanation (optional)</Label>
            <Textarea
              id="m-explanation"
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="m-tags">Tags (comma-separated)</Label>
            <Input id="m-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              Create question
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
