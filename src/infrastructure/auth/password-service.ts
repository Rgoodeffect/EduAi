import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Wraps bcrypt so the application layer never imports a hashing library directly. */
export class PasswordService {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
