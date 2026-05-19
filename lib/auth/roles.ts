import type { UserRole } from "@/types/auth";

export const USER_ROLES = ["user", "venue", "admin"] as const satisfies readonly UserRole[];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
