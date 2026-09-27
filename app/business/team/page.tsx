"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type Role =
  | "owner"
  | "manager"
  | "employee"

type Member = {
  id: string
  userId: string
  email: string | null
  fullName: string | null
  role: Role
  status: string
  permissions: Record<
    string,
    boolean
  >
  permissionOverrides?: Record<
    string,
    boolean
  >
  joinedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  isCurrentUser?: boolean
}

type Invitation = {
  id: string
  email: string
  role: Role
  status: string
  permissions: Record<
    string,
    boolean
  >
  invitedAt?: string | null
  expiresAt?: string | null
}

type TeamResponse = {
  company: {
    id: string
    name: string | null
    subscriptionStatus?: string | null
    subscriptionPlan?: string | null
    trialPlan?: string | null
  }
  currentUser: {
    id: string
    role: Role
    canManageTeam: boolean
  }
  seats: {
    included: number
    used: number
    available: number
  }
  members: Member[]
  invitations: Invitation[]
}

type PermissionDefinition = {
  key: string
  label: string
  description: string
  group: string
}

const PERMISSIONS: PermissionDefinition[] = [
  {
    key: "inventory.view",
    label: "View inventory",
    description:
      "View company inventory and card details.",
    group: "Inventory & Cards",
  },
  {
    key: "inventory.manage",
    label: "Manage inventory",
    description:
      "Edit quantities, prices, conditions, and inventory data.",
    group: "Inventory & Cards",
  },
  {
    key: "inventory.delete",
    label: "Delete inventory",
    description:
      "Permanently remove cards from company inventory.",
    group: "Inventory & Cards",
  },
  {
    key: "cards.add",
    label: "Add cards",
    description:
      "Add cards manually or through card search.",
    group: "Inventory & Cards",
  },
  {
    key: "cards.import",
    label: "Import cards",
    description:
      "Import inventory from supported files and sources.",
    group: "Inventory & Cards",
  },
  {
    key: "cards.export",
    label: "Export cards",
    description:
      "Export company inventory and card data.",
    group: "Inventory & Cards",
  },
  {
    key: "cards.scan",
    label: "Scan cards",
    description:
      "Use supported scanning tools.",
    group: "Inventory & Cards",
  },
  {
    key: "binders.view",
    label: "View binders",
    description:
      "View company binders.",
    group: "Binders",
  },
  {
    key: "binders.manage",
    label: "Manage binders",
    description:
      "Create, edit, and organize company binders.",
    group: "Binders",
  },
  {
    key: "analytics.view",
    label: "View analytics",
    description:
      "View company inventory and sales analytics.",
    group: "Analytics",
  },
  {
    key: "team.view",
    label: "View team",
    description:
      "View company members and invitations.",
    group: "Team",
  },
  {
    key: "team.manage",
    label: "Manage team",
    description:
      "Invite and manage company employees.",
    group: "Team",
  },
  {
    key: "integrations.view",
    label: "View integrations",
    description:
      "View connected sales and business platforms.",
    group: "Integrations",
  },
  {
    key: "integrations.manage",
    label: "Manage integrations",
    description:
      "Connect, disconnect, and configure integrations.",
    group: "Integrations",
  },
  {
    key: "billing.view",
    label: "View billing",
    description:
      "View the company's plan and billing information.",
    group: "Billing",
  },
  {
    key: "billing.manage",
    label: "Manage billing",
    description:
      "Change plans and manage billing settings.",
    group: "Billing",
  },
  {
    key: "settings.view",
    label: "View settings",
    description:
      "View company settings.",
    group: "Business Settings",
  },
  {
    key: "settings.manage",
    label: "Manage settings",
    description:
      "Change company information and configuration.",
    group: "Business Settings",
  },
  {
    key: "support.view",
    label: "View support",
    description:
      "View company support requests.",
    group: "Support",
  },
  {
    key: "support.manage",
    label: "Manage support",
    description:
      "Open and manage support requests.",
    group: "Support",
  },
  {
    key: "virtual_employee.view",
    label: "View virtual employee",
    description:
      "View virtual employee activity and assignments.",
    group: "Virtual Employee",
  },
  {
    key: "virtual_employee.manage",
    label: "Manage virtual employee",
    description:
      "Assign work and manage virtual employee services.",
    group: "Virtual Employee",
  },
  {
    key: "activity.view",
    label: "View activity",
    description:
      "View business and team activity.",
    group: "Activity",
  },
]

