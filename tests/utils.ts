import * as http from "http";
import { ErrorResponse, PaginatedResponse } from "../src/types/types";

const API_HOST = "localhost";
const API_PORT = 3000;

export async function makeRequest<T>(
  path: string,
  method = "GET",
  bypassRateLimit = true,
): Promise<{ statusCode: number; data: T; headers: http.IncomingHttpHeaders }> {
  const queryParams = new URLSearchParams();
  // Always bypass random errors in tests
  queryParams.set("_bypass_random_error", "true");
  if (bypassRateLimit) {
    queryParams.set("_bypass_rate_limit", "true");
  }
  const queryString = queryParams.toString();
  const fullPath = queryString
    ? `${path}${path.includes("?") ? "&" : "?"}${queryString}`
    : path;

  const url = `http://${API_HOST}:${API_PORT}${fullPath}`;

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.text();
  const parsedData = data ? JSON.parse(data) : null;

  const headers = {};
  response.headers.forEach((value, header) => {
    headers[header] = value;
  });

  return {
    statusCode: response.status,
    data: parsedData,
    headers,
  };
}
