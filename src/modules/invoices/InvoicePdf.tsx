// import {
//   Document,
//   Image,
//   Page,
//   StyleSheet,
//   Text,
//   View,
// } from "@react-pdf/renderer";
// import { formatCurrency } from "@/utils/finance";
// import { amountInWords } from "@/utils/amountInWords";

// const styles = StyleSheet.create({
//   page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
//   headerRow: { flexDirection: "row", marginBottom: 16, gap: 16 },
//   logo: { width: 80, height: 80 },
//   headerContent: { flex: 1 },
//   header: { marginBottom: 16 },
//   title: { fontSize: 16, fontWeight: "bold" },
//   section: { marginBottom: 12 },
//   row: { flexDirection: "row", justifyContent: "space-between" },
//   label: { color: "#444" },
//   tableHeader: {
//     flexDirection: "row",
//     borderBottomWidth: 1,
//     borderBottomColor: "#ddd",
//     paddingBottom: 6,
//   },
//   tableRow: {
//     flexDirection: "row",
//     borderBottomWidth: 1,
//     borderBottomColor: "#f0f0f0",
//     paddingVertical: 6,
//   },
//   cell: { flex: 1 },
//   cellRight: { flex: 1, textAlign: "right" },
// });

// // Format currency for PDF with rupee symbol
// function formatPdfCurrency(amount: number) {
//   const formatted = new Intl.NumberFormat("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(amount);
//   return `Rs. ${formatted}`;
// }

// type InvoicePdfProps = {
//   invoice: any;
//   items: any[];
//   business: any;
// };

// export function InvoicePdf({ invoice, items, business }: InvoicePdfProps) {
//   const amountWords = amountInWords(invoice.payableAmount ?? invoice.grandTotal);

//   return (
//     <Document>
//       <Page size="A4" style={styles.page}>
//         {/* Header with Logo and Business Info */}
//         <View style={styles.headerRow}>
//           {business?.logoUrl && (
//             <Image source={business.logoUrl} style={styles.logo} />
//           )}
//           <View style={styles.headerContent}>
//             <Text style={styles.title}>{business?.name ?? "Business"}</Text>
//             <Text>{business?.address}</Text>
//             <Text>GSTIN: {business?.gstin}</Text>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.title}>{invoice.documentType}</Text>
//           <View style={styles.row}>
//             <Text style={styles.label}>Invoice No:</Text>
//             <Text>{invoice.invoiceNumber}</Text>
//           </View>
//           <View style={styles.row}>
//             <Text style={styles.label}>Date:</Text>
//             <Text>{new Date(invoice.issuedAt).toLocaleDateString("en-IN")}</Text>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.label}>Bill To</Text>
//           <Text>{invoice.buyerName}</Text>
//           <Text>{invoice.buyerAddress}</Text>
//           {invoice.buyerGstin ? <Text>GSTIN: {invoice.buyerGstin}</Text> : null}
//         </View>

//         <View style={styles.tableHeader}>
//           <Text style={styles.cell}>Item</Text>
//           <Text style={styles.cell}>HSN</Text>
//           <Text style={styles.cellRight}>Qty</Text>
//           <Text style={styles.cellRight}>Rate</Text>
//           <Text style={styles.cellRight}>Tax</Text>
//           <Text style={styles.cellRight}>Total</Text>
//         </View>
//         {items.map((item) => (
//           <View style={styles.tableRow} key={item._id?.toString() ?? item.description}>
//             <Text style={styles.cell}>{item.description}</Text>
//             <Text style={styles.cell}>{item.hsn}</Text>
//             <Text style={styles.cellRight}>{item.quantity}</Text>
//             <Text style={styles.cellRight}>{formatPdfCurrency(item.unitPrice)}</Text>
//             <Text style={styles.cellRight}>{formatPdfCurrency(item.cgst + item.sgst + item.igst)}</Text>
//             <Text style={styles.cellRight}>{formatPdfCurrency(item.total)}</Text>
//           </View>
//         ))}

