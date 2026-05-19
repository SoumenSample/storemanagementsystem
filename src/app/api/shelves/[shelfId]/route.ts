import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ShelfLocationModel } from "@/models/shelfLocation";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(2).optional(),
  locationType: z.enum(["AISLE", "RACK", "SHELF", "BIN"]).optional(),
  code: z.string().optional().or(z.literal("")),
  parentShelfId: z.string().optional().or(z.literal("")),
  capacityQty: z.number().int().nonnegative().optional(),
  minOccupancyPct: z.number().int().min(1).max(100).optional(),
  barcode: z.string().optional().or(z.literal("")),
  qrValue: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const { shelfId } = await params;

  const updates: Record<string, unknown> = {};
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.locationType !== undefined) updates.locationType = parsed.data.locationType;
  if (parsed.data.code !== undefined) updates.code = parsed.data.code || null;
  if (parsed.data.parentShelfId !== undefined) updates.parentShelfId = parsed.data.parentShelfId || null;
  if (parsed.data.capacityQty !== undefined) updates.capacityQty = parsed.data.capacityQty;
  if (parsed.data.minOccupancyPct !== undefined) updates.minOccupancyPct = parsed.data.minOccupancyPct;
  if (parsed.data.barcode !== undefined) updates.barcode = parsed.data.barcode || null;
  if (parsed.data.qrValue !== undefined) updates.qrValue = parsed.data.qrValue || null;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null;

  const shelf = await ShelfLocationModel.findOneAndUpdate(
    {
      _id: shelfId,
      businessId: session.user.businessId,
      isDeleted: false,
    },
    updates,
    { new: true }
  );

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, shelf });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { shelfId } = await params;

  const shelf = await ShelfLocationModel.findOneAndUpdate(
    {
      _id: shelfId,
      businessId: session.user.businessId,
      isDeleted: false,
    },
    { isDeleted: true },
    { new: true }
  );

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}