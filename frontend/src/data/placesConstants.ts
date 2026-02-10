/**
 * Constants for Places page
 */

export const DISTRICTS = [
    { value: "amphawa", label: "อัมพวา", labelEn: "Amphawa" },
    { value: "mueang", label: "เมือง", labelEn: "Mueang" },
    { value: "bang-khonthi", label: "บางคนที", labelEn: "Bang Khonthi" },
] as const;

export const CATEGORIES = [
    { value: "market", label: "ตลาด", labelEn: "Market" },
    { value: "temple", label: "วัด", labelEn: "Temple" },
    { value: "cafe", label: "คาเฟ่", labelEn: "Café" },
    { value: "homestay", label: "โฮมสเตย์", labelEn: "Homestay" },
    { value: "photo-spot", label: "จุดถ่ายรูป", labelEn: "Photo Spot" },
] as const;

export const WATERMARK_CONFIG = {
    position: "fixed top-20 left-4 z-50 pointer-events-none",
    text: {
        main: "DEV",
        sub: "In Progress",
    },
    icon: "🚧",
} as const;
