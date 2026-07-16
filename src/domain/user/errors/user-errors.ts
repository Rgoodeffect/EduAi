import { DomainError } from "@domain/shared/result";

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`, "USER_ALREADY_EXISTS");
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("Invalid email or password.", "INVALID_CREDENTIALS");
  }
}

export class UserNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`User "${identifier}" was not found.`, "USER_NOT_FOUND");
  }
}

export class UserInactiveError extends DomainError {
  constructor() {
    super("This account has been deactivated.", "USER_INACTIVE");
  }
}

export class InsufficientPermissionsError extends DomainError {
  constructor(action: string) {
    super(`You do not have permission to perform: ${action}.`, "INSUFFICIENT_PERMISSIONS");
  }
}
