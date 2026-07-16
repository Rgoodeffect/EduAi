import { getServerSession } from "@lib/session.server";
import { container } from "@infrastructure/di/container";
import { RoleName } from "@domain/user/value-objects/role-name";
import { QuestionType, QuestionDifficulty } from "@domain/question/value-objects/question-type";
import { Card } from "@components/ui/card";
import { DifficultyBadge, Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/feedback";
import { Pagination } from "@components/ui/pagination";
import { ManualCreateForm } from "@components/questions/manual-create-form";
import { DeleteQuestionButton } from "@components/questions/delete-question-button";

interface SearchParams {
  page?: string;
  type?: string;
  difficulty?: string;
  search?: string;
  documentId?: string;
}

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const session = await getServerSession();
  if (!session) return null;
  const isPrivileged = session.roles.includes(RoleName.ADMIN) || session.roles.includes(RoleName.TEACHER);
  const isAdmin = session.roles.includes(RoleName.ADMIN);

  const result = await container.questionService.listQuestions(
    { page, pageSize: 15 },
    {
      type: (params.type as QuestionType) || undefined,
      difficulty: (params.difficulty as QuestionDifficulty) || undefined,
      search: params.search || undefined,
      documentId: params.documentId || undefined,
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <p className="mt-1 text-gray-600">Browse, filter, and curate questions for exams.</p>
      </div>

      {isPrivileged && <ManualCreateForm />}

      <Card>
        <form method="get" className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 sm:grid-cols-4">
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search prompt..."
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select name="type" defaultValue={params.type ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All types</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer</option>
            <option value="ESSAY">Essay</option>
            <option value="FILL_IN_BLANK">Fill in the blank</option>
          </select>
          <select
            name="difficulty"
            defaultValue={params.difficulty ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Filter
          </button>
        </form>

        {result.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No questions match your filters" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {result.items.map((q) => {
              // toDTO(includeAnswer) is the only place answer visibility is decided — never read
              // q.correctAnswer directly off the entity here, or every viewer (including students)
              // would see it in the server-rendered HTML regardless of role.
              const dto = q.toDTO(isPrivileged);
              return (
                <li key={dto.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <DifficultyBadge difficulty={dto.difficulty} />
                      <span className="text-xs uppercase tracking-wide text-gray-500">{dto.type.replace(/_/g, " ")}</span>
                      {dto.tags.map((tag) => (
                        <Badge key={tag} tone="blue">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="truncate text-sm font-medium text-gray-900">{dto.prompt}</p>
                    {"correctAnswer" in dto && (
                      <p className="mt-1 text-xs text-gray-500">
                        Answer: <span className="font-medium text-gray-700">{dto.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                  {(isAdmin || dto.createdById === session.sub) && <DeleteQuestionButton questionId={dto.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/questions"
        searchParams={{ type: params.type, difficulty: params.difficulty, search: params.search }}
      />
    </div>
  );
}
