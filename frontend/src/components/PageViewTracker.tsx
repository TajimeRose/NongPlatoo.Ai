import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getApiBase } from "@/lib/api";

const API_BASE = getApiBase();

// Map routes to friendly Thai names
const pageNameMap: Record<string, string> = {
  '/': 'หน้าแรก',
  '/chat': 'AI แชท',
  '/places': 'ที่เที่ยว',
  '/auth': 'เข้าสู่ระบบ',
};

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
    const pageName = pageNameMap[path] || path;

    // Log to user_activity_logs via tracking API
    fetch(`${API_BASE}/api/tracking/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "page_view",
        details: {
          page: pageName,
          url: location.pathname,
          referrer: document.referrer || null,
        },
        page_url: location.pathname,
        target_element: "page",
      }),
      signal: controller.signal,
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        console.warn("[Tracking] Failed to record page view:", err);
      }
    });

    // Also call the original /api/visits for backward compatibility
    fetch(`${API_BASE}/api/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      signal: controller.signal,
    }).catch(() => {
      // Silently fail for visits counter
    });

    return () => controller.abort();
  }, [location.pathname]);

  return null;
};

export default PageViewTracker;
