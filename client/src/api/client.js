import axios from "axios";
import { mockRequest } from "./mockApi";

// API base URL resolution:
//   1. An explicit VITE_API_URL always wins (set it at build time to point
//      at a separate API host if the API isn't served from the same origin).
//   2. In production (a `vite build`) default to a RELATIVE "/api" so calls
//      go to whatever origin the site is served from — the server's own
//      Node process (or the .htaccess reverse-proxy) then handles /api/*.
//      Using an absolute "http://localhost:4000" here was the cause of the
//      "only 10 bookings show" bug: every visitor's browser tried to reach
//      *their own* localhost:4000, failed, and silently fell back to the
//      built-in demo data (which contains exactly 10 seed bookings).
//   3. In local dev (`vite dev`) default to the dev API on port 4000.
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

const http = axios.create({
  baseURL,
  withCredentials: true
});

// The offline demo fallback (mockApi) exists so the UI is explorable without
// a backend during development. It must NEVER kick in for a production build:
// silently swapping real financial data for fake seed data would be dangerous
// and is exactly what masked a real API outage as "missing bookings".
const shouldFallbackToMock = (error) =>
  import.meta.env.DEV &&
  !error.response &&
  (error.code === "ERR_NETWORK" ||
    String(error.message || "").toLowerCase().includes("network"));

const request = async (method, url, config = {}) => {
  try {
    return await http({ method, url, ...config });
  } catch (error) {
    if (shouldFallbackToMock(error)) {
      return mockRequest(method, url, config);
    }
    throw error;
  }
};

export const api = {
  get(url, config) {
    return request("get", url, config);
  },
  post(url, data, config = {}) {
    return request("post", url, { ...config, data });
  },
  put(url, data, config = {}) {
    return request("put", url, { ...config, data });
  },
  patch(url, data, config = {}) {
    return request("patch", url, { ...config, data });
  },
  delete(url, config) {
    return request("delete", url, config);
  }
};
