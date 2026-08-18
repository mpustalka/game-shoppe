import "server-only"

import { Resend } from "resend"

import type { SubscriptionTier } from "@/lib/entitlements"

const RESEND_API_KEY = process.env.RESEND_API_KEY

const EMAIL_FROM =
  process.env.EMAIL_FROM || "Card Vault <notifications@updates.evileevee.com>"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const SUPPORT_EMAIL = "admin@evileevee.com"

let resendClient: Resend | null = null

function getResend() {
  if (!RESEND_API_KEY) {
    return null
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY)
  }

  return resendClient
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function planLabel(plan: SubscriptionTier) {
  return plan === "basic" ? "Basic" : "Premium"
}

function emailLayout({
  title,
  preheader,
  body,
}: {
  title: string
  preheader: string
  body: string
}) {
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>${escapeHtml(title)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>
  <div
    style="
      display:none;
      max-height:0;
      overflow:hidden;
      opacity:0;
    "
  >
    ${escapeHtml(preheader)}
  </div>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="
      width:100%;
      background:#f5f5f5;
      padding:32px 16px;
    "
  >
    <tr>
      <td align="center">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid #e5e7eb;
          "
        >
          <tr>
            <td
              style="
                padding:24px 28px;
                background:#111827;
                color:#ffffff;
              "
            >
              <div
                style="
                  font-size:22px;
                  font-weight:700;
                "
              >
                Card Vault
              </div>

              <div
                style="
                  margin-top:4px;
                  font-size:13px;
                  color:#d1d5db;
                "
              >
                Pokémon Card Inventory Management
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 28px;">
              <h1
                style="
                  margin:0 0 18px;
                  font-size:24px;
                  line-height:1.3;
                "
              >
                ${escapeHtml(title)}
              </h1>

              ${body}

              <div
                style="
                  margin-top:28px;
                  padding-top:20px;
                  border-top:1px solid #e5e7eb;
                  font-size:12px;
                  line-height:1.6;
                  color:#6b7280;
                "
              >
                Questions? Contact
                <a
                  href="mailto:${SUPPORT_EMAIL}"
                  style="color:#111827;"
                >
                  ${SUPPORT_EMAIL}
                </a>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const resend = getResend()

  if (!resend) {
    console.warn(
      `Email skipped because RESEND_API_KEY is not configured. Recipient: ${to}`,
    )

    return {
      sent: false,
      skipped: true,
    }
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject,
    html,
    text,
    replyTo: SUPPORT_EMAIL,
  })

  if (error) {
    console.error("Resend email error:", error)

    throw new Error(error.message || "Email delivery failed")
  }

  return {
    sent: true,
    skipped: false,
    id: data?.id ?? null,
  }
}

/**
 * SUBSCRIPTION ACTIVATED / EXTENDED
 */
