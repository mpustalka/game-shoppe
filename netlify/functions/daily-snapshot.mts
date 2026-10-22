// Scheduled daily price snapshot.
//
// Runs once a day (early UTC) and captures today's market-value reading for
// every card in inventory. This is what keeps the Analytics "price movers" and
// "insights" history growing on its own — without it, a second day of readings
// would only exist if an employee happened to open the Analytics page.
// Scheduled functions only run on published production deploys.
//
// The capture runs here directly against the database instead of calling the
// /api/analytics/snapshot-daily route over HTTP. That route is protected by a
// secret that is only available inside the Next.js app, so HTTP calls from this
// function were rejected with 401 and no history was being recorded.

import { captureDailySnapshots } from "../../lib/market-prices"

export default async () => {
  try {
    const result = await captureDailySnapshots()
    console.log("daily-snapshot result", result)
  } catch (error) {
    console.error("daily-snapshot failed", error)
    throw error
  }
}

export const config = {
  // 07:00 UTC — after most US end-of-day price updates have settled.
  schedule: "0 7 * * *",
}
