import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";

export const GET = withAuth(async (_request, session) => {
  const attempts = await container.examService.listMyAttempts(session.sub);
  return NextResponse.json({ attempts });
});
