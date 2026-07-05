export type UserRole = "admin" | "professor" | "vice_diretor" | string;

export type SheetsUserRecord = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfil: UserRole;
  disciplina?: string;
  ativo: string;
  trocar_senha: string;
};

export type SafeAuthUser = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  subject: string | null;
  forcePasswordChange: boolean;
};

export type AuthSessionUser = SafeAuthUser & {
  remember: boolean;
  loggedInAt: string;
};
