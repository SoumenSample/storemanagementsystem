export function generateBarcodeValue(prefix = "SM"): string {
  const now = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${prefix}${now}${random}`;
}

export function normalizeBarcode(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function generateShelfCode(prefix = "SH"): string {
  return generateBarcodeValue(prefix);
}
