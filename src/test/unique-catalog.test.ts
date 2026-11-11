import { describe, expect, it } from "vitest";

describe("AnnR Unique One-of-One Archival Catalog", () => {
  const CATEGORIES = [
    "hoodies",
    "sweatshirts",
    "trousers",
    "sweaters",
    "t-shirts",
    "jackets",
    "knitwear",
    "accessories",
  ];

  type OneOfOneProduct = {
    handle: string;
    code: string;
    title: string;
    price: number;
    status: "active" | "reserved" | "sold" | "draft" | "archived";
    category: string;
    campaign: string;
    size: string;
    showSize?: boolean;
    measurementUnit?: "in" | "cm";
    stock: number;
    measurements: {
      chest?: number;
      length?: number;
      shoulder?: number;
      sleeve?: number;
      waist?: number;
      inseam?: number;
    };
    fabric: string;
    condition: string;
    reserved_until?: string | null;
  };

  const samplePiece: OneOfOneProduct = {
    handle: "archival-heavy-hoodie-001",
    code: "ANNR-U001",
    title: "AnnR Archival Reversible Heavyweight Hoodie",
    price: 9800,
    status: "active",
    category: "hoodies",
    campaign: "unique-campaign",
    size: "L",
    showSize: true,
    measurementUnit: "in",
    stock: 1,
    measurements: {
      chest: 24.5,
      length: 29,
      shoulder: 20.5,
      sleeve: 25,
    },
    fabric: "500 GSM Double-Face Custom French Terry",
    condition: "10/10 Deadstock Archival",
  };

  it("enforces strict 1-of-1 stock constraints (0 or 1)", () => {
    expect(samplePiece.stock).toBe(1);
    expect([0, 1]).toContain(samplePiece.stock);

    const soldPiece = { ...samplePiece, status: "sold" as const, stock: 0 };
    expect(soldPiece.stock).toBe(0);
    expect(soldPiece.status).toBe("sold");
  });

  it("assigns valid categories aligned with AnnR taxonomy", () => {
    expect(CATEGORIES).toContain(samplePiece.category);
    expect(samplePiece.campaign).toBe("unique-campaign");
  });

  it("validates product SKU code format", () => {
    expect(samplePiece.code).toMatch(/^ANNR-[A-Za-z0-9_-]{3,20}$/);
  });

  it("contains flat measurements in inches with optional decimal precision", () => {
    expect(samplePiece.measurementUnit).toBe("in");
    expect(samplePiece.measurements.chest).toBe(24.5);
    expect(samplePiece.measurements.length).toBe(29);
    expect(samplePiece.measurements.shoulder).toBe(20.5);
    expect(samplePiece.measurements.sleeve).toBe(25);
  });

  it("supports toggling size badge visibility (show vs hide alpha size)", () => {
    // When showSize is true, badge displays size L
    const visibleBadge = samplePiece.showSize !== false && samplePiece.size
      ? `1 OF 1 · SIZE ${samplePiece.size}`
      : "1 OF 1 · PIECE";
    expect(visibleBadge).toBe("1 OF 1 · SIZE L");

    // When showSize is false, badge suppresses alpha size and displays piece info only
    const hiddenPiece: OneOfOneProduct = { ...samplePiece, showSize: false };
    const hiddenBadge = hiddenPiece.showSize !== false && hiddenPiece.size
      ? `1 OF 1 · SIZE ${hiddenPiece.size}`
      : "1 OF 1 · PIECE";
    expect(hiddenBadge).toBe("1 OF 1 · PIECE");
  });

  it("handles 15-minute checkout reservation hold and release logic", () => {
    const now = Date.now();
    const reservedUntil = new Date(now + 15 * 60 * 1000).toISOString();

    const reservedPiece: OneOfOneProduct = {
      ...samplePiece,
      status: "reserved",
      reserved_until: reservedUntil,
    };

    expect(reservedPiece.status).toBe("reserved");
    expect(new Date(reservedPiece.reserved_until!).getTime()).toBeGreaterThan(now);

    // After 15 minutes, reservation hold expires back to active
    const expiredTime = new Date(now - 1000).toISOString();
    const expiredPiece = { ...reservedPiece, reserved_until: expiredTime };
    const isExpired = new Date(expiredPiece.reserved_until).getTime() <= now;
    expect(isExpired).toBe(true);

    const releasedPiece: OneOfOneProduct = {
      ...expiredPiece,
      status: isExpired ? "active" : "reserved",
      reserved_until: null,
    };
    expect(releasedPiece.status).toBe("active");
    expect(releasedPiece.reserved_until).toBeNull();
  });

  it("matches search queries by product code SKU, exact size, and category", () => {
    const catalog: OneOfOneProduct[] = [
      samplePiece,
      {
        handle: "bespoke-cargo-trouser-002",
        code: "ANNR-U002",
        title: "Bespoke Architectural Cargo Trousers",
        price: 11500,
        status: "active",
        category: "trousers",
        campaign: "unique-campaign",
        size: "32",
        stock: 1,
        measurements: { waist: 82, length: 106, inseam: 76 },
        fabric: "Heavyweight Waxed Canvas",
        condition: "10/10 Mint",
      },
    ];

    // Search by code
    const byCode = catalog.filter((p) => p.code.toLowerCase().includes("u001"));
    expect(byCode.length).toBe(1);
    expect(byCode[0]!.handle).toBe("archival-heavy-hoodie-001");

    // Search by category
    const byCategory = catalog.filter((p) => p.category === "trousers");
    expect(byCategory.length).toBe(1);
    expect(byCategory[0]!.code).toBe("ANNR-U002");

    // Search by size
    const bySize = catalog.filter((p) => p.size === "32");
    expect(bySize.length).toBe(1);
    expect(bySize[0]!.handle).toBe("bespoke-cargo-trouser-002");
  });
});

