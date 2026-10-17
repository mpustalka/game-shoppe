import type {
  CompanyRole,
} from "@/lib/company-auth"

export const BUSINESS_PERMISSION_KEYS = [
  "inventory.view",
  "inventory.manage",
  "inventory.delete",

  "cards.add",
  "cards.import",
  "cards.export",
  "cards.scan",

  "binders.view",
  "binders.manage",

  "analytics.view",

  "team.view",
  "team.manage",

  "integrations.view",
  "integrations.manage",

  "billing.view",
  "billing.manage",

  "settings.view",
  "settings.manage",

  "support.view",
  "support.manage",

  "virtual_employee.view",
  "virtual_employee.manage",

  "activity.view",
] as const

export type BusinessPermission =
  (typeof BUSINESS_PERMISSION_KEYS)[number]

export type BusinessPermissions =
  Partial<
    Record<
      BusinessPermission,
      boolean
    >
  >

const OWNER_PERMISSIONS: Record<
  BusinessPermission,
  boolean
> = Object.fromEntries(
  BUSINESS_PERMISSION_KEYS.map(
    (permission) => [
      permission,
      true,
    ],
  ),
) as Record<
  BusinessPermission,
  boolean
>

const MANAGER_PERMISSIONS: Record<
  BusinessPermission,
  boolean
> = {
  "inventory.view": true,
  "inventory.manage": true,
  "inventory.delete": true,

  "cards.add": true,
  "cards.import": true,
  "cards.export": true,
  "cards.scan": true,

  "binders.view": true,
  "binders.manage": true,

  "analytics.view": true,

  "team.view": true,
  "team.manage": true,

  "integrations.view": true,
  "integrations.manage": true,

  "billing.view": true,
  "billing.manage": false,

  "settings.view": true,
  "settings.manage": true,

  "support.view": true,
  "support.manage": true,

  "virtual_employee.view": true,
  "virtual_employee.manage": true,

  "activity.view": true,
}

const EMPLOYEE_PERMISSIONS: Record<
  BusinessPermission,
  boolean
> = {
  "inventory.view": true,
  "inventory.manage": true,
  "inventory.delete": false,

  "cards.add": true,
  "cards.import": false,
  "cards.export": false,
  "cards.scan": false,

  "binders.view": true,
  "binders.manage": true,

  "analytics.view": false,

  "team.view": false,
  "team.manage": false,

  "integrations.view": false,
  "integrations.manage": false,

  "billing.view": false,
  "billing.manage": false,

  "settings.view": false,
  "settings.manage": false,

  "support.view": true,
  "support.manage": false,

  "virtual_employee.view": false,
  "virtual_employee.manage": false,

  "activity.view": false,
}

export function defaultBusinessPermissions(
  role: CompanyRole,
): Record<
  BusinessPermission,
  boolean
> {
  if (role === "owner") {
    return {
      ...OWNER_PERMISSIONS,
    }
  }

  if (role === "manager") {
    return {
      ...MANAGER_PERMISSIONS,
    }
  }

  return {
    ...EMPLOYEE_PERMISSIONS,
  }
}

/**
 * Resolve the final permissions for a company member.
 *
 * Role defaults establish the baseline.
 * Explicit values stored in company_members.permissions
 * override that baseline.
 *
 * Owners always retain every permission so an accidental
 * JSON value cannot lock the business owner out.
 */
export function resolveBusinessPermissions(
  role: CompanyRole,
  overrides?: Record<
    string,
    unknown
  > | null,
): Record<
  BusinessPermission,
  boolean
> {
  const permissions =
    defaultBusinessPermissions(
      role,
    )

  if (role === "owner") {
    return permissions
  }

  if (!overrides) {
    return permissions
  }

  for (const key of BUSINESS_PERMISSION_KEYS) {
    const value =
      overrides[key]

    if (
      typeof value ===
      "boolean"
    ) {
      permissions[key] =
        value
    }
  }

  return permissions
}

export function hasBusinessPermission(
  role: CompanyRole,
  overrides:
    | Record<string, unknown>
    | null
    | undefined,
  permission: BusinessPermission,
) {
  return resolveBusinessPermissions(
    role,
    overrides,
  )[permission]
}

