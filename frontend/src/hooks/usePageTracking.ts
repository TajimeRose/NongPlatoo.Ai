/**
 * usePageTracking Hook
 * Auto-tracks page views when user navigates to different pages
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/utils/logger';

// Map routes to friendly page names
const pageNameMap: Record<string, string> = {
    '/': 'หน้าแรก',
    '/chat': 'AI แชท',
    '/places': 'ที่เที่ยว',
    '/auth': 'เข้าสู่ระบบ',
};

/**
 * Hook to automatically track page views
 * Use this in your main App or layout component
 */
export const usePageTracking = () => {
    const location = useLocation();

    useEffect(() => {
        // Get friendly name or use pathname
        const pageName = pageNameMap[location.pathname] || location.pathname;

        // Track the page view
        trackPageView(pageName);

        console.log('[Tracking] Page view:', pageName);
    }, [location.pathname]);
};

export default usePageTracking;
