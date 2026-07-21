import type { AuthStep, UserRecord } from "@/types/auth";

const yes = (value: string | undefined) => ["SIM", "TRUE", "1", "YES"].includes((value ?? "").trim().toUpperCase());

export function getNextAuthStep(user: UserRecord): Exclude<AuthStep, "LOGIN" | "SUCCESS"> {
  if (yes(user.trocar_senha)) return "PASSWORD_CHANGE";
  if (!yes(user.mfa_ativo) || !user.mfa_metodo) return "MFA_METHOD";
  return "TOTP_VERIFY";
}

export function getMfaPolicy() {
  return {
    required: process.env.MFA_REQUIRED?.trim().toLowerCase() !== "false",
  };
}
