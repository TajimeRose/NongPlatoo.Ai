/**
 * Activity Tracking Logger
 * ใช้สำหรับส่งข้อมูล user actions กลับไปยัง Backend API
 */

import { getApiBase } from '@/lib/api';

const API_BASE = getApiBase();
const TRACKING_ENDPOINT = `${API_BASE}/api/tracking/log`;

interface TrackingDetails {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Send tracking event to the server
 * @param actionName - Name of the action (e.g., 'click_buy_now', 'page_view')
 * @param details - Additional context data
 */
export const trackEvent = async (
    actionName: string,
    details: TrackingDetails = {}
): Promise<void> => {
    try {
        await fetch(TRACKING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: actionName,
                details: details,
                page_url: window.location.pathname,
            }),
        });
    } catch (error) {
        // Silently fail - don't disrupt user experience
        console.warn('Tracking failed:', error);
    }
};

/**
 * Track page view
 * @param pageName - Name of the page
 */
export const trackPageView = (pageName: string): void => {
    trackEvent('page_view', {
        page: pageName,
        url: window.location.pathname,
        referrer: document.referrer || null,
    });
};

/**
 * Track button click
 * @param buttonName - Name/ID of the button
 * @param context - Additional context
 */
export const trackClick = (
    buttonName: string,
    context: TrackingDetails = {}
): void => {
    trackEvent('click', {
        button: buttonName,
        ...context,
    });
};

/**
 * Track search action
 * @param query - Search query
 */
export const trackSearch = (query: string): void => {
    trackEvent('search', {
        query: query,
        timestamp: Date.now(),
    });
};

/**
 * Track chat message
 * @param messageType - 'user' or 'ai'
 */
export const trackChatMessage = (messageType: 'user' | 'ai'): void => {
    trackEvent('chat_message', {
        type: messageType,
        timestamp: Date.now(),
    });
};

export default {
    trackEvent,
    trackPageView,
    trackClick,
    trackSearch,
    trackChatMessage,
};
