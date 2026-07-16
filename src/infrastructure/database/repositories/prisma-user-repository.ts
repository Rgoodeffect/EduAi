import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole, Role as PrismaRole } from "@prisma/client";
import { User } from "@domain/user/entities/user";
import {
  CreateUserData,
  IUserRepository,
  UpdateUserData,
} from "@domain/user/repositories/user-repository";
import { RoleName } from "@domain/user/value-objects/role-name";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

type PrismaUserWithRoles = PrismaUser & { roles: (PrismaUserRole & { role: PrismaRole })[] };

function toDomain(record: PrismaUserWithRoles): User {
  return User.create(
    {
      email: record.email,
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      isActive: record.isActive,
      roles: record.roles.map((r) => r.role.name as RoleName),
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    record.id,
  );
}

const includeRoles = { roles: { include: { role: true } } } as const;

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.db.user.findUnique({ where: { id }, include: includeRoles });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: includeRoles,
    });
    return record ? toDomain(record) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const roles = await this.db.role.findMany({ where: { name: { in: data.roles as RoleName[] } } });
    const record = await this.db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: {
          create: roles.map((role) => ({ roleId: role.id })),
        },
      },
      include: includeRoles,
    });
    return toDomain(record);
  }

  async update(id: string, data: UpdateUserData): Promise<void> {
    await this.db.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { passwordHash } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db.user.update({ where: { id }, data: { isActive } });
  }

  async setRoles(id: string, roleNames: string[]): Promise<void> {
    const roles = await this.db.role.findMany({ where: { name: { in: roleNames as RoleName[] } } });
    await this.db.$transaction([
      this.db.userRole.deleteMany({ where: { userId: id } }),
      this.db.userRole.createMany({ data: roles.map((role) => ({ userId: id, roleId: role.id })) }),
    ]);
  }

  async list(
    page: PageRequest,
    filter?: { role?: string; search?: string },
  ): Promise<PageResult<User>> {
    const where = {
      ...(filter?.role ? { roles: { some: { role: { name: filter.role as RoleName } } } } : {}),
      ...(filter?.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: "insensitive" as const } },
              { firstName: { contains: filter.search, mode: "insensitive" as const } },
              { lastName: { contains: filter.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.db.user.findMany({
        where,
        include: includeRoles,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.db.user.count({ where }),
    ]);

    return toPageResult(records.map(toDomain), total, page);
  }

  async count(): Promise<number> {
    return this.db.user.count();
  }
}
