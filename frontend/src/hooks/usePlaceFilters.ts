import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface UseFilterOptions {
    initialDistrict?: string;
    initialCategory?: string;
}

interface FilterState {
    search: string;
    selectedDistrict: string;
    selectedCategory: string;
}

interface FilterHandlers {
    setSearch: (value: string) => void;
    handleDistrictChange: (district: string) => void;
    handleCategoryChange: (category: string) => void;
    clearFilters: () => void;
}

interface FilterResult extends FilterState, FilterHandlers {
    hasActiveFilters: boolean;
}

/**
 * Custom hook for managing place filtering logic
 * Handles search, district, and category filters with URL params
 */
export const usePlaceFilters = (options: UseFilterOptions = {}): FilterResult => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>(
        options.initialDistrict || searchParams.get("district") || ""
    );
    const [selectedCategory, setSelectedCategory] = useState<string>(
        options.initialCategory || searchParams.get("category") || ""
    );

    const updateSearchParams = (district: string, category: string) => {
        const params = new URLSearchParams();
        if (district) params.set("district", district);
        if (category) params.set("category", category);
        setSearchParams(params);
    };

    const handleDistrictChange = (district: string) => {
        const newDistrict = selectedDistrict === district ? "" : district;
        setSelectedDistrict(newDistrict);
        updateSearchParams(newDistrict, selectedCategory);
    };

    const handleCategoryChange = (category: string) => {
        const newCategory = selectedCategory === category ? "" : category;
        setSelectedCategory(newCategory);
        updateSearchParams(selectedDistrict, newCategory);
    };

    const clearFilters = () => {
        setSelectedDistrict("");
        setSelectedCategory("");
        setSearch("");
        setSearchParams(new URLSearchParams());
    };

    const hasActiveFilters = useMemo(
        () => Boolean(selectedDistrict || selectedCategory || search),
        [selectedDistrict, selectedCategory, search]
    );

    return {
        search,
        selectedDistrict,
        selectedCategory,
        setSearch,
        handleDistrictChange,
        handleCategoryChange,
        clearFilters,
        hasActiveFilters,
    };
};
