import type { UserRole } from "@/types/auth";

export type ManagedRole = "admin" | "vice_diretor" | "coordenador" | "professor";

const ADMIN_ROLES = new Set<UserRole>(["admin"]);
const PRIVILEGED_ROLES = new Set<UserRole>(["admin", "vice_diretor"]);
const ACADEMIC_MANAGEMENT_ROLES = new Set<UserRole>(["admin", "vice_diretor", "coordenador"]);

export function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.has(role);
}

export function isPrivilegedRole(role: UserRole) {
  return PRIVILEGED_ROLES.has(role);
}

export function isAcademicManagementRole(role: UserRole) {
  return ACADEMIC_MANAGEMENT_ROLES.has(role);
}

/**
 * Fine-grained subject/class scope arrives with pedagogical_scopes. Until
 * then, creation follows the system's existing academic roles and routes
 * enforce this policy again before every write.
 */
export function canCreateExam(role: UserRole) {
  return role === "professor" || isAcademicManagementRole(role);
}

/** Operational records include school-wide student and correction data. */
export function canAccessOperationalData(role: UserRole) {
  return isAcademicManagementRole(role);
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return isAdminRole(role);
  }

  if (pathname === "/painel" || pathname.startsWith("/painel/")) {
    return isAdminRole(role);
  }

  if (pathname === "/dashboard/configuracoes" || pathname.startsWith("/dashboard/configuracoes/")) {
    return isAdminRole(role);
  }

  if (pathname === "/dashboard") return true;
  if (pathname === "/dashboard/minhas-provas" || pathname.startsWith("/dashboard/minhas-provas/")) return role === "professor";
  if (["/dashboard/provas", "/dashboard/gabaritos", "/dashboard/correcao", "/dashboard/relatorios"].some((base) => pathname === base || pathname.startsWith(`${base}/`))) return role === "professor" || isAcademicManagementRole(role);
  if (pathname.startsWith("/dashboard/")) return isAcademicManagementRole(role);

  return false;
}

export function canAccessSensitiveSettings(role: UserRole) {
  return isAdminRole(role);
}

export function canManageUsers(role: UserRole) {
  return isAdminRole(role);
}

/** Only Admin may change identities, roles, credentials, and security controls. */
export function canAssignManagedRole(actorRole: UserRole, targetRole: ManagedRole) {
  return Boolean(targetRole) && isAdminRole(actorRole);
}

export function canManageTargetUser(actorRole: UserRole, targetRole: string) {
  return canAssignManagedRole(actorRole, targetRole as ManagedRole);
}

export function managedRolesFor(actorRole: UserRole): ManagedRole[] {
  if (isAdminRole(actorRole)) return ["professor", "coordenador", "vice_diretor", "admin"];
  return [];
}
