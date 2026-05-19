import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { transferShelfInventory } from "@/services/shelfService";
import { z } from "zod";

const transferSchema = z.object({
  productId: z.string().min(1),
  toShelfId: z.string().min(1),
  quantity: z.number().int().positive(),
  batchNo: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const { shelfId } = await params;

  const result = await transferShelfInventory({
    businessId: session.user.businessId,
    productId: parsed.data.productId,
    fromShelfId: shelfId,
    toShelfId: parsed.data.toShelfId,
    quantity: parsed.data.quantity,
    batchNo: parsed.data.batchNo || undefined,
    expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    notes: parsed.data.notes || undefined,
  });

  if (!result) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, result });
}