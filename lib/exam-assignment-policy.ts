import { isAdminRole, isPrivilegedRole } from "@/lib/access-control";
import type { UserRole } from "@/types/auth";

export type AssignmentGroup = { classIds: string[]; teacherId: string };
export type AssignmentPair = { classId: string; teacherId: string };

export function expandAssignmentGroups(groups: AssignmentGroup[]): AssignmentPair[] {
  const pairs = groups.flatMap((group) => [...new Set(group.classIds)].map((classId) => ({ classId, teacherId: group.teacherId })));
  const seen = new Set<string>();
  return pairs.filter((pair) => {
    const key = `${pair.teacherId}:${pair.classId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function canAssignPair(input: { actorId: string; actorRole: UserRole; destinationHasScope: boolean; destinationTeacherId: string; hasScope: boolean; scopeException: boolean }) {
  if (isAdminRole(input.actorRole)) return input.destinationHasScope || input.scopeException;
  if (isPrivilegedRole(input.actorRole)) return input.destinationHasScope;
  if (input.actorRole === "coordenador") return input.hasScope && input.destinationHasScope;
  return input.actorRole === "professor" && input.actorId === input.destinationTeacherId && input.hasScope;
}
