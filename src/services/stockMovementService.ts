import { StockMovementModel } from "@/models/stockMovement";

export async function logStockMovement(params: {
  businessId: string;
  productId: string;
  type:
    | "OPENING"
    | "SALE"
    | "PURCHASE"
    | "ADJUSTMENT"
    | "TRANSFER"
    | "MAP"
    | "EXPIRY";
  quantity: number;
  shelfId?: string | null;
  fromShelfId?: string | null;
  toShelfId?: string | null;
  expiryDate?: Date | null;
  batchNo?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}) {
  return StockMovementModel.create({
    businessId: params.businessId,
    productId: params.productId,
    type: params.type,
    quantity: params.quantity,
    shelfId: params.shelfId ?? null,
    fromShelfId: params.fromShelfId ?? null,
    toShelfId: params.toShelfId ?? null,
    expiryDate: params.expiryDate ?? null,
    batchNo: params.batchNo ?? null,
    referenceId: params.referenceId ?? null,
    notes: params.notes ?? null,
  });
}
