import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === "/") {
    return "/";
  }
  if (pathname.startsWith("/places/")) {
    return "/places/:id";
  }
  return pathname;
};

const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const path = normalizePath(location.pathname);

    fetch(`${API_BASE}/api/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      signal: controller.signal,
    }).catch((err) => {
      console.error("Failed to record page view", err);
    });

    return () => controller.abort();
  }, [location.pathname]);

  return null;
};

export default PageViewTracker;
