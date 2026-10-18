
import { Suspense } from "react"
import AcceptTeamInvitationClient from "./accept-team-invitation-client"

export default function AcceptTeamInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="flex items-center gap-3 text-white/60">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-rose-400" />
            Loading invitation…
          </div>
        </main>
      }
    >
      <AcceptTeamInvitationClient />
    </Suspense>
  )
}
