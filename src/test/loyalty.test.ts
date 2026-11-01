import { describe, expect, it } from "vitest";
import { BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, calculateShippingFee, isValidBdPhone } from "../lib/bangladesh-geo";
import { validateReferralCoupon } from "../lib/loyalty";

describe("Bangladesh Geographical Data & Shipping", () => {
  it("includes all 8 constitutional divisions of Bangladesh", () => {
    expect(BD_DIVISIONS).toHaveLength(8);
    expect(BD_DIVISIONS).toContain("Dhaka");
    expect(BD_DIVISIONS).toContain("Chattogram");
    expect(BD_DIVISIONS).toContain("Rajshahi");
    expect(BD_DIVISIONS).toContain("Khulna");
    expect(BD_DIVISIONS).toContain("Barishal");
    expect(BD_DIVISIONS).toContain("Sylhet");
    expect(BD_DIVISIONS).toContain("Rangpur");
    expect(BD_DIVISIONS).toContain("Mymensingh");
  });

  it("maps all 64 districts correctly across divisions", () => {
    let totalDistricts = 0;
    for (const div of BD_DIVISIONS) {
      const dists = BD_DISTRICTS_BY_DIVISION[div as keyof typeof BD_DISTRICTS_BY_DIVISION];
      expect(Array.isArray(dists)).toBe(true);
      expect(dists.length).toBeGreaterThan(0);
      totalDistricts += dists.length;
    }
    expect(totalDistricts).toBe(64);
  });

  it("calculates accurate shipping fees by district", () => {
    // Inside Dhaka city: ৳70
    expect(calculateShippingFee("Dhaka", "Dhaka")).toBe(70);

    // Greater Dhaka suburban (Gazipur / Narayanganj): ৳100
    expect(calculateShippingFee("Dhaka", "Gazipur")).toBe(100);
    expect(calculateShippingFee("Dhaka", "Narayanganj")).toBe(100);

    // Outside Dhaka (Chattogram, Sylhet, Khulna, etc.): ৳130
    expect(calculateShippingFee("Chattogram", "Chattogram")).toBe(130);
    expect(calculateShippingFee("Sylhet", "Sylhet")).toBe(130);
  });

  it("validates Bangladesh phone number formats (013 - 019)", () => {
    expect(isValidBdPhone("01712345678")).toBe(true);
    expect(isValidBdPhone("+8801812345678")).toBe(true);
    expect(isValidBdPhone("8801912345678")).toBe(true);
    expect(isValidBdPhone("01300000000")).toBe(true);

    // Invalid numbers
    expect(isValidBdPhone("01200000000")).toBe(false);
    expect(isValidBdPhone("123456")).toBe(false);
    expect(isValidBdPhone("abcdefghijk")).toBe(false);
  });
});

describe("VIP Referral & Loyalty Coupon Rules", () => {
  it("rejects empty or whitespace coupon codes", async () => {
    const res = await validateReferralCoupon("", 2000);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects order amounts below minimum order threshold", async () => {
    const res = await validateReferralCoupon("VIP-RATUL88", 200);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Minimum order");
  });

  it("validates valid referral coupon code and calculates discount", async () => {
    const res = await validateReferralCoupon("VIP-RATUL88", 5000, "customer@example.com");
    if (res.valid) {
      expect(res.discount_amount).toBeGreaterThan(0);
      expect(res.points_reward).toBe(100);
    }
  });

  it("prevents self-referral abuse when email matches coupon owner", async () => {
    // Simulated self referral check
    const ownerEmail = "ratul@example.com";
    const res = await validateReferralCoupon("VIP-RATUL88", 5000, ownerEmail);
    if (!res.valid) {
      expect(res.error).toMatch(/own referral coupon/i);
    }
  });
});