const EMPLOYEE_DEFAULTS =
  permissionObject([
    "inventory.view",
    "inventory.manage",
    "cards.add",
    "binders.view",
    "binders.manage",
    "analytics.view",
    "team.view",
    "integrations.view",
    "settings.view",
    "support.view",
    "activity.view",
  ])

const MANAGER_DEFAULTS =
  permissionObject(
    PERMISSIONS.map(
      (permission) =>
        permission.key,
    ).filter(
      (key) =>
        key !== "billing.manage",
    ),
  )

function permissionObject(
  enabled: string[],
) {
  const enabledSet =
    new Set(enabled)

  return Object.fromEntries(
    PERMISSIONS.map(
      ({ key }) => [
        key,
        enabledSet.has(key),
      ],
    ),
  )
}

function defaultsForRole(
  role: Role,
) {
  if (role === "manager") {
    return {
      ...MANAGER_DEFAULTS,
    }
  }

  if (role === "owner") {
    return permissionObject(
      PERMISSIONS.map(
        (permission) =>
          permission.key,
      ),
    )
  }

  return {
    ...EMPLOYEE_DEFAULTS,
  }
}

function roleLabel(
  role: Role,
) {
  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  )
}

function dateLabel(
  value?: string | null,
) {
  if (!value) return "—"

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—"
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(date)
}

function roleBadgeClass(
  role: Role,
) {
  if (role === "owner") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200"
  }

  if (role === "manager") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-200"
  }

  return "border-sky-400/20 bg-sky-400/10 text-sky-200"
}

function statusBadgeClass(
  status: string,
) {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
  }

  if (status === "suspended") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200"
  }

  return "border-white/10 bg-white/[0.05] text-white/60"
}

