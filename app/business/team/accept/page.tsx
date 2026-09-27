"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"
import {
  useRouter,
  useSearchParams,
} from "next/navigation"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AcceptState =
  | "loading"
  | "success"
  | "error"

export default function AcceptTeamInvitationPage() {
  const router = useRouter()
  const searchParams =
    useSearchParams()

  const invitationId =
    searchParams.get("invitation")

  const started =
    useRef(false)

  const [state, setState] =
    useState<AcceptState>("loading")

  const [message, setMessage] =
    useState(
      "We're adding you to the business account.",
    )

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    async function acceptInvitation() {
      if (!invitationId) {
        setState("error")
        setMessage(
          "This invitation link is missing its invitation ID.",
        )
        return
      }

      try {
        const response =
          await fetch(
            "/api/business/team/accept",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                invitationId,
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
              "Unable to accept this invitation.",
          )
        }

        setState("success")

        setMessage(
          result?.company?.name
            ? `You've joined ${result.company.name}.`
            : "You've joined the business account.",
        )

        window.setTimeout(() => {
          router.replace("/business")
          router.refresh()
        }, 1200)
      } catch (error) {
        setState("error")

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to accept this invitation.",
        )
      }
    }

    void acceptInvitation()
  }, [
    invitationId,
    router,
  ])

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg border-white/10 bg-[#101013] text-white shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            {state === "loading" && (
              <Loader2 className="h-7 w-7 animate-spin text-rose-400" />
            )}

            {state === "success" && (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            )}

            {state === "error" && (
              <AlertCircle className="h-7 w-7 text-red-400" />
            )}
          </div>

          <CardTitle className="text-2xl">
            {state === "loading" &&
              "Accepting invitation"}

            {state === "success" &&
              "Welcome to the team"}

            {state === "error" &&
              "Invitation problem"}
          </CardTitle>

          <CardDescription className="text-white/50">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state === "loading" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/50">
              Please don't close this page while
              we finish setting up your
              business access.
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <Building2 className="h-5 w-5 shrink-0 text-emerald-400" />

                <p className="text-sm text-emerald-100">
                  Your business membership is
                  active. Redirecting you to
                  your business dashboard…
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  router.replace(
                    "/business",
                  )
                  router.refresh()
                }}
              >
                Continue to business dashboard
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                {message}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  router.push("/login")
                }
              >
                Go to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
