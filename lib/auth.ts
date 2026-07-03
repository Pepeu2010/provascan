import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthSessionUser, SafeAuthUser } from "@/types/auth";

export const AUTH_COOKIE_NAME = "provascan-auth";
const AUTH_MAX_AGE = 60 * 60 * 12;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

const sessionPayloadSchema = z.object({
  sub: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().min(1),
  role: z.string().min(1),
  forcePasswordChange: z.boolean(),
  remember: z.boolean(),
  loggedInAt: z.string().datetime(),
  passwordStamp: z.string().length(64),
});

export type ParsedSessionToken = z.infer<typeof sessionPayloadSchema>;

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("AUTH_SECRET deve existir e ter pelo menos 32 caracteres.");
  }

  return new TextEncoder().encode(secret);
}

export function getSessionDuration(remember: boolean) {
  return remember ? REMEMBER_MAX_AGE : AUTH_MAX_AGE;
}

export function buildSessionUser(user: SafeAuthUser, remember: boolean, loggedInAt: string): AuthSessionUser {
  return {
    ...user,
    loggedInAt,
    remember,
  };
}

export async function createSessionToken(input: {
  user: SafeAuthUser;
  remember: boolean;
  loggedInAt: string;
  passwordStamp: string;
}) {
  const maxAge = getSessionDuration(input.remember);

  return new SignJWT({
    email: input.user.email.trim().toLowerCase(),
    forcePasswordChange: input.user.forcePasswordChange,
    loggedInAt: input.loggedInAt,
    nome: input.user.nome,
    passwordStamp: input.passwordStamp,
    remember: input.remember,
    role: input.user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.user.id)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSessionSecret());
}

export async function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    const parsed = sessionPayloadSchema.parse(payload);
    return parsed;
  } catch {
    return null;
  }
}

export function applyAuthCookie(response: NextResponse, token: string, remember: boolean) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: getSessionDuration(remember),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
