/**
 * Inventory-specific permission checks.
 * Extracted from api/inventory/approvals/route.ts
 */

export function hasApprovalRole(userRoles: string[], requiredRole: string): boolean {
  const normalizedRoles = userRoles.map((role) => role.toUpperCase());
  return normalizedRoles.includes('ADMIN') || normalizedRoles.includes(requiredRole.toUpperCase());
}
