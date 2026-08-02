export type UserRole = "admin" | "professor" | "vice_diretor" | string;

export type UserRecord = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  senha_formato?: "PLAIN" | "BCRYPT";
  perfil: UserRole;
  ativo: string;
  trocar_senha: string;
  mfa_ativo?: string;
  mfa_metodo?: "TOTP" | "";
  mfa_secret_encrypted?: string;
  recovery_codes_configurados?: string;
  recovery_codes_hashes?: string;
  sessao_revogada_em?: string;
};

export type SafeAuthUser = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  forcePasswordChange: boolean;
};

export type AuthSessionUser = SafeAuthUser & {
  remember: boolean;
  loggedInAt: string;
};

export type AuthStep =
  | "LOGIN"
  | "PASSWORD_CHANGE"
  | "MFA_METHOD"
  | "TOTP_SETUP"
  | "TOTP_VERIFY"
  | "RECOVERY_CODE"
  | "RECOVERY_CODES_SAVE"
  | "SUCCESS";
