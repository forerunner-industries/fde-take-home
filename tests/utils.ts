import * as http from "http";
import { ErrorResponse, PaginatedResponse } from "../src/types/types";

const API_HOST = "localhost";
const API_PORT = 3000;

interface BaseResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
}

interface JsonResponse<T> extends BaseResponse {
  data: T;
}


function buildUrl(path: string, bypassRateLimit: boolean): string {
  const queryParams = new URLSearchParams();
  queryParams.set("_bypass_random_error", "true");
  if (bypassRateLimit) {
    queryParams.set("_bypass_rate_limit", "true");
  }

  const queryString = queryParams.toString();
  const fullPath = queryString
    ? `${path}${path.includes("?") ? "&" : "?"}${queryString}`
    : path;

  return `http://${API_HOST}:${API_PORT}${fullPath}`;
}

function processHeaders(response: Response): http.IncomingHttpHeaders {
  const headers = {} as http.IncomingHttpHeaders;
  response.headers.forEach((value, header) => {
    headers[header] = value;
  });
  return headers;
}

export async function makeRequest<T>(
  path: string,
  method = "GET",
  bypassRateLimit = true,
): Promise<JsonResponse<T>> {
  const url = buildUrl(path, bypassRateLimit);

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.text();
  const parsedData = data ? JSON.parse(data) : null;

  return {
    statusCode: response.status,
    data: parsedData,
    headers: processHeaders(response),
  };
}

