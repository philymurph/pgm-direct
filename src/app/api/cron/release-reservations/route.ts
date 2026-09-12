import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredOrderReservations } from "@/lib/order-lifecycle";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredOrderReservations();
  return NextResponse.json({ released });
}