//         <View style={{ marginTop: 12 }}>
//           <View style={styles.row}>
//             <Text>Subtotal</Text>
//             <Text>{formatPdfCurrency(invoice.subtotal)}</Text>
//           </View>
//           <View style={styles.row}>
//             <Text>Total Tax</Text>
//             <Text>{formatPdfCurrency(invoice.totalTax)}</Text>
//           </View>
//           <View style={styles.row}>
//             <Text>Round Off</Text>
//             <Text>{formatPdfCurrency(invoice.roundOff)}</Text>
//           </View>
//           <View style={styles.row}>
//             <Text>Grand Total</Text>
//             <Text style={{ fontWeight: "bold" }}>{formatPdfCurrency(invoice.payableAmount)}</Text>
//           </View>
//           <View style={{ marginTop: 12 }}>
//             <Text>Amount in words: {amountWords} only.</Text>
//           </View>
//         </View>
//       </Page>
//     </Document>
//   );
// }



import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { amountInWords } from "@/utils/amountInWords";

// ---------------------------------------------------------------------------
// Font registration — Roboto supports the ₹ glyph; Helvetica does not
// ---------------------------------------------------------------------------

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9vAw.ttf",
      fontWeight: "bold",
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu52xP.ttf",
      fontStyle: "italic",
    },
  ],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPdfCurrency(amount: number = 0) {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `\u20b9${formatted}`; // ₹
}

