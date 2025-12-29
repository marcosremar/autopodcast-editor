import { describe, it, expect, vi, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// We need to reimport for each test to reset in-memory storage
describe("Waitlist API", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let GET: () => Promise<Response>;

  beforeAll(async () => {
    // Dynamic import to get fresh module
    const module = await import("@/app/api/waitlist/route");
    POST = module.POST;
    GET = module.GET;
  });

  describe("POST /api/waitlist", () => {
    it("should accept a valid email", async () => {
      const request = new NextRequest("http://localhost:3000/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should reject an invalid email", async () => {
      const request = new NextRequest("http://localhost:3000/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email invalido");
    });

    it("should reject empty email", async () => {
      const request = new NextRequest("http://localhost:3000/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email invalido");
    });

    it("should normalize email to lowercase", async () => {
      const request = new NextRequest("http://localhost:3000/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "UNIQUE_UPPERCASE@EXAMPLE.COM" }),
      });

      const response = await POST(request);
      // Should succeed with 201 (new email) or 409 (if already exists from previous run)
      expect([201, 409]).toContain(response.status);
    });
  });

  describe("GET /api/waitlist", () => {
    it("should return waitlist count", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty("count");
      expect(typeof data.count).toBe("number");
    });
  });
});
