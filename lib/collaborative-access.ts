import type { UserRole } from "@/types/auth";

const ACADEMIC_MANAGEMENT_ROLES = new Set<UserRole>(["admin", "vice_diretor", "coordenador"]);

export function canManageAcademicExams(role: UserRole) {
  return ACADEMIC_MANAGEMENT_ROLES.has(role);
}

export function isTeacherRole(role: UserRole) {
  return role === "professor";
}
