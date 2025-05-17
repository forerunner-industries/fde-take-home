import fs from "fs";
import path from "path";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import morgan from "morgan";
import {
  ErrorResponse,
  PaginatedResponse,
  Permit,
  PermitQuerySchema,
  validatePermits,
  validateUUID,
} from "./types/types";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

const loadPermits = (): Permit[] => {
  const filePath = path.join(__dirname, "..", "data", "permits.json");
  const data = fs.readFileSync(filePath, "utf8");
  const parsedData = JSON.parse(data);
  return validatePermits(parsedData);
};


const requestTimestamps: number[] = [];
const RATE_LIMIT = 5;
const RATE_WINDOW = 1000;

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.query._bypass_rate_limit === "true") {
    return next();
  }

  const now = Date.now();

  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] < now - RATE_WINDOW
  ) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT) {
    return res.status(429).json({
      code: "rateLimitExceeded",
      message: "Rate limit exceeded. Only 5 requests per second allowed.",
    } satisfies ErrorResponse);
  }

  requestTimestamps.push(now);

  // Add random 500 error for any request (20% chance)
  if (req.query._bypass_random_error !== "true" && Math.random() < 0.2) {
    return res.status(500).json({
      code: "serverError",
      message: "Internal server error - random occurrence",
    } satisfies ErrorResponse);
  }

  next();
});

app.get("/v1/permits", (req: Request, res: Response) => {
  const { data: query, error } = PermitQuerySchema.safeParse(req.query);

  if (error) {
    const validationErrors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return res.status(400).json({
      code: "validationError",
      message: "Invalid query parameters",
      errors: validationErrors,
    } satisfies ErrorResponse & {
      errors: Array<{ field: string; message: string }>;
    });
  }

  const permits = loadPermits();
  let filteredPermits = [...permits];

  const submittedAfter = query.submittedAfter;
  if (submittedAfter) {
    filteredPermits = filteredPermits.filter(
      (permit) => new Date(permit.dateSubmitted) >= new Date(submittedAfter),
    );
  }

  const submittedBefore = query.submittedBefore;
  if (submittedBefore) {
    filteredPermits = filteredPermits.filter(
      (permit) => new Date(permit.dateSubmitted) <= new Date(submittedBefore),
    );
  }

  if (query.status) {
    filteredPermits = filteredPermits.filter(
      (permit) => permit.status === query.status,
    );
  }

  const totalPermits = filteredPermits.length;
  const totalPages = Math.ceil(totalPermits / query.perPage);
  const startIndex = (query.page - 1) * query.perPage;
  const endIndex = Math.min(startIndex + query.perPage, totalPermits);

  const paginatedPermits = filteredPermits
    .slice(startIndex, endIndex)
    .map((permit) => ({
      permitId: permit.permitId,
      status: permit.status,
    }));

  const response: PaginatedResponse = {
    data: paginatedPermits,
    meta: {
      currentPage: query.page,
      totalPages: totalPages,
      perPage: query.perPage,
      total: totalPermits,
    },
    links: {
      self: `/v1/permits?page=${query.page}&perPage=${query.perPage}`,
      next:
        query.page < totalPages
          ? `/v1/permits?page=${query.page + 1}&perPage=${query.perPage}`
          : undefined,
      prev:
        query.page > 1
          ? `/v1/permits?page=${query.page - 1}&perPage=${query.perPage}`
          : undefined,
    },
  };

  res.json(response);
});

interface PermitParams {
  permitId: string;
}

app.get(
  "/v1/permits/:permitId",
  (req: Request<PermitParams>, res: Response) => {
    if (!validateUUID(req.params.permitId)) {
      return res.status(400).json({
        code: "validationError",
        message: "permitId must be a valid UUID",
      } satisfies ErrorResponse);
    }
    const permits = loadPermits();
    const permit = permits.find((p) => p.permitId === req.params.permitId);

    if (!permit) {
      return res.status(404).json({
        code: "notFound",
        message: `Permit with ID ${req.params.permitId} not found`,
      } satisfies ErrorResponse);
    }

    res.json(permit);
  },
);


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    code: "serverError",
    message: "An unexpected error occurred",
  } satisfies ErrorResponse);
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: "notFound",
    message: "The requested resource was not found",
  } satisfies ErrorResponse);
});

app.listen(PORT, () => {
  console.log(`Permit System API server running on port ${PORT}`);
  console.log(`API accessible at http://localhost:${PORT}/v1/permits`);
});
