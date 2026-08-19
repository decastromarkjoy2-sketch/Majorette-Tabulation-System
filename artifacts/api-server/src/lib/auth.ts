import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const SESSION_COOKIE = "tagobtob_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

type Session = {
  role: "judge" | "organizer";
  judgeId?: number;
  accessCodeVersion?: number;
  expiresAt: number;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required.");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (
      (session.role !== "judge" && session.role !== "organizer") ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now() ||
      (session.role === "judge" &&
        (typeof session.judgeId !== "number" ||
          !Number.isInteger(session.judgeId) ||
          session.judgeId <= 0 ||
          typeof session.accessCodeVersion !== "number" ||
          !Number.isInteger(session.accessCodeVersion) ||
          session.accessCodeVersion <= 0))
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getSession(req: Request): Session | null {
  return decodeSession(req.cookies?.[SESSION_COOKIE]);
}

export function startSession(
  res: Response,
  role: Session["role"],
  judgeId?: number,
  accessCodeVersion?: number,
): void {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  res.cookie(SESSION_COOKIE, encodeSession({ role, judgeId, accessCodeVersion, expiresAt }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_MS,
    path: "/api",
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "strict", path: "/api" });
}

export function createAccessCode(): string {
  return randomBytes(18).toString("base64url");
}

export function hashAccessCode(accessCode: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(accessCode, salt, 64).toString("base64url");
  return `${salt}.${hash}`;
}

export function verifyAccessCode(accessCode: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(".");
  if (!salt || !expectedHash) return false;
  const actual = scryptSync(accessCode, salt, 64).toString("base64url");
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expectedHash);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function verifyOrganizerCode(accessCode: string): boolean {
  const organizerCode = process.env.ORGANIZER_ACCESS_CODE;
  if (!organizerCode) return false;
  const actualBuffer = Buffer.from(accessCode);
  const expectedBuffer = Buffer.from(organizerCode);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireOrganizer(req: Request, res: Response): boolean {
  if (getSession(req)?.role === "organizer") return true;
  res.status(403).json({ error: "Organizer authorization is required for this action." });
  return false;
}