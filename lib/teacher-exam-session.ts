import "server-only";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { isAcademicManagementRole } from "@/lib/access-control";
import { validateSessionToken } from "@/lib/server-session";

export async function getExamSession() {
  const validation = await validateSessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!validation.ok) return null;
  return {
    id: validation.session.id,
    institutionalView: isAcademicManagementRole(validation.session.role),
    name: validation.session.nome,
    role: validation.session.role,
  };
}
