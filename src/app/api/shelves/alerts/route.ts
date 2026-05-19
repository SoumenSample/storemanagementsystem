import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getShelfAlerts } from "@/services/shelfService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const alerts = await getShelfAlerts(session.user.businessId);
  return NextResponse.json(alerts);
}