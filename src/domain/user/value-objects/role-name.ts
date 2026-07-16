export const RoleName = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ALL_ROLES: RoleName[] = [RoleName.ADMIN, RoleName.TEACHER, RoleName.STUDENT];

export function isRoleName(value: string): value is RoleName {
  return ALL_ROLES.includes(value as RoleName);
}
