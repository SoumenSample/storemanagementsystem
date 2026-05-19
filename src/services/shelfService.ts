import { ProductModel } from "@/models/product";
import { ShelfInventoryModel } from "@/models/shelfInventory";
import { ShelfLocationModel } from "@/models/shelfLocation";
import { logStockMovement } from "@/services/stockMovementService";
import { generateBarcodeValue } from "@/utils/barcode";

const DEFAULT_RECEIVING_CODE = "RECV";

function normalizeOptionalText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

async function getProductOrThrow(businessId: string, productId: string) {
  const product = await ProductModel.findOne({
    _id: productId,
    businessId,
    isDeleted: false,
  });

  return product;
}

async function getShelfOrThrow(businessId: string, shelfId: string) {
  return ShelfLocationModel.findOne({
    _id: shelfId,
    businessId,
    isDeleted: false,
  });
}

export async function ensureReceivingShelf(businessId: string) {
  const receivingShelf = await ShelfLocationModel.findOneAndUpdate(
    {
      businessId,
      code: DEFAULT_RECEIVING_CODE,
      isDeleted: false,
    },
    {
      $setOnInsert: {
        label: "Receiving Bay",
        locationType: "BIN",
        code: DEFAULT_RECEIVING_CODE,
        capacityQty: 0,
        minOccupancyPct: 85,
        barcode: DEFAULT_RECEIVING_CODE,
        qrValue: DEFAULT_RECEIVING_CODE,
        notes: "Auto-created default location for inbound stock",
      },
    },
    { new: true, upsert: true }
  );

  return receivingShelf;
}

export async function createShelfLocation(params: {
  businessId: string;
  label: string;
  locationType: "AISLE" | "RACK" | "SHELF" | "BIN";
  code?: string | null;
  parentShelfId?: string | null;
  capacityQty?: number;
  minOccupancyPct?: number;
  barcode?: string | null;
  qrValue?: string | null;
  notes?: string | null;
}) {
  const code = normalizeOptionalText(params.code) ?? generateBarcodeValue("SH");

  return ShelfLocationModel.create({
    businessId: params.businessId,
    label: params.label.trim(),
    locationType: params.locationType,
    code,
    parentShelfId: params.parentShelfId ?? null,
    capacityQty: params.capacityQty ?? 0,
    minOccupancyPct: params.minOccupancyPct ?? 85,
    barcode: normalizeOptionalText(params.barcode) ?? code,
    qrValue: normalizeOptionalText(params.qrValue) ?? code,
    notes: normalizeOptionalText(params.notes),
  });
}

