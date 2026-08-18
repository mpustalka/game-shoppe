import type { User } from "@supabase/supabase-js"

export const ADMIN_EMAIL = "admin@evileevee.com"

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false

  return user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()
}

// import type { User } from "@supabase/supabase-js"

// // The single owner/admin account for the platform. Anyone signed in with this
// // email — or explicitly flagged via metadata — gets access to the admin portal
// // and its user-management APIs.
// export const ADMIN_EMAIL = "admin@evileevee.com"

// // True when the given Supabase user is the platform admin. We match on the
// // well-known owner email (case-insensitive) and also honor an `is_admin` flag
// // stored in user/app metadata, so additional admins can be promoted later
// // without code changes.
// export function isAdminUser(user: User | null | undefined): boolean {
//   if (!user) return false

//   const email = user.email?.toLowerCase().trim()
//   if (email === ADMIN_EMAIL) return true

//   const userFlag = user.user_metadata?.is_admin === true
//   const appFlag = (user.app_metadata as { is_admin?: boolean })?.is_admin === true

//   return userFlag || appFlag
// }