function fmtDate(raw: string | Date) {
  return new Date(raw).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const BRAND = "#1a2e4a";   // deep navy
const ACCENT = "#2563eb";  // vivid blue
const LIGHT = "#f0f4f8";   // pale blue-grey
const MUTED = "#64748b";   // slate text
const RULE = "#cbd5e1";    // border colour

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    color: "#1e293b",
    paddingTop: 0,
    paddingBottom: 24,
  },

  /* ── Banner ── */
  banner: {
    backgroundColor: BRAND,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bannerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 4 },
  businessName: {
    fontSize: 14,
    fontFamily: "Roboto", fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  businessSub: { color: "#94a3b8", fontSize: 7, lineHeight: 1.4 },
  bannerRight: { alignItems: "flex-end" },
  docType: {
    fontSize: 18,
    fontFamily: "Roboto", fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  invoiceNum: { color: ACCENT, fontSize: 8, marginTop: 3, letterSpacing: 0.5 },

  /* ── Meta strip ── */
  metaStrip: {
    backgroundColor: LIGHT,
    paddingHorizontal: 32,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  metaBlock: {},
  metaLabel: { color: MUTED, fontSize: 7, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 },
  metaValue: { fontFamily: "Roboto", fontWeight: "bold", fontSize: 8 },

  /* ── Body ── */
  body: { paddingHorizontal: 32, paddingTop: 14 },

  /* ── Party row ── */
  partyRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 8,
  },
  partyBoxShaded: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 8,
    backgroundColor: LIGHT,
  },
  partyTag: {
    fontSize: 6.5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: ACCENT,
    fontFamily: "Roboto", fontWeight: "bold",
    marginBottom: 3,
  },
  partyName: { fontFamily: "Roboto", fontWeight: "bold", fontSize: 9, marginBottom: 2 },
  partyDetail: { color: MUTED, lineHeight: 1.4, fontSize: 8 },

  /* ── Items table ── */
  tableWrapper: { marginBottom: 12 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: BRAND,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 1,
  },
  thText: {
    color: "#ffffff",
    fontFamily: "Roboto", fontWeight: "bold",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    backgroundColor: LIGHT,
  },
  tdText: { fontSize: 8 },
  tdMuted: { fontSize: 8, color: MUTED },

  /* column widths */
  colNo:    { width: 22 },
  colDesc:  { flex: 1 },
  colHsn:   { width: 48 },
  colQty:   { width: 32, textAlign: "right" },
  colRate:  { width: 56, textAlign: "right" },
  colTax:   { width: 56, textAlign: "right" },
  colTotal: { width: 64, textAlign: "right" },

  /* ── Totals ── */
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  totalsPane: { width: 210 },
  totalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  totalsLabel: { color: MUTED, fontSize: 8 },
  totalsValue: { fontSize: 8 },
  grandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  grandLabel: { color: "#ffffff", fontFamily: "Roboto", fontWeight: "bold", fontSize: 9 },
  grandValue: { color: "#ffffff", fontFamily: "Roboto", fontWeight: "bold", fontSize: 9 },

  /* ── Amount words ── */
  amountWords: {
    marginTop: 10,
    backgroundColor: LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderRadius: 2,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  amountWordsLabel: { color: MUTED, fontSize: 7, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 },
  amountWordsText: { fontFamily: "Roboto", fontWeight: "bold", fontSize: 8 },

  /* ── GST summary table ── */
  gstSection: { marginTop: 10 },
  gstTitle: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: ACCENT,
    fontFamily: "Roboto", fontWeight: "bold",
    marginBottom: 3,
  },
  gstHead: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  gstRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  gthText: { fontFamily: "Roboto", fontWeight: "bold", fontSize: 7.5, color: MUTED, flex: 1, textAlign: "right" },
  gthTextL: { fontFamily: "Roboto", fontWeight: "bold", fontSize: 7.5, color: MUTED, flex: 1 },
  gtdText: { fontSize: 8, flex: 1, textAlign: "right" },
  gtdTextL: { fontSize: 8, flex: 1 },

  /* ── Footer ── */
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerNote: { color: MUTED, fontSize: 7, maxWidth: 200, lineHeight: 1.4 },
  signBlock: { alignItems: "center" },
  signLine: { borderTopWidth: 1, borderTopColor: "#1e293b", width: 100, marginBottom: 2 },
  signLabel: { color: MUTED, fontSize: 7 },
  ownerName: { color: "#1e293b", fontSize: 7.5, fontFamily: "Roboto", fontWeight: "bold", marginBottom: 6 },
  footerBrand: {
    marginTop: 10,
    alignItems: "center",
  },
  footerBrandText: { color: "#cbd5e1", fontSize: 6, letterSpacing: 0.5 },

  qrSection: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qrTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  qrTitle: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: ACCENT,
    marginBottom: 2,
    fontFamily: "Roboto",
    fontWeight: "bold",
  },
  qrSubText: {
    fontSize: 7,
    color: MUTED,
    lineHeight: 1.4,
  },
  qrImage: {
    width: 64,
    height: 64,
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoicePdfProps = {
  invoice: any;
  items: any[];
  business: any;
  invoiceQrDataUrl?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoicePdf({ invoice, items, business, invoiceQrDataUrl }: InvoicePdfProps) {
  // Safeguard: ensure payableAmount is correctly calculated if it's 0 or undefined
  const payableAmount = (invoice.payableAmount && invoice.payableAmount > 0) 
    ? invoice.payableAmount 
    : (invoice.grandTotal + (invoice.roundOff ?? 0));

  const amountWords = amountInWords(payableAmount);

  // Build GST summary grouped by tax rate
  const gstSummary: Record<
    string,
    { taxable: number; cgst: number; sgst: number; igst: number; total: number }
  > = {};

  items.forEach((item) => {
    const rate = item.gstRate ?? 0;
    const key = `${rate}`;
    if (!gstSummary[key]) {
      gstSummary[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    }
    gstSummary[key].taxable += item.taxableAmount ?? item.unitPrice * item.quantity;
    gstSummary[key].cgst += item.cgst ?? 0;
    gstSummary[key].sgst += item.sgst ?? 0;
    gstSummary[key].igst += item.igst ?? 0;
    gstSummary[key].total += (item.cgst ?? 0) + (item.sgst ?? 0) + (item.igst ?? 0);
  });

  const isIGST = items.some((i) => (i.igst ?? 0) > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Banner ── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            {business?.logoUrl && (
              <Image source={business.logoUrl} style={s.logo} />
            )}
            <View>
              <Text style={s.businessName}>{business?.name ?? "Your Business"}</Text>
              <Text style={s.businessSub}>{business?.address}</Text>
              {business?.gstin && (
                <Text style={s.businessSub}>GSTIN: {business.gstin}</Text>
              )}
              {business?.phone && (
                <Text style={s.businessSub}>Ph: {business.phone}</Text>
              )}
              {business?.email && (
                <Text style={s.businessSub}>{business.email}</Text>
              )}
            </View>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.docType}>{invoice.documentType ?? "Invoice"}</Text>
            <Text style={s.invoiceNum}>#{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* ── Meta strip ── */}
        <View style={s.metaStrip}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Invoice Date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.issuedAt)}</Text>
          </View>
          {invoice.dueDate && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Due Date</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
            </View>
          )}
          {invoice.placeOfSupply && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Place of Supply</Text>
              <Text style={s.metaValue}>{invoice.placeOfSupply}</Text>
            </View>
          )}
          {invoice.poNumber && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>PO Number</Text>
              <Text style={s.metaValue}>{invoice.poNumber}</Text>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Party row */}
          <View style={s.partyRow}>
            <View style={s.partyBox}>
              <Text style={s.partyTag}>Bill To</Text>
              <Text style={s.partyName}>{invoice.buyerName}</Text>
              <Text style={s.partyDetail}>{invoice.buyerAddress}</Text>
              {invoice.buyerGstin ? (
                <Text style={[s.partyDetail, { marginTop: 4 }]}>
                  GSTIN: {invoice.buyerGstin}
                </Text>
              ) : null}
              {invoice.buyerPhone ? (
                <Text style={s.partyDetail}>Ph: {invoice.buyerPhone}</Text>
              ) : null}
            </View>

            {(invoice.shipToName || invoice.shipToAddress) && (
              <View style={s.partyBoxShaded}>
                <Text style={s.partyTag}>Ship To</Text>
                <Text style={s.partyName}>{invoice.shipToName ?? invoice.buyerName}</Text>
                <Text style={s.partyDetail}>{invoice.shipToAddress ?? invoice.buyerAddress}</Text>
              </View>
            )}
          </View>

          {/* Items table */}
          <View style={s.tableWrapper}>
            {/* Head */}
            <View style={s.tableHead}>
              <Text style={[s.thText, s.colNo]}>#</Text>
              <Text style={[s.thText, s.colDesc]}>Description</Text>
              <Text style={[s.thText, s.colHsn]}>HSN/SAC</Text>
              <Text style={[s.thText, s.colQty]}>Qty</Text>
              <Text style={[s.thText, s.colRate]}>Rate</Text>
              <Text style={[s.thText, s.colTax]}>GST</Text>
              <Text style={[s.thText, s.colTotal]}>Amount</Text>
            </View>

            {/* Rows */}
            {items.map((item, idx) => {
              const taxTotal = (item.cgst ?? 0) + (item.sgst ?? 0) + (item.igst ?? 0);
              const RowStyle = idx % 2 === 0 ? s.tableRow : s.tableRowAlt;
              return (
                <View style={RowStyle} key={item._id?.toString() ?? idx}>
                  <Text style={[s.tdMuted, s.colNo]}>{idx + 1}</Text>
                  <View style={s.colDesc}>
                    <Text style={s.tdText}>{item.description}</Text>
                    {item.unit && (
                      <Text style={[s.tdMuted, { fontSize: 7.5 }]}>{item.unit}</Text>
                    )}
                  </View>
                  <Text style={[s.tdMuted, s.colHsn]}>{item.hsn}</Text>
                  <Text style={[s.tdText, s.colQty]}>{item.quantity}</Text>
                  <Text style={[s.tdText, s.colRate]}>{formatPdfCurrency(item.unitPrice)}</Text>
                  <Text style={[s.tdText, s.colTax]}>{formatPdfCurrency(taxTotal)}</Text>
                  <Text style={[s.tdText, s.colTotal]}>{formatPdfCurrency(item.total)}</Text>
                </View>
              );
            })}
          </View>

          {/* Totals */}
          <View style={s.totalsRow}>
            <View style={s.totalsPane}>
              <View style={s.totalsLine}>
                <Text style={s.totalsLabel}>Subtotal</Text>
                <Text style={s.totalsValue}>{formatPdfCurrency(invoice.subtotal)}</Text>
              </View>

              {/* Show CGST/SGST or IGST breakdown */}
              {isIGST ? (
                <View style={s.totalsLine}>
                  <Text style={s.totalsLabel}>IGST</Text>
                  <Text style={s.totalsValue}>{formatPdfCurrency(invoice.totalTax)}</Text>
                </View>
              ) : (
                <>
                  <View style={s.totalsLine}>
                    <Text style={s.totalsLabel}>CGST</Text>
                    <Text style={s.totalsValue}>
                      {formatPdfCurrency(items.reduce((a, i) => a + (i.cgst ?? 0), 0))}
                    </Text>
                  </View>
                  <View style={s.totalsLine}>
                    <Text style={s.totalsLabel}>SGST</Text>
                    <Text style={s.totalsValue}>
                      {formatPdfCurrency(items.reduce((a, i) => a + (i.sgst ?? 0), 0))}
                    </Text>
                  </View>
                </>
              )}

              {invoice.discount != null && invoice.discount !== 0 && (
                <View style={s.totalsLine}>
                  <Text style={s.totalsLabel}>Discount</Text>
                  <Text style={[s.totalsValue, { color: "#16a34a" }]}>
                    -{formatPdfCurrency(invoice.discount)}
                  </Text>
                </View>
              )}

              {invoice.roundOff != null && invoice.roundOff !== 0 && (
                <View style={s.totalsLine}>
                  <Text style={s.totalsLabel}>Round Off</Text>
                  <Text style={s.totalsValue}>{formatPdfCurrency(invoice.roundOff)}</Text>
                </View>
              )}

              <View style={s.grandLine}>
                <Text style={s.grandLabel}>Total Payable</Text>
                <Text style={s.grandValue}>
                  {formatPdfCurrency(payableAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Amount in words */}
          <View style={s.amountWords}>
            <Text style={s.amountWordsLabel}>Amount in Words</Text>
            <Text style={s.amountWordsText}>{amountWords} only</Text>
          </View>

          {/* GST Summary */}
          {Object.keys(gstSummary).length > 0 && (
            <View style={s.gstSection}>
              <Text style={s.gstTitle}>GST Summary</Text>
              <View style={s.gstHead}>
                <Text style={s.gthTextL}>Tax Rate</Text>
                <Text style={s.gthText}>Taxable Amt</Text>
                {isIGST ? (
                  <Text style={s.gthText}>IGST</Text>
                ) : (
                  <>
                    <Text style={s.gthText}>CGST</Text>
                    <Text style={s.gthText}>SGST</Text>
                  </>
                )}
                <Text style={s.gthText}>Total Tax</Text>
              </View>
              {Object.entries(gstSummary).map(([rate, vals]) => (
                <View style={s.gstRow} key={rate}>
                  <Text style={s.gtdTextL}>{rate}%</Text>
                  <Text style={s.gtdText}>{formatPdfCurrency(vals.taxable)}</Text>
                  {isIGST ? (
                    <Text style={s.gtdText}>{formatPdfCurrency(vals.igst)}</Text>
                  ) : (
                    <>
                      <Text style={s.gtdText}>{formatPdfCurrency(vals.cgst)}</Text>
                      <Text style={s.gtdText}>{formatPdfCurrency(vals.sgst)}</Text>
                    </>
                  )}
                  <Text style={s.gtdText}>{formatPdfCurrency(vals.total)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Terms & Signature footer */}
          <View style={s.footer}>
            <View>
              {invoice.terms && (
                <>
                  <Text style={[s.amountWordsLabel, { marginBottom: 4 }]}>Terms & Conditions</Text>
                  <Text style={s.footerNote}>{invoice.terms}</Text>
                </>
              )}
              {invoice.notes && (
                <Text style={[s.footerNote, { marginTop: 6, fontFamily: "Roboto", fontStyle: "italic" }]}>
                  Note: {invoice.notes}
                </Text>
              )}
            </View>

            <View style={s.signBlock}>
              <Text style={[s.footerNote, { marginBottom: 16, textAlign: "center", fontStyle: "italic" }]}>
                For {business?.name}
              </Text>
              {business?.ownerName && (
                <Text style={s.ownerName}>{business.ownerName}</Text>
              )}
              <View style={s.signLine} />
              <Text style={s.signLabel}>Authorised Signatory</Text>
            </View>
          </View>

          {invoiceQrDataUrl ? (
            <View style={s.qrSection}>
              <View style={s.qrTextWrap}>
                <Text style={s.qrTitle}>Invoice QR</Text>
                <Text style={s.qrSubText}>
                  Scan to retrieve structured invoice details for reconciliation and verification.
                </Text>
              </View>
              <Image source={invoiceQrDataUrl} style={s.qrImage} />
            </View>
          ) : null}

          {/* Foot brand */}
          <View style={s.footerBrand}>
            <Text style={s.footerBrandText}>
              This is a computer-generated invoice and does not require a physical signature.
            </Text>
          </View>

        </View>
      </Page>
    </Document>
  );
}