import { z } from "zod";
import { RoleName } from "@domain/user/value-objects/role-name";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  /** Only STUDENT/TEACHER are self-selectable; ADMIN must be granted by an existing admin. */
  role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
}

export interface AuthResult {
  user: AuthenticatedUserDTO;
  tokens: AuthTokens;
}