export async function sendSubscriptionGrantedEmail({
  email,
  plan,
  paidUntil,
  months,
}: {
  email: string
  plan: SubscriptionTier
  paidUntil: string
  months: number
}) {
  const label = planLabel(plan)

  const title = `${label} access activated`

  const html = emailLayout({
    title,

    preheader: `Your Card Vault ${label} subscription is active.`,

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          Your Card Vault subscription has been updated successfully.
        </p>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:20px 0;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:10px;
          "
        >
          <tr>
            <td style="padding:18px;">
              <div style="margin-bottom:10px;">
                <strong>Plan:</strong>
                ${escapeHtml(label)}
              </div>

              <div style="margin-bottom:10px;">
                <strong>Added:</strong>
                ${months}
                month${months === 1 ? "" : "s"}
              </div>

              <div>
                <strong>Access through:</strong>
                ${escapeHtml(formatDate(paidUntil))}
              </div>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0;">
          <a
            href="${APP_URL}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111827;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:600;
            "
          >
            Open Card Vault
          </a>
        </p>
      `,
  })

  const text = [
    `Your Card Vault ${label} subscription is active.`,
    "",
    `Plan: ${label}`,
    `Added: ${months} month${months === 1 ? "" : "s"}`,
    `Access through: ${formatDate(paidUntil)}`,
    "",
    `Open Card Vault: ${APP_URL}`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: `Card Vault ${label} subscription activated`,
    html,
    text,
  })
}

/**
 * BASIC <-> PREMIUM
 */
export async function sendSubscriptionPlanChangedEmail({
  email,
  previousPlan,
  newPlan,
  paidUntil,
}: {
  email: string
  previousPlan: SubscriptionTier | null
  newPlan: SubscriptionTier
  paidUntil: string | null
}) {
  const previous = previousPlan ? planLabel(previousPlan) : "Previous plan"

  const next = planLabel(newPlan)

  const title = `Your plan changed to ${next}`

  const html = emailLayout({
    title,

    preheader: `Your Card Vault subscription is now ${next}.`,

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          An administrator updated your Card Vault subscription.
        </p>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:20px 0;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:10px;
          "
        >
          <tr>
            <td style="padding:18px;">
              <div style="margin-bottom:10px;">
                <strong>Previous plan:</strong>
                ${escapeHtml(previous)}
              </div>

              <div style="margin-bottom:10px;">
                <strong>New plan:</strong>
                ${escapeHtml(next)}
              </div>

              <div>
                <strong>Paid through:</strong>
                ${escapeHtml(formatDate(paidUntil))}
              </div>
            </td>
          </tr>
        </table>
      `,
  })

  const text = [
    `Your Card Vault plan changed to ${next}.`,
    "",
    `Previous plan: ${previous}`,
    `New plan: ${next}`,
    `Paid through: ${formatDate(paidUntil)}`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: `Card Vault plan changed to ${next}`,
    html,
    text,
  })
}

/**
 * SUBSCRIPTION EXPIRED
 */
export async function sendSubscriptionExpiredEmail({
  email,
}: {
  email: string
}) {
  const title = "Your Card Vault subscription has ended"

  const html = emailLayout({
    title,

    preheader: "Your paid Card Vault access has ended.",

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          Your paid Card Vault subscription has ended.
        </p>

        <p style="font-size:14px;line-height:1.7;margin:0 0 18px;">
          Your existing collection remains associated with your account,
          but subscription-protected features may now be unavailable.
        </p>

        <p style="margin:22px 0 0;">
          <a
            href="${APP_URL}/settings?tab=billing"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111827;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:600;
            "
          >
            View Subscription Options
          </a>
        </p>
      `,
  })

  const text = [
    "Your paid Card Vault subscription has ended.",
    "",
    "Your existing collection remains associated with your account.",
    "",
    `Subscription options: ${APP_URL}/settings?tab=billing`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: "Your Card Vault subscription has ended",
    html,
    text,
  })
}

/**
 * PAYMENT CONFIRMED
 */
export async function sendPaymentConfirmedEmail({
  email,
  amount,
  plan,
  paidUntil,
  invoiceNumber,
}: {
  email: string
  amount: number
  plan: SubscriptionTier
  paidUntil: string
  invoiceNumber: string
}) {
  const label = planLabel(plan)

  const title = "Payment confirmed"

  const html = emailLayout({
    title,

    preheader: `Your Card Vault ${label} payment has been confirmed.`,

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          Your Card Vault payment has been confirmed successfully.
        </p>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:20px 0;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:10px;
          "
        >
          <tr>
            <td style="padding:18px;">
              <div style="margin-bottom:10px;">
                <strong>Amount:</strong>
                $${Number(amount).toFixed(2)}
              </div>

              <div style="margin-bottom:10px;">
                <strong>Plan:</strong>
                ${escapeHtml(label)}
              </div>

              <div style="margin-bottom:10px;">
                <strong>Invoice:</strong>
                ${escapeHtml(invoiceNumber)}
              </div>

              <div>
                <strong>Access through:</strong>
                ${escapeHtml(formatDate(paidUntil))}
              </div>
            </td>
          </tr>
        </table>

        <p style="margin:22px 0 0;">
          <a
            href="${APP_URL}"
            style="
              display:inline-block;
              padding:12px 18px;
              background:#111827;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
              font-weight:600;
            "
          >
            Open Card Vault
          </a>
        </p>
      `,
  })

  const text = [
    "Your Card Vault payment has been confirmed.",
    "",
    `Amount: $${Number(amount).toFixed(2)}`,
    `Plan: ${label}`,
    `Invoice: ${invoiceNumber}`,
    `Access through: ${formatDate(paidUntil)}`,
    "",
    `Open Card Vault: ${APP_URL}`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: "Card Vault payment confirmed",
    html,
    text,
  })
}

