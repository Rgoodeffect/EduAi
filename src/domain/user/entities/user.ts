import { Entity } from "@domain/shared/entity";
import { RoleName } from "@domain/user/value-objects/role-name";

export interface UserProps {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: RoleName[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id: string) {
    super(props, id);
  }

  static create(props: UserProps, id: string): User {
    return new User(props, id);
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get roles(): RoleName[] {
    return this.props.roles;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  hasRole(role: RoleName): boolean {
    return this.props.roles.includes(role);
  }

  hasAnyRole(roles: RoleName[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  isAdmin(): boolean {
    return this.hasRole(RoleName.ADMIN);
  }

  isTeacherOrAdmin(): boolean {
    return this.hasAnyRole([RoleName.ADMIN, RoleName.TEACHER]);
  }

  toPublicProfile() {
    return {
      id: this.id,
      email: this.props.email,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      fullName: this.fullName,
      roles: this.props.roles,
      isActive: this.props.isActive,
      lastLoginAt: this.props.lastLoginAt,
      createdAt: this.props.createdAt,
    };
  }
}