export default function BusinessTeamPage() {
  const [data, setData] =
    useState<TeamResponse | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false)

  const [
    editMember,
    setEditMember,
  ] =
    useState<Member | null>(
      null,
    )

  const [
    removeMember,
    setRemoveMember,
  ] =
    useState<Member | null>(
      null,
    )

  const [
    busyMemberId,
    setBusyMemberId,
  ] =
    useState<string | null>(
      null,
    )

  const loadTeam =
    useCallback(async () => {
      try {
        setError(null)

        const response =
          await fetch(
            "/api/business/team",
            {
              cache: "no-store",
            },
          )

        const result =
          await response
            .json()
            .catch(() => null)

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load team.",
          )
        }

        setData(
          result as TeamResponse,
        )
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load team.",
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  const seatPercent =
    useMemo(() => {
      if (!data) return 0

      if (
        data.seats.included <= 0
      ) {
        return 0
      }

      return Math.min(
        100,
        Math.round(
          (data.seats.used /
            data.seats.included) *
            100,
        ),
      )
    }, [data])

  async function updateStatus(
    member: Member,
    status:
      | "active"
      | "suspended",
  ) {
    setBusyMemberId(
      member.id,
    )

    try {
      const response =
        await fetch(
          `/api/business/team/${member.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              status,
            }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to update member.",
        )
      }

      await loadTeam()
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update member.",
      )
    } finally {
      setBusyMemberId(null)
    }
  }

  async function confirmRemove() {
    if (!removeMember) {
      return
    }

    setBusyMemberId(
      removeMember.id,
    )

    try {
      const response =
        await fetch(
          `/api/business/team/${removeMember.id}`,
          {
            method: "DELETE",
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to remove member.",
        )
      }

      setRemoveMember(null)
      await loadTeam()
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove member.",
      )
    } finally {
      setBusyMemberId(null)
    }
  }

  async function cancelInvitation(
    invitation: Invitation,
  ) {
    try {
      const response =
        await fetch(
          `/api/business/team/invitations/${invitation.id}`,
          {
            method: "DELETE",
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to cancel invitation.",
        )
      }

      await loadTeam()
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel invitation.",
      )
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08080a] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading team…
          </div>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#08080a] text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Card className="border-red-400/20 bg-red-400/[0.05]">
            <CardContent className="flex gap-3 p-6 text-red-100">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Team unavailable
                </p>
                <p className="mt-1 text-sm text-red-100/70">
                  {error ??
                    "Unable to load your business team."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const canManage =
    data.currentUser
      .canManageTeam

  return (
    <main className="min-h-screen bg-[#08080a] text-white">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.035] to-transparent">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="mb-4 border-rose-400/20 bg-rose-400/10 text-rose-200">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Business Team
              </Badge>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Team & Permissions
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
                Manage who can access{" "}
                <span className="font-semibold text-white/80">
                  {data.company.name ??
                    "your business"}
                </span>
                , assign roles, and control exactly what each team member can do.
              </p>
            </div>

            {canManage && (
              <Button
                onClick={() =>
                  setInviteOpen(
                    true,
                  )
                }
                disabled={
                  data.seats
                    .available <= 0
                }
                className="h-11 rounded-xl bg-rose-500 px-5 font-bold text-white hover:bg-rose-400 disabled:bg-white/10 disabled:text-white/30"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Team Member
              </Button>
            )}
          </div>
        </section>

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-100">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              onClick={() =>
                setError(null)
              }
              className="text-red-100/50 hover:text-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={Users}
            label="Seats used"
            value={`${data.seats.used} / ${data.seats.included}`}
            detail={`${data.seats.available} available`}
          />

          <MetricCard
            icon={ShieldCheck}
            label="Your role"
            value={roleLabel(
              data.currentUser.role,
            )}
            detail={
              canManage
                ? "Team management enabled"
                : "Limited team access"
            }
          />

          <MetricCard
            icon={Mail}
            label="Pending invites"
            value={String(
              data.invitations
                .length,
            )}
            detail={
              data.invitations
                .length === 1
                ? "Invitation awaiting acceptance"
                : "Invitations awaiting acceptance"
            }
          />
        </section>

        <Card className="overflow-hidden border-white/10 bg-white/[0.035] text-white">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Seat usage
                </CardTitle>
                <CardDescription className="mt-1 text-white/40">
                  Your current business plan includes{" "}
                  {data.seats.included} team{" "}
                  {data.seats.included ===
                  1
                    ? "seat"
                    : "seats"}
                  .
                </CardDescription>
              </div>

              <Badge className="w-fit border-white/10 bg-white/[0.06] text-white/70">
                {data.company
                  .subscriptionPlan ??
                  data.company
                    .trialPlan ??
                  "Business"}{" "}
                plan
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <Progress
              value={seatPercent}
              className="h-2.5 bg-white/10"
            />

            <div className="mt-3 flex justify-between text-xs text-white/40">
              <span>
                {data.seats.used}{" "}
                active{" "}
                {data.seats.used ===
                1
                  ? "member"
                  : "members"}
              </span>
              <span>
                {data.seats.available}{" "}
                seats remaining
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-white/[0.035] text-white">
          <CardHeader>
            <CardTitle>
              Team members
            </CardTitle>
            <CardDescription className="text-white/40">
              Active and suspended members of your business.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-white/10">
              {data.members.map(
                (member) => (
                  <div
                    key={
                      member.id
                    }
                    className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] font-black text-white/70">
                        {(
                          member.fullName ||
                          member.email ||
                          "U"
                        )
                          .charAt(
                            0,
                          )
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-white">
                            {member.fullName ||
                              member.email ||
                              "Team member"}
                          </p>

                          {member.isCurrentUser && (
                            <Badge className="border-white/10 bg-white/[0.06] text-[10px] text-white/50">
                              You
                            </Badge>
                          )}
                        </div>

                        {member.email &&
                          member.fullName && (
                            <p className="mt-1 truncate text-sm text-white/35">
                              {
                                member.email
                              }
                            </p>
                          )}

                        <p className="mt-1 text-xs text-white/25">
                          Joined{" "}
                          {dateLabel(
                            member.joinedAt ??
                              member.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={roleBadgeClass(
                          member.role,
                        )}
                      >
                        {member.role ===
                        "owner" ? (
                          <ShieldCheck className="mr-1 h-3 w-3" />
                        ) : (
                          <Shield className="mr-1 h-3 w-3" />
                        )}
                        {roleLabel(
                          member.role,
                        )}
                      </Badge>

                      <Badge
                        className={statusBadgeClass(
                          member.status,
                        )}
                      >
                        {member.status}
                      </Badge>

                      {canManage &&
                        member.role !==
                          "owner" && (
                          <MemberMenu
                            member={
                              member
                            }
                            busy={
                              busyMemberId ===
                              member.id
                            }
                            onEdit={() =>
                              setEditMember(
                                member,
                              )
                            }
                            onSuspend={() =>
                              void updateStatus(
                                member,
                                "suspended",
                              )
                            }
                            onReactivate={() =>
                              void updateStatus(
                                member,
                                "active",
                              )
                            }
                            onRemove={() =>
                              setRemoveMember(
                                member,
                              )
                            }
                          />
                        )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-white/[0.035] text-white">
          <CardHeader>
            <CardTitle>
              Pending invitations
            </CardTitle>
            <CardDescription className="text-white/40">
              Invitations that have not yet been accepted.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {data.invitations
              .length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Mail className="mx-auto h-8 w-8 text-white/15" />
                <p className="mt-3 font-medium text-white/60">
                  No pending invitations
                </p>
                <p className="mt-1 text-sm text-white/30">
                  New invitations will appear here until they are accepted or canceled.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {data.invitations.map(
                  (
                    invitation,
                  ) => (
                    <div
                      key={
                        invitation.id
                      }
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">
                          {
                            invitation.email
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            className={roleBadgeClass(
                              invitation.role,
                            )}
                          >
                            {roleLabel(
                              invitation.role,
                            )}
                          </Badge>

                          <span className="flex items-center gap-1 text-xs text-white/30">
                            <Clock3 className="h-3.5 w-3.5" />
                            Expires{" "}
                            {dateLabel(
                              invitation.expiresAt,
                            )}
                          </span>
                        </div>
                      </div>

                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void cancelInvitation(
                              invitation,
                            )
                          }
                          className="border-white/10 bg-white/[0.04] text-white/70 hover:bg-red-400/10 hover:text-red-200"
                        >
                          Cancel invitation
                        </Button>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={
          setInviteOpen
        }
        availableSeats={
          data.seats.available
        }
        currentRole={
          data.currentUser.role
        }
        onSuccess={
          loadTeam
        }
      />

      <EditMemberDialog
        member={editMember}
        currentRole={
          data.currentUser.role
        }
        onClose={() =>
          setEditMember(null)
        }
        onSuccess={async () => {
          setEditMember(null)
          await loadTeam()
        }}
      />

      <Dialog
        open={Boolean(
          removeMember,
        )}
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setRemoveMember(
              null,
            )
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#111114] text-white">
          <DialogHeader>
            <DialogTitle>
              Remove team member?
            </DialogTitle>
            <DialogDescription className="text-white/45">
              {removeMember
                ?.fullName ||
                removeMember
                  ?.email ||
                "This member"}{" "}
              will immediately lose access to this business.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRemoveMember(
                  null,
                )
              }
              className="border-white/10 bg-white/[0.04] text-white"
            >
              Cancel
            </Button>

            <Button
              onClick={() =>
                void confirmRemove()
              }
              disabled={
                Boolean(
                  removeMember &&
                    busyMemberId ===
                      removeMember.id,
                )
              }
              className="bg-red-500 text-white hover:bg-red-400"
            >
              {removeMember &&
              busyMemberId ===
                removeMember.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="border-white/10 bg-white/[0.035] text-white">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/15 bg-rose-400/10 text-rose-300">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/30">
            {label}
          </p>
          <p className="mt-1 text-xl font-black">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-white/30">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function MemberMenu({
  member,
  busy,
  onEdit,
  onSuspend,
  onReactivate,
  onRemove,
}: {
  member: Member
  busy: boolean
  onEdit: () => void
  onSuspend: () => void
  onReactivate: () => void
  onRemove: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
      >
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          className="h-9 w-9 rounded-xl text-white/50 hover:bg-white/10 hover:text-white"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 border-white/10 bg-[#111114] text-white"
      >
        <DropdownMenuItem
          onSelect={onEdit}
          className="focus:bg-white/10 focus:text-white"
        >
          <Shield className="mr-2 h-4 w-4" />
          Role & permissions
        </DropdownMenuItem>

        {member.status ===
        "suspended" ? (
          <DropdownMenuItem
            onSelect={
              onReactivate
            }
            className="focus:bg-white/10 focus:text-white"
          >
            <Check className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={
              onSuspend
            }
            className="focus:bg-white/10 focus:text-white"
          >
            <Clock3 className="mr-2 h-4 w-4" />
            Suspend access
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onSelect={onRemove}
          className="text-red-300 focus:bg-red-400/10 focus:text-red-200"
        >
          <X className="mr-2 h-4 w-4" />
          Remove member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function InviteDialog({
  open,
  onOpenChange,
  availableSeats,
  currentRole,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (
    open: boolean,
  ) => void
  availableSeats: number
  currentRole: Role
  onSuccess: () => Promise<void>
}) {
  const [email, setEmail] =
    useState("")

  const [role, setRole] =
    useState<Role>("employee")

  const [
    permissions,
    setPermissions,
  ] = useState<
    Record<string, boolean>
  >(
    defaultsForRole(
      "employee",
    ),
  )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  function changeRole(
    nextRole: Role,
  ) {
    setRole(nextRole)
    setPermissions(
      defaultsForRole(nextRole),
    )
  }

  async function submit() {
    if (!email.trim()) {
      setError(
        "Enter an email address.",
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response =
        await fetch(
  "/api/business/team/invite",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email:
                email.trim(),
              role,
              permissions,
            }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to send invitation.",
        )
      }

      setEmail("")
      changeRole(
        "employee",
      )
      onOpenChange(false)
      await onSuccess()
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to send invitation.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-[#111114] text-white">
        <DialogHeader>
          <DialogTitle>
            Invite team member
          </DialogTitle>
          <DialogDescription className="text-white/45">
            Invite an employee and choose exactly what they can access.
            You have{" "}
            {availableSeats}{" "}
            {availableSeats === 1
              ? "seat"
              : "seats"}{" "}
            available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Email address
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                placeholder="employee@example.com"
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(
                  value,
                ) =>
                  changeRole(
                    value as Role,
                  )
                }
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#151519] text-white">
                  <SelectItem value="employee">
                    Employee
                  </SelectItem>

                  {currentRole ===
                    "owner" && (
                    <SelectItem value="manager">
                      Manager
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PermissionEditor
            permissions={
              permissions
            }
            onChange={
              setPermissions
            }
            disableBillingManage
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              onOpenChange(
                false,
              )
            }
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            onClick={() =>
              void submit()
            }
            disabled={
              saving ||
              availableSeats <= 0
            }
            className="bg-rose-500 font-bold text-white hover:bg-rose-400"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditMemberDialog({
  member,
  currentRole,
  onClose,
  onSuccess,
}: {
  member: Member | null
  currentRole: Role
  onClose: () => void
  onSuccess: () => Promise<void>
}) {
  const [role, setRole] =
    useState<Role>("employee")

  const [
    permissions,
    setPermissions,
  ] = useState<
    Record<string, boolean>
  >({})

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    if (!member) return

    setRole(member.role)
    setPermissions({
      ...member.permissions,
    })
    setError(null)
  }, [member])

  async function save() {
    if (!member) return

    setSaving(true)
    setError(null)

    try {
      const response =
        await fetch(
          `/api/business/team/${member.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              role,
              permissions,
            }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to update member.",
        )
      }

      await onSuccess()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update member.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-[#111114] text-white">
        <DialogHeader>
          <DialogTitle>
            Role & permissions
          </DialogTitle>
          <DialogDescription className="text-white/45">
            Manage access for{" "}
            {member?.fullName ||
              member?.email ||
              "this team member"}
            .
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="space-y-6 py-3">
            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Role</Label>

              <Select
                value={role}
                onValueChange={(
                  value,
                ) => {
                  const next =
                    value as Role

                  setRole(next)

                  setPermissions(
                    defaultsForRole(
                      next,
                    ),
                  )
                }}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#151519] text-white">
                  <SelectItem value="employee">
                    Employee
                  </SelectItem>

                  {currentRole ===
                    "owner" && (
                    <SelectItem value="manager">
                      Manager
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <PermissionEditor
              permissions={
                permissions
              }
              onChange={
                setPermissions
              }
              disableBillingManage
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            onClick={() =>
              void save()
            }
            disabled={saving}
            className="bg-rose-500 font-bold text-white hover:bg-rose-400"
          >
            {saving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PermissionEditor({
  permissions,
  onChange,
  disableBillingManage,
}: {
  permissions: Record<
    string,
    boolean
  >
  onChange: (
    permissions: Record<
      string,
      boolean
    >,
  ) => void
  disableBillingManage?: boolean
}) {
  const groups =
    useMemo(() => {
      const result =
        new Map<
          string,
          PermissionDefinition[]
        >()

      for (const permission of PERMISSIONS) {
        const current =
          result.get(
            permission.group,
          ) ?? []

        current.push(
          permission,
        )

        result.set(
          permission.group,
          current,
        )
      }

      return Array.from(
        result.entries(),
      )
    }, [])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          Permissions
        </h3>
        <p className="mt-1 text-sm text-white/40">
          Choose which business areas this member can access.
        </p>
      </div>

      <div className="space-y-3">
        {groups.map(
          ([group, items]) => (
            <div
              key={group}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                {group}
              </p>

              <div className="space-y-4">
                {items.map(
                  (
                    permission,
                  ) => {
                    const disabled =
                      disableBillingManage &&
                      permission.key ===
                        "billing.manage"

                    return (
                      <div
                        key={
                          permission.key
                        }
                        className="flex items-start justify-between gap-5"
                      >
                        <div>
                          <Label
                            htmlFor={
                              permission.key
                            }
                            className="text-sm font-medium text-white/80"
                          >
                            {
                              permission.label
                            }
                          </Label>

                          <p className="mt-1 max-w-xl text-xs leading-5 text-white/30">
                            {
                              permission.description
                            }
                          </p>
                        </div>

                        <Switch
                          id={
                            permission.key
                          }
                          checked={
                            Boolean(
                              permissions[
                                permission
                                  .key
                              ],
                            )
                          }
                          disabled={
                            disabled
                          }
                          onCheckedChange={(
                            checked,
                          ) =>
                            onChange({
                              ...permissions,
                              [permission.key]:
                                checked,
                            })
                          }
                        />
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