/**
 * PAYMENT REJECTED
 */
export async function sendPaymentRejectedEmail({
  email,
  invoiceNumber,
}: {
  email: string
  invoiceNumber: string
}) {
  const title = "Payment requires attention"

  const html = emailLayout({
    title,

    preheader: "We could not confirm your Card Vault payment.",

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          We were unable to confirm your submitted Card Vault payment.
        </p>

        <div
          style="
            margin:20px 0;
            padding:18px;
            background:#f9fafb;
            border:1px solid #e5e7eb;
            border-radius:10px;
          "
        >
          <strong>Invoice:</strong>
          ${escapeHtml(invoiceNumber)}
        </div>

        <p style="font-size:14px;line-height:1.7;margin:0;">
          If you believe this payment should have been confirmed,
          please contact
          <a href="mailto:${SUPPORT_EMAIL}">
            ${SUPPORT_EMAIL}
          </a>.
        </p>
      `,
  })

  const text = [
    "We were unable to confirm your submitted Card Vault payment.",
    "",
    `Invoice: ${invoiceNumber}`,
    "",
    `If you believe this is an error, contact ${SUPPORT_EMAIL}.`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: "Card Vault payment requires attention",
    html,
    text,
  })
}

/**
 * ADMIN PASSWORD CHANGE
 */
export async function sendPasswordChangedEmail({ email }: { email: string }) {
  const title = "Your Card Vault password was changed"

  const html = emailLayout({
    title,

    preheader: "An administrator changed your Card Vault password.",

    body: `
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
          An administrator changed the password associated with your Card Vault account.
        </p>

        <p style="font-size:14px;line-height:1.7;margin:0;">
          If you expected this change, no action is required.
        </p>

        <p style="font-size:14px;line-height:1.7;margin:18px 0 0;">
          If you did not expect this change, contact
          <strong>${SUPPORT_EMAIL}</strong>
          immediately.
        </p>
      `,
  })

  const text = [
    "An administrator changed your Card Vault password.",
    "",
    "If you expected this change, no action is required.",
    "",
    `If you did not expect this change, contact ${SUPPORT_EMAIL} immediately.`,
  ].join("\n")

  return sendEmail({
    to: email,
    subject: "Your Card Vault password was changed",
    html,
    text,
  })
}

/**
 * SUSPENDED / REACTIVATED
 */
export async function sendAccountStatusEmail({
  email,
  suspended,
}: {
  email: string
  suspended: boolean
}) {
  const title = suspended
    ? "Your Card Vault account was suspended"
    : "Your Card Vault account was reactivated"

  const html = emailLayout({
    title,

    preheader: suspended
      ? "Your Card Vault account has been suspended."
      : "Your Card Vault account has been restored.",

    body: suspended
      ? `
          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            An administrator suspended access to your Card Vault account.
          </p>

          <p style="font-size:14px;line-height:1.7;margin:0;">
            Contact ${SUPPORT_EMAIL} if you have questions about this suspension.
          </p>
        `
      : `
          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            Your Card Vault account has been reactivated.
          </p>

          <p style="font-size:14px;line-height:1.7;margin:0;">
            You can sign in again and continue using your account.
          </p>

          <p style="margin:22px 0 0;">
            <a
              href="${APP_URL}"
              style="
                display:inline-block;
                padding:12px 18px;
                background:#111827;
                color:#ffffff;
                text-decoration:none;
                border-radius:8px;
                font-weight:600;
              "
            >
              Open Card Vault
            </a>
          </p>
        `,
  })

  const text = suspended
    ? [
        "Your Card Vault account has been suspended.",
        "",
        `Contact ${SUPPORT_EMAIL} if you have questions.`,
      ].join("\n")
    : [
        "Your Card Vault account has been reactivated.",
        "",
        `Open Card Vault: ${APP_URL}`,
      ].join("\n")

  return sendEmail({
    to: email,
    subject: title,
    html,
    text,
  })
}
