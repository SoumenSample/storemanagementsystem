const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number) {
  if (n < 20) return ones[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${tens[ten]}${one ? " " + ones[one] : ""}`.trim();
}

function threeDigits(n: number) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundred) return twoDigits(rest);
  if (!rest) return `${ones[hundred]} Hundred`;
  return `${ones[hundred]} Hundred ${twoDigits(rest)}`.trim();
}

export function amountInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees / 100000) % 100);
  const thousand = Math.floor((rupees / 1000) % 100);
  const hundred = Math.floor((rupees / 100) % 10);
  const remainder = rupees % 100;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (remainder) parts.push(twoDigits(remainder));

  const rupeeWords = parts.join(" ").trim();
  const paiseWords = paise ? `${twoDigits(paise)} Paise` : "";

  return [rupeeWords, paiseWords].filter(Boolean).join(" and ").trim();
}
