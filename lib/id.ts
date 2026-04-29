import { randomBytes, randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

export function createInviteToken(): string {
  return randomBytes(16).toString("base64url");
}
