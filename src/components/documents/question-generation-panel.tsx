"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@components/ui/button";
import { Input, Label, Select } from "@components/ui/input";
import { Alert, Spinner } from "@components/ui/feedback";
import { DifficultyBadge } from "@components/ui/badge";

interface QuestionSummary {
  id: string;
  type: string;
  difficulty: string;
  prompt: string;
}

export function QuestionGenerationPanel({
  documentId,
  initialQuestions,
}: {
  documentId: string;
  initialQuestions: QuestionSummary[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [count, setCount] = useState(5);
  const [type, setType] = useState("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [topic, setTopic] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baselineCountRef = useRef(initialQuestions.length);
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
      const res = await fetch(`/api/documents/${documentId}/questions?pageSize=100`);
      const data = await res.json();
      if (data.items && data.items.length > baselineCountRef.current) {
        setQuestions(data.items);
        baselineCountRef.current = data.items.length;
        setPending(false);
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (attemptsRef.current > 60) {
        setPending(false);
        setError("Question generation is taking longer than expected. Try refreshing shortly.");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
  }

  async function handleGenerate() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/documents/${documentId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, type, difficulty, topic: topic.trim() || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message ?? "Could not start question generation.");
      setPending(false);
      return;
    }
    startPolling();
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="q-count">Count</Label>
          <Input id="q-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="q-type">Type</Label>
          <Select id="q-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer</option>
            <option value="ESSAY">Essay</option>
            <option value="FILL_IN_BLANK">Fill in the blank</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="q-difficulty">Difficulty</Label>
          <Select id="q-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="q-topic">Focus topic (optional)</Label>
          <Input id="q-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. mitosis" />
        </div>
      </div>

      <Button onClick={handleGenerate} loading={pending} disabled={pending}>
        Generate questions
      </Button>
      {pending && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Spinner />
          Generating with the local model...
        </div>
      )}

      <div className="space-y-2">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-500">No questions generated for this document yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="text-sm text-gray-500">{q.type.replace(/_/g, " ")}</span>
                </div>
                <span className="flex-1 truncate text-sm text-gray-900">{q.prompt}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/questions?documentId=${documentId}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View in Question Bank →
        </Link>
      </div>
    </div>
  );
}
