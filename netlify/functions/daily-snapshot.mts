// Scheduled daily price snapshot.
//
// Runs once a day (early UTC) and asks the site to capture today's market-value
// reading for every card in inventory. This is what keeps the Analytics
// "price movers" and "insights" history growing on its own — without it, a
// second day of readings would only exist if an employee happened to open the
// Analytics page. Scheduled functions only run on published production deploys.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_URL
  if (!base) {
    console.error("daily-snapshot: site URL is not available in the environment")
    return
  }

  try {
    const response = await fetch(`${base}/api/analytics/snapshot-daily`)
    const result = await response.json().catch(() => null)
    console.log("daily-snapshot result", response.status, result)
  } catch (error) {
    console.error("daily-snapshot request failed", error)
  }
}

export const config = {
  // 07:00 UTC — after most US end-of-day price updates have settled.
  schedule: "0 7 * * *",
}
