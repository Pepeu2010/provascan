import { isAdminRole, isPrivilegedRole } from "@/lib/access-control";
import type { UserRole } from "@/types/auth";

export function canActInPedagogicalScope(role: UserRole, hasActiveScope: boolean) {
  if (isAdminRole(role) || isPrivilegedRole(role)) return true;
  return hasActiveScope;
}
