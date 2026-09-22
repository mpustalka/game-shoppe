import "server-only"

const EASYSHIP_API_URL =
  "https://public-api.easyship.com/2024-09"

function getToken() {
  const token =
    process.env.EASYSHIP_API_TOKEN

  if (!token) {
    throw new Error(
      "EASYSHIP_API_TOKEN is not configured",
    )
  }

  return token
}

export function getEasyshipOriginAddress() {
  const address = {
    name:
      process.env.EASYSHIP_ORIGIN_NAME ?? "",
    line_1:
      process.env.EASYSHIP_ORIGIN_ADDRESS1 ?? "",
    line_2:
      process.env.EASYSHIP_ORIGIN_ADDRESS2 || null,
    city:
      process.env.EASYSHIP_ORIGIN_CITY ?? "",
    state:
      process.env.EASYSHIP_ORIGIN_STATE ?? "",
    postal_code:
      process.env.EASYSHIP_ORIGIN_ZIP ?? "",
    country_alpha2:
      process.env.EASYSHIP_ORIGIN_COUNTRY ?? "US",
    phone_number:
      process.env.EASYSHIP_ORIGIN_PHONE ?? "",
  }

  if (
    !address.name ||
    !address.line_1 ||
    !address.city ||
    !address.state ||
    !address.postal_code
  ) {
    throw new Error(
      "Easyship origin address is incomplete",
    )
  }

  return address
}

export async function easyshipRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()

  const response = await fetch(
    `${EASYSHIP_API_URL}${path}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
        Accept:
          "application/json",

        ...(options.headers ?? {}),
      },

      cache: "no-store",
    },
  )

  const text =
    await response.text()

  let data: unknown = null

  try {
    data = text
      ? JSON.parse(text)
      : null
  } catch {
    data = text
  }

  if (!response.ok) {
    console.error(
      "Easyship API error:",
      response.status,
      data,
    )

    throw new Error(
      typeof data === "object" &&
        data !== null &&
        "message" in data
        ? String(
            (
              data as {
                message?: unknown
              }
            ).message,
          )
        : `Easyship request failed (${response.status})`,
    )
  }

  return data as T
}