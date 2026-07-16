import { v4 as uuidv4 } from "uuid";
import { User } from "@domain/user/entities/user";
import { CreateUserData, IUserRepository, UpdateUserData } from "@domain/user/repositories/user-repository";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

export class FakeUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) return user;
    }
    return null;
  }

  async create(data: CreateUserData): Promise<User> {
    const id = uuidv4();
    const user = User.create(
      {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: true,
        roles: data.roles as User["roles"],
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    );
    this.users.set(id, user);
    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    void data;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(
      id,
      User.create(
        {
          email: user.email,
          passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          roles: user.roles,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: new Date(),
        },
        id,
      ),
    );
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(
      id,
      User.create(
        {
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          roles: user.roles,
          lastLoginAt: new Date(),
          createdAt: user.createdAt,
          updatedAt: new Date(),
        },
        id,
      ),
    );
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(
      id,
      User.create(
        {
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive,
          roles: user.roles,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: new Date(),
        },
        id,
      ),
    );
  }

  async setRoles(id: string, roles: string[]): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(
      id,
      User.create(
        {
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          roles: roles as User["roles"],
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: new Date(),
        },
        id,
      ),
    );
  }

  async list(page: PageRequest): Promise<PageResult<User>> {
    const items = Array.from(this.users.values());
    return toPageResult(items, items.length, page);
  }

  async count(): Promise<number> {
    return this.users.size;
  }
}
