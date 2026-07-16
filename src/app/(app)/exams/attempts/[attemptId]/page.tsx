import { notFound } from "next/navigation";
import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { Card, CardBody, CardHeader, CardTitle } from "@components/ui/card";
import { Alert } from "@components/ui/feedback";

export default async function ExamResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await getServerSession();
  if (!session) return null;

  const attempt = await container.examService.getAttempt(attemptId);
  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  if (!attempt || (!isPrivileged && attempt.userId !== session.sub)) {
    notFound();
  }

  const exam = await container.examService.getExam(attempt.examId);
  const questionIds = exam?.questions.map((q) => q.questionId) ?? [];
  const questions = await container.questionRepository.findManyByIds(questionIds);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const answerByQuestionId = new Map(attempt.answers.map((a) => [a.questionId, a.answer]));

  // A student may see answer keys for their own submitted attempt (post-hoc review); staff always can.
  const canRevealAnswers = isPrivileged || Boolean(attempt.submittedAt);

  const percentage = attempt.maxScore ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100) : null;
  const passed = exam?.passingScore !== null && exam?.passingScore !== undefined && percentage !== null ? percentage >= exam.passingScore : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{exam?.title ?? "Exam results"}</h1>
        {!attempt.submittedAt ? (
          <Alert tone="info">This attempt hasn&apos;t been submitted yet.</Alert>
        ) : (
          <div className="mt-3 flex items-center gap-4">
            <p className="text-3xl font-bold text-gray-900">
              {attempt.score} / {attempt.maxScore}
            </p>
            {percentage !== null && <p className="text-lg text-gray-600">{percentage}%</p>}
            {passed !== null && (
              <span className={passed ? "font-medium text-green-700" : "font-medium text-red-700"}>
                {passed ? "Passed" : "Did not pass"}
              </span>
            )}
          </div>
        )}
      </div>

      {exam?.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((ref, index) => {
          const question = questionById.get(ref.questionId);
          if (!question) return null;
          const dto = question.toDTO(canRevealAnswers);
          const submittedAnswer = answerByQuestionId.get(ref.questionId);
          const isCorrect = submittedAnswer !== undefined ? question.isCorrect(submittedAnswer) : false;

          return (
            <Card key={ref.questionId}>
              <CardHeader>
                <CardTitle>
                  Question {index + 1}. {dto.prompt}
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                <p>
                  Your answer: <span className="font-medium text-gray-900">{submittedAnswer ?? "(no answer)"}</span>{" "}
                  {attempt.submittedAt && dto.type !== "ESSAY" && (
                    <span className={isCorrect ? "text-green-700" : "text-red-700"}>{isCorrect ? "✓ Correct" : "✗ Incorrect"}</span>
                  )}
                </p>
                {"correctAnswer" in dto && (
                  <p className="text-gray-600">
                    Correct answer: <span className="font-medium">{dto.correctAnswer}</span>
                  </p>
                )}
                {"explanation" in dto && dto.explanation && <p className="text-gray-500">{dto.explanation}</p>}
              </CardBody>
            </Card>
          );
        })}
    </div>
  );
}