export async function addShelfInventory(params: {
  businessId: string;
  productId: string;
  quantity: number;
  shelfId?: string | null;
  expiryDate?: Date | null;
  batchNo?: string | null;
  notes?: string | null;
  referenceId?: string | null;
  movementType?: "OPENING" | "PURCHASE" | "ADJUSTMENT" | "MAP";
  syncProductStock?: boolean;
}) {
  if (params.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product = await getProductOrThrow(params.businessId, params.productId);
  if (!product) {
    return null;
  }

  const shelf = params.shelfId
    ? await getShelfOrThrow(params.businessId, params.shelfId)
    : await ensureReceivingShelf(params.businessId);

  if (!shelf) {
    return null;
  }

  const expiryDate = params.expiryDate ?? null;
  const batchNo = normalizeOptionalText(params.batchNo);

  const inventory = await ShelfInventoryModel.findOneAndUpdate(
    {
      businessId: params.businessId,
      productId: product._id,
      shelfId: shelf._id,
      expiryDate,
      batchNo,
      isDeleted: false,
    },
    {
      $inc: { quantity: params.quantity },
      $set: {
        expiryDate,
        batchNo,
        notes: normalizeOptionalText(params.notes),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (params.syncProductStock !== false) {
    await ProductModel.updateOne(
      { _id: product._id, businessId: params.businessId, isDeleted: false },
      { $inc: { stockQty: params.quantity } }
    );
  }

  try {
    await logStockMovement({
      businessId: params.businessId,
      productId: product._id.toString(),
      type: params.movementType ?? "PURCHASE",
      quantity: params.quantity,
      referenceId: params.referenceId ?? null,
      notes: params.notes ?? null,
      shelfId: shelf._id.toString(),
      expiryDate,
      batchNo,
    });
  } catch (error) {
    console.warn("Failed to log shelf inventory movement", error);
  }

  return {
    product,
    shelf,
    inventory,
  };
}

export async function consumeShelfInventory(params: {
  businessId: string;
  productId: string;
  quantity: number;
  shelfId?: string | null;
  notes?: string | null;
  referenceId?: string | null;
  movementType?: "SALE" | "ADJUSTMENT" | "EXPIRY";
}) {
  if (params.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product = await getProductOrThrow(params.businessId, params.productId);
  if (!product) {
    return null;
  }

  if (product.stockQty < params.quantity) {
    throw new Error(`Insufficient stock for ${product.name}`);
  }

  const inventoryFilter: Record<string, unknown> = {
    businessId: params.businessId,
    productId: product._id,
    quantity: { $gt: 0 },
    isDeleted: false,
  };

  if (params.shelfId) {
    inventoryFilter.shelfId = params.shelfId;
  }

  const lots = await ShelfInventoryModel.find(inventoryFilter).sort({
    expiryDate: 1,
    createdAt: 1,
  });

  let remaining = params.quantity;
  const consumedLots: Array<{
    shelfId: string;
    quantity: number;
    expiryDate: Date | null;
    batchNo: string | null;
  }> = [];

  for (const lot of lots) {
    if (remaining <= 0) break;

    const taken = Math.min(lot.quantity, remaining);
    lot.quantity -= taken;
    remaining -= taken;

    consumedLots.push({
      shelfId: lot.shelfId.toString(),
      quantity: taken,
      expiryDate: lot.expiryDate ?? null,
      batchNo: lot.batchNo ?? null,
    });

    if (lot.quantity < 0) {
      lot.quantity = 0;
    }
  }

  if (remaining > 0) {
    throw new Error(`Insufficient shelf stock for ${product.name}`);
  }

  await Promise.all(lots.map((lot) => lot.save()));

  product.stockQty -= params.quantity;
  await product.save();

  await Promise.all(
    consumedLots.map((lot) =>
      logStockMovement({
        businessId: params.businessId,
        productId: product._id.toString(),
        type: params.movementType ?? "SALE",
        quantity: -lot.quantity,
        referenceId: params.referenceId ?? null,
        notes: params.notes ?? null,
        shelfId: lot.shelfId,
        expiryDate: lot.expiryDate,
        batchNo: lot.batchNo,
      })
    )
  );

  return {
    product,
    consumedLots,
  };
}

export async function transferShelfInventory(params: {
  businessId: string;
  productId: string;
  fromShelfId: string;
  toShelfId: string;
  quantity: number;
  batchNo?: string | null;
  expiryDate?: Date | null;
  notes?: string | null;
  referenceId?: string | null;
}) {
  if (params.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product = await getProductOrThrow(params.businessId, params.productId);
  if (!product) {
    return null;
  }

  const fromShelf = await getShelfOrThrow(params.businessId, params.fromShelfId);
  const toShelf = await getShelfOrThrow(params.businessId, params.toShelfId);
  if (!fromShelf || !toShelf) {
    return null;
  }

  const inventoryFilter: Record<string, unknown> = {
    businessId: params.businessId,
    productId: product._id,
    shelfId: fromShelf._id,
    quantity: { $gt: 0 },
    isDeleted: false,
  };

  if (params.batchNo) {
    inventoryFilter.batchNo = params.batchNo;
  }

  if (params.expiryDate) {
    inventoryFilter.expiryDate = params.expiryDate;
  }

  const lots = await ShelfInventoryModel.find(inventoryFilter).sort({
    expiryDate: 1,
    createdAt: 1,
  });

  let remaining = params.quantity;
  const transferredLots: Array<{
    quantity: number;
    expiryDate: Date | null;
    batchNo: string | null;
  }> = [];

  for (const lot of lots) {
    if (remaining <= 0) break;

    const taken = Math.min(lot.quantity, remaining);
    lot.quantity -= taken;
    remaining -= taken;
    transferredLots.push({
      quantity: taken,
      expiryDate: lot.expiryDate ?? null,
      batchNo: lot.batchNo ?? null,
    });
  }

  if (remaining > 0) {
    throw new Error(`Insufficient shelf stock for ${product.name}`);
  }

  await Promise.all(lots.map((lot) => lot.save()));

  for (const lot of transferredLots) {
    await ShelfInventoryModel.findOneAndUpdate(
      {
        businessId: params.businessId,
        productId: product._id,
        shelfId: toShelf._id,
        expiryDate: lot.expiryDate,
        batchNo: lot.batchNo,
        isDeleted: false,
      },
      {
        $inc: { quantity: lot.quantity },
        $set: {
          expiryDate: lot.expiryDate,
          batchNo: lot.batchNo,
          notes: normalizeOptionalText(params.notes),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  await logStockMovement({
    businessId: params.businessId,
    productId: product._id.toString(),
    type: "TRANSFER",
    quantity: params.quantity,
    referenceId: params.referenceId ?? null,
    notes: params.notes ?? null,
    fromShelfId: fromShelf._id.toString(),
    toShelfId: toShelf._id.toString(),
  });

  return {
    product,
    fromShelf,
    toShelf,
    transferredLots,
  };
}

export async function getShelfOverview(businessId: string) {
  const [shelves, inventory, products] = await Promise.all([
    ShelfLocationModel.find({ businessId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
    ShelfInventoryModel.find({ businessId, isDeleted: false, quantity: { $gt: 0 } }).lean(),
    ProductModel.find({ businessId, isDeleted: false })
      .select({ name: 1, sku: 1, stockQty: 1, minStock: 1 })
      .lean(),
  ]);

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const validInventory = inventory.filter(
    (item) => item.shelfId && item.productId && item.quantity > 0
  );

  return shelves.map((shelf) => {
    const shelfInventory = validInventory.filter(
      (item) => item.shelfId!.toString() === shelf._id.toString()
    );
    const totalQuantity = shelfInventory.reduce((sum, item) => sum + item.quantity, 0);
    const capacityQty = shelf.capacityQty ?? 0;
    const occupancyPct = capacityQty > 0 ? Math.round((totalQuantity / capacityQty) * 100) : null;
    const productsOnShelf = shelfInventory.map((item) => {
      const product = productMap.get(item.productId!.toString());
      return {
        inventoryId: item._id.toString(),
        productId: item.productId!.toString(),
        productName: product?.name ?? "Unknown product",
        sku: product?.sku ?? "-",
        quantity: item.quantity,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
        batchNo: item.batchNo ?? null,
      };
    });

    return {
      ...shelf,
      totalQuantity,
      occupancyPct,
      isOverCapacity: capacityQty > 0 ? totalQuantity >= capacityQty : false,
      isHighOccupancy:
        capacityQty > 0 && occupancyPct !== null
          ? occupancyPct >= (shelf.minOccupancyPct ?? 85)
          : false,
      productsOnShelf,
    };
  });
}

export async function getShelfAlerts(businessId: string) {
  const [products, shelves, inventory] = await Promise.all([
    ProductModel.find({ businessId, isDeleted: false }).lean(),
    ShelfLocationModel.find({ businessId, isDeleted: false }).lean(),
    ShelfInventoryModel.find({ businessId, isDeleted: false, quantity: { $gt: 0 } }).lean(),
  ]);

  const shelfMap = new Map(shelves.map((shelf) => [shelf._id.toString(), shelf]));
  const validInventory = inventory.filter(
    (lot) => lot.shelfId && lot.productId && lot.quantity > 0
  );
  const expiryCutoff = new Date();
  expiryCutoff.setDate(expiryCutoff.getDate() + 30);

  const lowStockProducts = products
    .filter((product) => (product.stockQty ?? 0) <= (product.minStock ?? 0))
    .map((product) => ({
      productId: product._id.toString(),
      name: product.name,
      sku: product.sku,
      stockQty: product.stockQty ?? 0,
      minStock: product.minStock ?? 0,
    }));

  const expiringSoon = validInventory
    .filter((lot) => lot.expiryDate && new Date(lot.expiryDate as Date) <= expiryCutoff)
    .map((lot) => ({
      inventoryId: lot._id.toString(),
      shelfId: lot.shelfId!.toString(),
      shelfCode: shelfMap.get(lot.shelfId!.toString())?.code ?? "-",
      productId: lot.productId!.toString(),
      quantity: lot.quantity,
      expiryDate: new Date(lot.expiryDate as Date).toISOString(),
    }));

  const occupancyAlerts = shelves
    .map((shelf) => {
      const totalQuantity = inventory
        .filter((lot) => lot.shelfId.toString() === shelf._id.toString())
        .reduce((sum, lot) => sum + lot.quantity, 0);
      const occupancyPct =
        shelf.capacityQty > 0 ? Math.round((totalQuantity / shelf.capacityQty) * 100) : null;

      return {
        shelfId: shelf._id.toString(),
        code: shelf.code,
        label: shelf.label,
        locationType: shelf.locationType,
        capacityQty: shelf.capacityQty,
        totalQuantity,
        occupancyPct,
        minOccupancyPct: shelf.minOccupancyPct ?? 85,
      };
    })
    .filter((shelf) => shelf.occupancyPct !== null && shelf.occupancyPct >= shelf.minOccupancyPct);

  return {
    lowStockProducts,
    expiringSoon,
    occupancyAlerts,
  };
}