import { NextResponse } from "next/server";
import { z } from "zod";
import { container } from "@infrastructure/di/container";
import { withRole } from "@infrastructure/http/api-guard";
import { errorResponse, handleApiError } from "@lib/http/api-error";
import { RoleName } from "@domain/user/value-objects/role-name";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateUserSchema = z.object({
  roles: z.array(z.enum(["ADMIN", "TEACHER", "STUDENT"])).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withRole<RouteContext>([RoleName.ADMIN], async (request, session, ctx) => {
  try {
    const { id } = await ctx.params;
    const input = updateUserSchema.parse(await request.json());

    if (id === session.sub && input.isActive === false) {
      return errorResponse("VALIDATION_ERROR", "You cannot deactivate your own account.", 400);
    }

    if (input.roles) await container.userRepository.setRoles(id, input.roles);
    if (input.isActive !== undefined) await container.userRepository.setActive(id, input.isActive);

    const updated = await container.userRepository.findById(id);
    if (!updated) return errorResponse("USER_NOT_FOUND", "User not found.", 404);

    return NextResponse.json({ user: updated.toPublicProfile() });
  } catch (err) {
    return handleApiError(err);
  }
});
