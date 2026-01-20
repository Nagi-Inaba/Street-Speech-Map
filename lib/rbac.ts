export type Role = "SiteAdmin" | "SiteStaff" | "PartyAdmin" | "RegionEditor";

export interface UserRole {
  role: Role;
  region?: string | null;
}

export function hasPermission(
  userRole: UserRole | null,
  requiredRole: Role | Role[]
): boolean {
  if (!userRole) return false;

  const requiredRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  const roleHierarchy: Record<Role, number> = {
    SiteAdmin: 4,
    SiteStaff: 3,
    PartyAdmin: 2,
    RegionEditor: 1,
  };

  const userLevel = roleHierarchy[userRole.role] || 0;

  return requiredRoles.some(
    (role) => roleHierarchy[role] <= userLevel
  );
}

export function canManageCandidate(
  userRole: UserRole | null,
  candidateRegion?: string | null
): boolean {
  if (!userRole) return false;

  // SiteAdmin, SiteStaff, PartyAdmin は全候補者を管理可能
  if (
    userRole.role === "SiteAdmin" ||
    userRole.role === "SiteStaff" ||
    userRole.role === "PartyAdmin"
  ) {
    return true;
  }

  // RegionEditor は自分の地域のみ
  if (userRole.role === "RegionEditor") {
    return userRole.region === candidateRegion;
  }

  return false;
}
