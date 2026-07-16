"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input, Textarea } from "@components/ui/input";
import { Alert, Spinner } from "@components/ui/feedback";

interface QuestionOption {
  key: string;
  text: string;
}
interface TakeQuestion {
  id: string;
  type: string;
  prompt: string;
  options: QuestionOption[] | null;
}
interface ExamDTO {
  id: string;
  title: string;
  durationMinutes: number | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ExamTaking() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get("attemptId");

  const [exam, setExam] = useState<ExamDTO | null>(null);
  const [questions, setQuestions] = useState<TakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setError("Missing attempt. Start the exam from its detail page.");
      setLoading(false);
      return;
    }

    (async () => {
      const [attemptRes, questionsRes] = await Promise.all([
        fetch(`/api/exams/attempts/${attemptId}`),
        fetch(`/api/exams/${params.id}/questions`),
      ]);

      if (attemptRes.ok) {
        const attemptData = await attemptRes.json();
        if (attemptData.attempt.submittedAt) {
          router.replace(`/exams/attempts/${attemptId}`);
          return;
        }
      }

      if (!questionsRes.ok) {
        const data = await questionsRes.json().catch(() => ({}));
        setError(data.error?.message ?? "Could not load this exam.");
        setLoading(false);
        return;
      }

      const data = await questionsRes.json();
      setExam(data.exam);
      setQuestions(data.questions);
      if (data.exam.durationMinutes) setSecondsLeft(data.exam.durationMinutes * 60);
      setLoading(false);
    })();
  }, [attemptId, params.id, router]);

  const handleSubmit = useMemo(
    () => async () => {
      if (!attemptId || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message ?? "Could not submit your answers.");
          setSubmitting(false);
          return;
        }
        router.push(`/exams/attempts/${attemptId}`);
      } catch {
        setError("Could not reach the server. Please try again.");
        setSubmitting(false);
      }
    },
    [attemptId, answers, submitting, router],
  );

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, handleSubmit]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Spinner /> Loading exam...
      </div>
    );
  }

  if (error && questions.length === 0) {
    return <Alert>{error}</Alert>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
        {secondsLeft !== null && (
          <span className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white">{formatTime(secondsLeft)}</span>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {questions.map((q, index) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle>
              Question {index + 1}. {q.prompt}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {q.options ? (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.key}
                      checked={answers[q.id] === opt.key}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.key }))}
                    />
                    <span className="text-sm text-gray-800">
                      {opt.key}. {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : q.type === "ESSAY" ? (
              <Textarea
                rows={5}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            ) : (
              <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            )}
          </CardBody>
        </Card>
      ))}

      <Button onClick={handleSubmit} loading={submitting} size="lg">
        Submit exam
      </Button>
    </div>
  );
}

export default function TakeExamPage() {
  return (
    <Suspense>
      <ExamTaking />
    </Suspense>
  );
}
