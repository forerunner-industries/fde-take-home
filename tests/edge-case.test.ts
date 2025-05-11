import { describe, expect, it } from "vitest";
import { ErrorResponse, PaginatedResponse } from "../src/types/types";
import { makeRequest } from "./utils";

describe("Edge-Caeses", () => {
  describe("Rate Limiting", () => {
    it("enforces rate limits", async () => {
      const numRequests = 15;
      const requests = [];

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          makeRequest<PaginatedResponse>("/v1/permits", "GET", false),
        );
      }

      const results = await Promise.all(requests.map((p) => p.catch((e) => e)));

      const rateLimitResponses = results.filter(
        (res) => res.statusCode === 429,
      );

      expect(rateLimitResponses.length).toBeGreaterThan(0);

      const rateLimitResponse = rateLimitResponses[0];
      expect(rateLimitResponse.data.code).toBe("rateLimitExceeded");
      expect(rateLimitResponse.data).toHaveProperty("message");
      expect(rateLimitResponse.statusCode).toBe(429);
    });
  });

  describe("Parameter Validation", () => {
    it("validates pagination parameters", async () => {
      const invalidPageResponse =
        await makeRequest<ErrorResponse>("/v1/permits?page=0");

      expect(invalidPageResponse.statusCode).toBe(400);
      expect(invalidPageResponse.headers["content-type"]).toContain(
        "application/json",
      );

      const invalidPerPageResponse = await makeRequest<ErrorResponse>(
        "/v1/permits?perPage=6",
      );
      expect(invalidPerPageResponse.statusCode).toBe(400);

      const invalidDateResponse = await makeRequest<ErrorResponse>(
        "/v1/permits?submittedAfter=invalid-date",
      );
      expect(invalidDateResponse.statusCode).toBe(400);

      const invalidStatusResponse = await makeRequest<ErrorResponse>(
        "/v1/permits?status=InvalidStatus",
      );
      expect(invalidStatusResponse.statusCode).toBe(400);

      const invalidPermitIdResponse = await makeRequest<ErrorResponse>(
        "/v1/permits/not-a-uuid",
      );
      expect(invalidPermitIdResponse.statusCode).toBe(400);
    });
  });
});
