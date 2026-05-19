import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { createShelfLocation, getShelfOverview } from "@/services/shelfService";
import { requireInventoryAccess } from "@/lib/access";
import { z } from "zod";

const shelfSchema = z.object({
  label: z.string().min(2),
  locationType: z.enum(["AISLE", "RACK", "SHELF", "BIN"]),
  code: z.string().optional().or(z.literal("")),
  parentShelfId: z.string().optional().or(z.literal("")),
  capacityQty: z.number().int().nonnegative().optional(),
  minOccupancyPct: z.number().int().min(1).max(100).optional(),
  barcode: z.string().optional().or(z.literal("")),
  qrValue: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const items = await getShelfOverview(session.user.businessId);
  const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase();

  return NextResponse.json({
    items: search
      ? items.filter(
          (item) => {
            const shelfMatch =
              item.label.toLowerCase().includes(search) ||
              item.code.toLowerCase().includes(search) ||
              item.locationType.toLowerCase().includes(search);

            if (shelfMatch) {
              return true;
            }

            return item.productsOnShelf.some((productOnShelf) => {
              const name = productOnShelf.productName?.toLowerCase() ?? "";
              const sku = productOnShelf.sku?.toLowerCase() ?? "";
              const batchNo = productOnShelf.batchNo?.toLowerCase() ?? "";

              return (
                name.includes(search) ||
                sku.includes(search) ||
                batchNo.includes(search)
              );
            });
          }
        )
      : items,
  });
}

export async function POST(request: Request) {
  const access = await requireInventoryAccess();
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = shelfSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const shelf = await createShelfLocation({
    businessId: access.session.user.businessId as string,
    label: parsed.data.label,
    locationType: parsed.data.locationType,
    code: parsed.data.code || undefined,
    parentShelfId: parsed.data.parentShelfId || undefined,
    capacityQty: parsed.data.capacityQty,
    minOccupancyPct: parsed.data.minOccupancyPct,
    barcode: parsed.data.barcode || undefined,
    qrValue: parsed.data.qrValue || undefined,
    notes: parsed.data.notes || undefined,
  });

  return NextResponse.json({ ok: true, shelf });
}