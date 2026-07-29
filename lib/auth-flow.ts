import type { AuthStep, UserRecord } from "@/types/auth";

const yes = (value: string | undefined) => ["SIM", "TRUE", "1", "YES"].includes((value ?? "").trim().toUpperCase());

export function hasConfiguredTotp(user: UserRecord) {
  return yes(user.mfa_ativo) && user.mfa_metodo === "TOTP" && Boolean(user.mfa_secret_encrypted?.trim());
}

export function getNextAuthStep(user: UserRecord): Exclude<AuthStep, "LOGIN" | "SUCCESS"> {
  if (yes(user.trocar_senha)) return "PASSWORD_CHANGE";
  // An active flag alone is not MFA. Legacy/incomplete records must restart
  // setup instead of asking iPhone for a code that was never generated.
  if (!hasConfiguredTotp(user)) return "MFA_METHOD";
  return "TOTP_VERIFY";
}

export function getMfaPolicy() {
  return {
    required: process.env.MFA_REQUIRED?.trim().toLowerCase() !== "false",
  };
}
