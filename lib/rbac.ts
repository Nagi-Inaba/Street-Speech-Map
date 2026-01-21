export type Role = "SiteAdmin" | "SiteStaff" | "PartyAdmin" | "RegionEditor";

export interface UserRole {
  role: string; // 実行時には文字列として扱う
  region?: string | null;
}

function isValidRole(role: string): role is Role {
  return ["SiteAdmin", "SiteStaff", "PartyAdmin", "RegionEditor"].includes(role);
}

export function hasPermission(
  userRole: UserRole | null | undefined,
  requiredRole: Role | Role[]
): boolean {
  if (!userRole || !userRole.role) return false;

  const requiredRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  const roleHierarchy: Record<Role, number> = {
    SiteAdmin: 4,
    SiteStaff: 3,
    PartyAdmin: 2,
    RegionEditor: 1,
  };

  // ロールが有効かチェック
  if (!isValidRole(userRole.role)) {
    return false;
  }

  const userLevel = roleHierarchy[userRole.role] || 0;

  return requiredRoles.some(
    (role) => roleHierarchy[role] <= userLevel
  );
}

export function canManageCandidate(
  userRole: UserRole | null | undefined,
  candidateRegion?: string | null
): boolean {
  if (!userRole || !userRole.role) return false;

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
