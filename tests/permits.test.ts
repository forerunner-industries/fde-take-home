import { beforeAll, describe, expect, it } from "vitest";
import { ErrorResponse, PaginatedResponse, Permit } from "../src/types/types";
import { makeRequest } from "./utils";

describe("Permit API", () => {
  describe("GET /permits", () => {
    it("returns a paginated list of permits", async () => {
      const response = await makeRequest<PaginatedResponse>("/v1/permits");

      expect(response.statusCode).toBe(200);
      expect(response.data.data.length).toBe(5);

      expect(response.data.meta.currentPage).toBe(1);
      expect(response.data.meta.totalPages).toBe(3);
      expect(response.data.meta.perPage).toBe(5);
      expect(response.data.meta.total).toBe(12);

      expect(response.data.links.self).toBe("/v1/permits?page=1&perPage=5");
      expect(response.data.links.next).toBe("/v1/permits?page=2&perPage=5");
      expect(response.data.links.prev).toBeUndefined();

      const permit = response.data.data[0];
      expect(permit).toEqual({
        permitId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        status: "Complete",
      });

      const nextPageResponse = await makeRequest<PaginatedResponse>(
        response.data.links.next,
      );

      expect(nextPageResponse.statusCode).toBe(200);
      expect(nextPageResponse.data.data.length).toBe(5);
      expect(nextPageResponse.data.meta.currentPage).toBe(2);
      expect(nextPageResponse.data.meta.totalPages).toBe(3);
      expect(nextPageResponse.data.meta.perPage).toBe(5);
      expect(nextPageResponse.data.meta.total).toBe(12);

      expect(nextPageResponse.data.links.self).toBe(
        "/v1/permits?page=2&perPage=5",
      );
      expect(nextPageResponse.data.links.next).toBe(
        "/v1/permits?page=3&perPage=5",
      );
      expect(nextPageResponse.data.links.prev).toBe(
        "/v1/permits?page=1&perPage=5",
      );

      // Verify that we got different permits on the second page
      const firstPageIds = new Set(response.data.data.map((p) => p.permitId));
      const secondPageIds = new Set(
        nextPageResponse.data.data.map((p) => p.permitId),
      );
      const hasOverlap = Array.from(firstPageIds).some((id) =>
        secondPageIds.has(id),
      );
      expect(hasOverlap).toBe(false);
    });

    it("respects pagination parameters", async () => {
      const response = await makeRequest<PaginatedResponse>(
        "/v1/permits?page=1&perPage=3",
      );

      expect(response.statusCode).toBe(200);
      expect(response.data.meta.currentPage).toBe(1);
      expect(response.data.meta.perPage).toBe(3);

      expect(response.data.data.length).toBe(3);
    });
  });

  describe("GET /permits/:id", () => {
    it("returns a single permit by ID", async () => {
      const listResponse = await makeRequest<PaginatedResponse>("/v1/permits");
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.data.data.length).toBeGreaterThan(0);

      const permitId = listResponse.data.data[0].permitId;
      const response = await makeRequest<Permit>(`/v1/permits/${permitId}`);

      expect(response.statusCode).toBe(200);
      expect(response.data.permitId).toBe(permitId);
      expect(response.data).toEqual({
        permitId: permitId,
        propertyAddress: {
          street: "7 Gravelly Point Rd",
          city: "Highlands",
          state: "NJ",
          zip: "07732",
        },
        status: "Complete",
        dateSubmitted: "2025-03-27",
        improvementAmount: 1600,
        documents: [
          {
            documentId: "DOC-2025-0101",
            documentType: "Floodplain Development Permit",
            filename: "Gravelly_FL_FD_Permit_SIGNED_3.25.pdf",
            fileUrl:
              "https://permits.example.com/files/Gravelly_FL_FD_Permit_SIGNED_3.25.pdf",
            uploadDate: "2025-03-27",
          },
        ],
      });
    });

    it("returns 404 for non-existent permit", async () => {
      const response = await makeRequest<ErrorResponse>(
        "/v1/permits/a2385cf5-4e9b-476e-b3b3-911d2b1cb3f5",
      );

      expect(response.statusCode).toBe(404);
      expect(response.data.code).toBe("notFound");
      expect(response.data).toEqual({
        code: "notFound",
        message:
          "Permit with ID a2385cf5-4e9b-476e-b3b3-911d2b1cb3f5 not found",
      });
    });
  });

  describe("Filtering", () => {
    it("filters permits by status", async () => {
      const status = "Pending";
      const response = await makeRequest<PaginatedResponse>(
        `/v1/permits?status=${status}`,
      );

      expect(response.statusCode).toBe(200);

      expect(response.data.data.length).toBe(2);
      const allHaveCorrectStatus = response.data.data.every(
        (permit) => permit.status === status,
      );
      expect(allHaveCorrectStatus).toBe(true);
    });

    it("filters permits by date range", async () => {
      const allPermitsResponse = await makeRequest<PaginatedResponse>(
        "/v1/permits?perPage=5",
      );

      expect(allPermitsResponse.statusCode).toBe(200);
      expect(allPermitsResponse.data.data.length).toBe(5);

      // Get full permit details for date comparison
      const permits = await Promise.all(
        allPermitsResponse.data.data.map((permit) =>
          makeRequest<Permit>(`/v1/permits/${permit.permitId}`),
        ),
      );

      const sortedDates = permits
        .map((response) => response.data)
        .sort(
          (a, b) =>
            new Date(a.dateSubmitted).getTime() -
            new Date(b.dateSubmitted).getTime(),
        );

      const midIndex = Math.floor(sortedDates.length / 2);
      const midpointDate = sortedDates[midIndex].dateSubmitted;

      const afterResponse = await makeRequest<PaginatedResponse>(
        `/v1/permits?submittedAfter=${midpointDate}`,
      );

      expect(afterResponse.statusCode).toBe(200);
      expect(afterResponse.data.data.length).toBe(5);

      // Verify dates by fetching full permit details
      const afterPermits = await Promise.all(
        afterResponse.data.data.map((permit) =>
          makeRequest<Permit>(`/v1/permits/${permit.permitId}`),
        ),
      );

      const allAfterMidpoint = afterPermits
        .map((response) => response.data)
        .every(
          (permit) => new Date(permit.dateSubmitted) >= new Date(midpointDate),
        );
      expect(allAfterMidpoint).toBe(true);

      const beforeResponse = await makeRequest<PaginatedResponse>(
        `/v1/permits?submittedBefore=${midpointDate}`,
      );

      expect(beforeResponse.statusCode).toBe(200);
      expect(beforeResponse.data.data.length).toBe(5);

      // Verify dates by fetching full permit details
      const beforePermits = await Promise.all(
        beforeResponse.data.data.map((permit) =>
          makeRequest<Permit>(`/v1/permits/${permit.permitId}`),
        ),
      );

      const allBeforeMidpoint = beforePermits
        .map((response) => response.data)
        .every(
          (permit) => new Date(permit.dateSubmitted) <= new Date(midpointDate),
        );
      expect(allBeforeMidpoint).toBe(true);
    });
  });
});
