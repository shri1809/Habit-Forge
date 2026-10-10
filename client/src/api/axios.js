import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("habitforge_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    config.headers["x-user-timezone"] =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    config.headers["x-user-timezone"] = "UTC";
  }
  return config;
});

export default API;