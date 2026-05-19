import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { finalizeInvoice } from "@/services/invoiceService";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["sent", "paid"]).default("sent"),
});

export async function POST(
  request: Request,
  context: any
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const params = await context.params;
  const result = await finalizeInvoice({
    businessId: session.user.businessId,
    invoiceId: params.invoiceId,
    status: parsed.data.status,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, invoice: result.invoice });
}
