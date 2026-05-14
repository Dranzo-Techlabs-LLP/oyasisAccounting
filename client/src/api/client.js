import axios from "axios";
import { mockRequest } from "./mockApi";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true
});

const shouldFallbackToMock = (error) =>
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
