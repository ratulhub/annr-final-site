import { beforeEach, describe, expect, it } from "vitest";
import { BD_DIVISIONS, BD_DISTRICTS_BY_DIVISION, calculateShippingFee, isValidBdPhone } from "../lib/bangladesh-geo";
import {
  validateReferralCoupon,
  calculateMaxRedeemablePoints,
  redeemMemberPointsForOrder,
  evaluateOrderCampaignBonuses,
  evaluateMemberTierLocally,
  adminAdjustMemberPoints,
  registerVipMember,
  getAllLocalVipMembers,
  getPointsLedger,
  getLoyaltyAdminLogs,
  creditVipReferrerLocally,
  updateStoreOrderStatus,
} from "../lib/loyalty";

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
    const reg = await registerVipMember({
      fullName: "Test Member",
      email: "vip-test-member@example.com",
      phone: "01711112233",
      division: "Dhaka",
      district: "Dhaka",
      fullAddress: "Road 1, Dhanmondi",
    });
    expect(reg.ok).toBe(true);
    const code = reg.member!.referral_code;
    const res = await validateReferralCoupon(code, 200);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Minimum order");
  });

  it("validates valid referral coupon code and calculates discount", async () => {
    const reg = await registerVipMember({
      fullName: "Test Valid Owner",
      email: "vip-owner-valid@example.com",
      phone: "01711112244",
      division: "Dhaka",
      district: "Dhaka",
      fullAddress: "Road 2, Banani",
    });
    expect(reg.ok).toBe(true);
    const code = reg.member!.referral_code;
    const res = await validateReferralCoupon(code, 5000, "customer@example.com");
    expect(res.valid).toBe(true);
    expect(res.discount_amount).toBeGreaterThan(0);
    expect(res.points_reward).toBe(100);
  });

  it("prevents self-referral abuse when email matches coupon owner", async () => {
    const ownerEmail = "vip-self-check@example.com";
    const reg = await registerVipMember({
      fullName: "Self Check Owner",
      email: ownerEmail,
      phone: "01711112255",
      division: "Dhaka",
      district: "Dhaka",
      fullAddress: "Road 3, Gulshan",
    });
    expect(reg.ok).toBe(true);
    const res = await validateReferralCoupon(reg.member!.referral_code, 5000, ownerEmail);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/own referral coupon/i);
  });
});

