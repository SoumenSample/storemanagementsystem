import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { adjustStock } from "@/services/productService";
import { requireInventoryAccess } from "@/lib/access";
import { z } from "zod";

const adjustSchema = z.object({
  quantity: z.number().int(),
  notes: z.string().optional(),
  shelfId: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  batchNo: z.string().optional().or(z.literal("")),
});

export async function POST(
  request: Request,
  context: any
) {
  const access = await requireInventoryAccess();
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = adjustSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const params = await context.params;
  const product = await adjustStock({
    businessId: access.session.user.businessId as string,
    productId: params.productId,
    quantity: parsed.data.quantity,
    shelfId: parsed.data.shelfId || undefined,
    expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    batchNo: parsed.data.batchNo || undefined,
    notes: parsed.data.notes ?? null,
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, stockQty: product.stockQty });
}
