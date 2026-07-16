import { NextResponse } from "next/server";
import { container } from "@infrastructure/di/container";
import { withAuth } from "@infrastructure/http/api-guard";
import { errorResponse } from "@lib/http/api-error";

export const GET = withAuth(async (_request, session) => {
  const user = await container.userRepository.findById(session.sub);
  if (!user) {
    return errorResponse("USER_NOT_FOUND", "User not found.", 404);
  }
  return NextResponse.json({ user: user.toPublicProfile() });
});