describe("ANNR Points Wallet, Checkout Redemption, Tiers, Campaigns & Audit Controls", () => {
  const memStore = new Map<string, string>();
  if (typeof globalThis.localStorage === "undefined") {
    (globalThis as any).localStorage = {
      getItem: (k: string) => (memStore.has(k) ? memStore.get(k)! : null),
      setItem: (k: string, v: string) => {
        memStore.set(k, String(v));
      },
      removeItem: (k: string) => {
        memStore.delete(k);
      },
      clear: () => {
        memStore.clear();
      },
    };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it("enforces checkout redemption limits (min order, max % of order, max points cap)", async () => {
    // Order below min_order_for_redemption (500) -> 0 redeemable
    const lowOrder = await calculateMaxRedeemablePoints(500, 300, false);
    expect(lowOrder.canRedeem).toBe(false);
    expect(lowOrder.maxPoints).toBe(0);
    expect(lowOrder.reason).toMatch(/Minimum order/i);

    // Balance below min_points_redemption (50) -> 0 redeemable
    const lowBal = await calculateMaxRedeemablePoints(30, 2000, false);
    expect(lowBal.canRedeem).toBe(false);
    expect(lowBal.maxPoints).toBe(0);

    // Order of ৳2,000 with max 50% order discount -> max 1,000 PTS (৳1,000)
    const cappedByPercent = await calculateMaxRedeemablePoints(1500, 2000, false);
    expect(cappedByPercent.canRedeem).toBe(true);
    expect(cappedByPercent.maxPoints).toBe(1000);
    expect(cappedByPercent.maxDiscountBdt).toBe(1000);
  });

  it("evaluates VIP tier upgrades accurately based on earned points or referrals", () => {
    const silverMember = {
      id: "vip-test-1",
      full_name: "Test Member",
      email: "tier@example.com",
      phone: "01711223344",
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Dhanmondi",
      full_address: "Road 2",
      is_whatsapp: true,
      tier: "Silver" as const,
      available_points: 600,
      pending_points: 0,
      withdrawn_points: 0,
      total_earned_points: 600,
      friends_referred: 2,
      referral_code: "ANNR-TIER01",
      referred_by_code: null,
      status: "active" as const,
      tier_multiplier: 1.0,
      created_at: new Date().toISOString(),
    };

    // 600 points >= Gold threshold (500 pts)
    const evaluated = evaluateMemberTierLocally(silverMember);
    expect(evaluated.upgraded).toBe(true);
    expect(evaluated.tier.name).toBe("Gold");
    expect(evaluated.tier.points_multiplier).toBe(1.25);
  });

  it("evaluates active promotional campaigns for qualifying orders", () => {
    const res = evaluateOrderCampaignBonuses({
      orderSubtotal: 6000,
      memberTier: "Gold",
      isFirstOrder: true,
      basePointsEarned: 120,
    });
    expect(res.bonusPoints).toBeGreaterThanOrEqual(150);
    expect(res.appliedCampaigns.length).toBeGreaterThan(0);
  });

  it("requires a mandatory audit reason for admin point adjustments and logs immutable ledger entries", async () => {
    const reg = await registerVipMember({
      fullName: "Audit Test User",
      email: "audit@example.com",
      phone: "01711009988",
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Gulshan",
      fullAddress: "Road 11",
    });
    expect(reg.ok).toBe(true);
    const target = reg.member!;

    // Missing/too-short reason must fail
    const failRes = await adminAdjustMemberPoints({
      memberEmail: target.email,
      pointsDelta: 200,
      reason: "no",
    });
    expect(failRes.ok).toBe(false);

    // Valid reason succeeds and writes to both Points Ledger and Admin Audit Log
    const okRes = await adminAdjustMemberPoints({
      memberEmail: target.email,
      pointsDelta: 250,
      reason: "VIP festival goodwill bonus approved by admin",
      adminEmail: "admin@annr.store",
    });
    expect(okRes.ok).toBe(true);
    expect(okRes.updatedMember?.available_points).toBe(target.available_points + 250);

    const ledger = getPointsLedger(target.email);
    expect(ledger[0]!.transaction_type).toBe("admin_adjustment");
    expect(ledger[0]!.amount).toBe(250);

    const logs = getLoyaltyAdminLogs();
    expect(logs[0]!.action_type).toBe("points_added");
    expect(logs[0]!.reason).toContain("goodwill bonus");
  });

  it("atomically redeems checkout points and automatically refunds them if the order is cancelled", async () => {
    const testEmail = `buyer-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const reg = await registerVipMember({
      fullName: "Redeem Buyer",
      email: testEmail,
      phone: "01811223344",
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Banani",
      fullAddress: "Block C",
    });
    const member = reg.member!;
    const initialPoints = member.available_points;
    // Credit +300 pts
    await adminAdjustMemberPoints({
      memberEmail: member.email,
      pointsDelta: 300,
      reason: "Seed balance for checkout test",
    });

    const beforeMembers = getAllLocalVipMembers();
    const seededMember = beforeMembers.find((m) => m.email === member.email)!;
    expect(seededMember.available_points).toBe(initialPoints + 300);

    const orderNumber = "1088";
    // Save mock order into annr-orders so updateStoreOrderStatus can cancel & refund it
    localStorage.setItem(
      "annr-orders",
      JSON.stringify([
        {
          id: orderNumber,
          order_number: orderNumber,
          email: member.email,
          status: "Pending",
          points_redeemed: 150,
          points_discount_bdt: 150,
          coupon_code: null,
        },
      ])
    );

    const redeemRes = await redeemMemberPointsForOrder({
      memberEmail: member.email,
      pointsToRedeem: 150,
      orderNumber,
      orderSubtotal: 2500,
    });

    expect(redeemRes.ok).toBe(true);
    expect(redeemRes.discountBdt).toBe(150);
    expect(redeemRes.remainingPoints).toBe(250);

    // Cancel the order -> 150 redeemed points are refunded back to available_points
    await updateStoreOrderStatus(orderNumber, "cancelled");
    const afterCancelMembers = getAllLocalVipMembers();
    const refundedMember = afterCancelMembers.find((m) => m.email === member.email)!;
    expect(refundedMember.available_points).toBe(400);
    expect(refundedMember.redeemed_points).toBe(0);
  });

  it("enforces idempotency and anti-self-referral in creditVipReferrerLocally", async () => {
    const reg = await registerVipMember({
      fullName: "Referrer Host",
      email: "host@example.com",
      phone: "01911223344",
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Uttara",
      fullAddress: "Sector 7",
    });
    const host = reg.member!;

    // 1. Self-referral by same email is blocked
    const selfAttempt = creditVipReferrerLocally({
      referralCode: host.referral_code,
      pointsReward: 100,
      buyerName: "Referrer Host",
      buyerEmail: "host@example.com",
      orderNumber: "5001",
      eventType: "order",
    });
    expect(selfAttempt.credited).toBe(false);

    // 2. First valid friend order credits +100 pts
    const firstOrder = creditVipReferrerLocally({
      referralCode: host.referral_code,
      pointsReward: 100,
      buyerName: "Friend Buyer",
      buyerEmail: "friend@example.com",
      orderNumber: "5002",
      orderTotal: 3000,
      eventType: "order",
    });
    expect(firstOrder.credited).toBe(true);

    // 3. Duplicate call for the same order_number #5002 is blocked idempotently
    const duplicateOrder = creditVipReferrerLocally({
      referralCode: host.referral_code,
      pointsReward: 100,
      buyerName: "Friend Buyer",
      buyerEmail: "friend@example.com",
      orderNumber: "5002",
      orderTotal: 3000,
      eventType: "order",
    });
    expect(duplicateOrder.credited).toBe(false);
    expect(duplicateOrder.reason).toMatch(/idempotent/i);
  });
});


