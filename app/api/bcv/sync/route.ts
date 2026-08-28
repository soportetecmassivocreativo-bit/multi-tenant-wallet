import { NextResponse } from "next/server";
import { syncAndSaveBcvRates } from "@/lib/bcv";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await syncAndSaveBcvRates();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  const result = await syncAndSaveBcvRates();
  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
