import { ProductModel } from "@/models/product";
import { addShelfInventory, consumeShelfInventory } from "@/services/shelfService";

export async function adjustStock(params: {
  businessId: string;
  productId: string;
  quantity: number;
  shelfId?: string | null;
  expiryDate?: Date | null;
  batchNo?: string | null;
  notes?: string | null;
}) {
  const product = await ProductModel.findOne({
    _id: params.productId,
    businessId: params.businessId,
    isDeleted: false,
  });

  if (!product) return null;

  if (params.quantity > 0) {
    await addShelfInventory({
      businessId: params.businessId,
      productId: product._id.toString(),
      quantity: params.quantity,
      shelfId: params.shelfId ?? null,
      expiryDate: params.expiryDate ?? null,
      batchNo: params.batchNo ?? null,
      notes: params.notes ?? null,
      movementType: "ADJUSTMENT",
    });
  } else {
    await consumeShelfInventory({
      businessId: params.businessId,
      productId: product._id.toString(),
      quantity: Math.abs(params.quantity),
      shelfId: params.shelfId ?? null,
      notes: params.notes ?? null,
      movementType: "ADJUSTMENT",
    });
  }

  return ProductModel.findById(product._id);
}
