import { User } from "@domain/user/entities/user";
import { PageRequest, PageResult } from "@domain/shared/pagination";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
}

/**
 * Repository Pattern: the domain depends only on this interface. The
 * concrete Prisma-backed implementation lives in the infrastructure layer.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  setRoles(id: string, roles: string[]): Promise<void>;
  list(page: PageRequest, filter?: { role?: string; search?: string }): Promise<PageResult<User>>;
  count(): Promise<number>;
}
