import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { previewInvoiceNumber } from "@/services/invoiceNumber";
import { z } from "zod";

const querySchema = z.object({
  prefix: z.string().min(2).max(6),
  issuedAt: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  await connectToDatabase();

  const issuedAt = parsed.data.issuedAt
    ? new Date(parsed.data.issuedAt)
    : new Date();

  const invoiceNumber = await previewInvoiceNumber({
    businessId: session.user.businessId,
    issuedAt,
    prefix: parsed.data.prefix,
  });

  return NextResponse.json({ invoiceNumber });
}
