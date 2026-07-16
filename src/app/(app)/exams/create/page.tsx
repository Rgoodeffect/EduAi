"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input, Label, Select, Textarea } from "@components/ui/input";
import { Alert } from "@components/ui/feedback";
import { cn } from "@lib/cn";

interface QuestionOption {
  id: string;
  prompt: string;
  type: string;
  difficulty: string;
}

function AutoGenerateForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    totalQuestions: 5,
    difficulty: "",
    durationMinutes: 30,
    passingScore: 60,
    pointsPerQuestion: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/exams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          totalQuestions: form.totalQuestions,
          difficulty: form.difficulty || undefined,
          durationMinutes: form.durationMinutes || undefined,
          passingScore: form.passingScore || undefined,
          pointsPerQuestion: form.pointsPerQuestion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Could not generate exam.");
        return;
      }
      router.push(`/exams/${data.exam.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <Label htmlFor="a-title">Title</Label>
        <Input id="a-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      </div>
      <div>
        <Label htmlFor="a-desc">Description (optional)</Label>
        <Textarea id="a-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="a-count">Total questions</Label>
          <Input
            id="a-count"
            type="number"
            min={1}
            max={100}
            value={form.totalQuestions}
            onChange={(e) => setForm((f) => ({ ...f, totalQuestions: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="a-difficulty">Difficulty</Label>
          <Select id="a-difficulty" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
            <option value="">Any</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="a-points">Points / question</Label>
          <Input
            id="a-points"
            type="number"
            min={1}
            value={form.pointsPerQuestion}
            onChange={(e) => setForm((f) => ({ ...f, pointsPerQuestion: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="a-duration">Duration (minutes)</Label>
          <Input
            id="a-duration"
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="a-passing">Passing score (%)</Label>
          <Input
            id="a-passing"
            type="number"
            min={0}
            max={100}
            value={form.passingScore}
            onChange={(e) => setForm((f) => ({ ...f, passingScore: Number(e.target.value) }))}
          />
        </div>
      </div>
      <Button type="submit" loading={loading}>
        Generate exam
      </Button>
    </form>
  );
}

function ManualBuilderForm() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams({ pageSize: "25" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/questions?${params.toString()}`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.items);
      }
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one question.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          questions: Array.from(selected).map((questionId) => ({ questionId, points: 1 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Could not create exam.");
        return;
      }
      router.push(`/exams/${data.exam.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <Label htmlFor="m-title">Title</Label>
        <Input id="m-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="m-search">Search question bank</Label>
        <Input id="m-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts..." />
      </div>
      <p className="text-sm text-gray-600">{selected.size} question(s) selected</p>
      <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
        {questions.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-500">No questions found.</li>
        ) : (
          questions.map((q) => (
            <li
              key={q.id}
              className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50", selected.has(q.id) && "bg-brand-50")}
              onClick={() => toggle(q.id)}
            >
              <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="h-4 w-4" />
              <span className="flex-1 truncate text-sm text-gray-900">{q.prompt}</span>
              <span className="text-xs text-gray-500">{q.difficulty}</span>
            </li>
          ))
        )}
      </ul>
      <Button type="submit" loading={loading}>
        Create exam (draft)
      </Button>
    </form>
  );
}

export default function CreateExamPage() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create an exam</h1>
        <p className="mt-1 text-gray-600">Auto-build from the question bank, or hand-pick questions yourself.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={mode === "auto" ? "primary" : "outline"} size="sm" onClick={() => setMode("auto")}>
          Auto-generate
        </Button>
        <Button variant={mode === "manual" ? "primary" : "outline"} size="sm" onClick={() => setMode("manual")}>
          Manual selection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "auto" ? "Auto-generate from question bank" : "Hand-pick questions"}</CardTitle>
        </CardHeader>
        <CardBody>{mode === "auto" ? <AutoGenerateForm /> : <ManualBuilderForm />}</CardBody>
      </Card>
    </div>
  );
}
