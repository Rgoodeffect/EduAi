import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-brand-700">EduAi</h1>
      <p className="max-w-xl text-gray-600">
        Upload course material, generate summaries, questions, and exams using a fully local AI
        pipeline — no external APIs required.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-brand-600 px-5 py-2.5 text-white hover:bg-brand-700"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-brand-600 px-5 py-2.5 text-brand-700 hover:bg-brand-50"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
