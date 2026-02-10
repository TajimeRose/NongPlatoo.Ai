// View counter utilities using localStorage

const VIEWS_STORAGE_KEY = 'place_views';

export interface PlaceViews {
    [placeId: string]: number;
}

// Get all place views from localStorage
export const getAllViews = (): PlaceViews => {
    try {
        const stored = localStorage.getItem(VIEWS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading views from localStorage:', error);
        return {};
    }
};

// Get view count for a specific place
export const getPlaceViews = (placeId: string): number => {
    const allViews = getAllViews();
    return allViews[placeId] || 0;
};

// Increment view count for a place
export const incrementPlaceViews = (placeId: string): number => {
    try {
        const allViews = getAllViews();
        const currentViews = allViews[placeId] || 0;
        const newViews = currentViews + 1;

        allViews[placeId] = newViews;
        localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(allViews));

        return newViews;
    } catch (error) {
        console.error('Error incrementing views:', error);
        return getPlaceViews(placeId);
    }
};

// Format view count for display (e.g., 1234 -> 1.2K)
export const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
};
