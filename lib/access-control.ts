import type { UserRole } from "@/types/auth";

const ADMIN_ROLES = new Set<UserRole>(["admin"]);
const PRIVILEGED_ROLES = new Set<UserRole>(["admin", "vice_diretor"]);

export function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.has(role);
}

export function isPrivilegedRole(role: UserRole) {
  return PRIVILEGED_ROLES.has(role);
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

  return true;
}

export function canAccessSensitiveSettings(role: UserRole) {
  return isPrivilegedRole(role);
}

export function canManageUsers(role: UserRole) {
  return isPrivilegedRole(role);
}
