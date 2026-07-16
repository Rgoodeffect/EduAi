import { describe, it, expect } from "vitest";
import { PasswordService } from "@infrastructure/auth/password-service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes a password and verifies the correct plaintext matches", async () => {
    const hash = await service.hash("CorrectHorseBattery1");
    expect(hash).not.toBe("CorrectHorseBattery1");
    expect(await service.compare("CorrectHorseBattery1", hash)).toBe(true);
  });

  it("rejects an incorrect plaintext", async () => {
    const hash = await service.hash("CorrectHorseBattery1");
    expect(await service.compare("WrongPassword1", hash)).toBe(false);
  });

  it("produces different hashes for the same input (salted)", async () => {
    const [h1, h2] = await Promise.all([service.hash("SamePassword1"), service.hash("SamePassword1")]);
    expect(h1).not.toBe(h2);
  });
});
