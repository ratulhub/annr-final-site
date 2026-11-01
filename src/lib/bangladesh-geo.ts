/**
 * Bangladesh Geographic Reference: 8 Divisions & all 64 Districts (Zillas).
 * Used for VIP customer registration, checkout shipping address validation,
 * and delivery tier calculation.
 */

export const BD_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

export type BdDivision = (typeof BD_DIVISIONS)[number];

export const BD_DISTRICTS_BY_DIVISION: Record<BdDivision, string[]> = {
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Chattogram: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cox's Bazar",
    "Cumilla",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Rajshahi: [
    "Bogura",
    "Chapainawabganj",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  Barishal: [
    "Barguna",
    "Barishal",
    "Bhola",
    "Jhalokati",
    "Patuakhali",
    "Pirojpur",
  ],
  Sylhet: [
    "Habiganj",
    "Moulvibazar",
    "Sunamganj",
    "Sylhet",
  ],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Mymensingh: [
    "Jamalpur",
    "Mymensingh",
    "Netrokona",
    "Sherpur",
  ],
};

export const ALL_BD_DISTRICTS: string[] = Object.values(BD_DISTRICTS_BY_DIVISION)
  .flat()
  .sort((a, b) => a.localeCompare(b));

/**
 * Calculate standard domestic shipping fee in BDT
 * Inside Dhaka: ৳70
 * Greater Dhaka (Gazipur, Narayanganj): ৳100
 * Outside Dhaka (all other 61 districts): ৳130
 */
export function calculateShippingFee(division: string, district: string): number {
  const normDist = district.trim().toLowerCase();
  if (normDist === "dhaka") {
    return 70;
  }
  if (normDist === "gazipur" || normDist === "narayanganj") {
    return 100;
  }
  return 130;
}

export function isValidBdPhone(phone: string): boolean {
  // Accepts Bangladeshi phone numbers: 013, 014, 015, 016, 017, 018, 019 with or without +88
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(cleaned);
}

export function formatBdPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+880")) return cleaned;
  if (cleaned.startsWith("880")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+88${cleaned}`;
  return cleaned;
}

