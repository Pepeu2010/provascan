import type { UserRole } from "@/types/auth";

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
    return isPrivilegedRole(role);
  }

  if (pathname === "/dashboard") return true;
  if (pathname === "/dashboard/minhas-provas" || pathname.startsWith("/dashboard/minhas-provas/")) return role === "professor";
  if (pathname === "/dashboard/provas" || pathname.startsWith("/dashboard/provas/")) return isAcademicManagementRole(role);
  if (pathname.startsWith("/dashboard/")) return isAcademicManagementRole(role);

  return false;
}

export function canAccessSensitiveSettings(role: UserRole) {
  return isPrivilegedRole(role);
}

export function canManageUsers(role: UserRole) {
  return isPrivilegedRole(role);
}
