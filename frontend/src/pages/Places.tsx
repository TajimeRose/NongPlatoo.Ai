import { useState, useMemo, useEffect } from "react";
import { Search, Filter, X, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import PlaceCard from "@/components/PlaceCard";
import { usePlaceFilters } from "@/hooks/usePlaceFilters";
import { getApiBase } from "@/lib/api";

interface Place {
  id: string;
  name: string;
  nameTh?: string;
  description: string;
  descriptionTh?: string;
  location?: string;
  address?: string;
  district?: string;
  category: string;
  image?: string;
  images?: string[];
  rating: number | null | undefined;
  tags: string[];
  openTime?: string;
  closeTime?: string;
  isOpen?: boolean;
  googleMapsUrl?: string;
  addressTh?: string;
  [key: string]: any;
}

const Places = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbDistricts, setDbDistricts] = useState<Array<{ value: string; label: string }>>([]);
  const [dbCategories, setDbCategories] = useState<Array<{ value: string; label: string }>>([]);

  const {
    search,
    selectedDistrict,
    selectedCategory,
    setSearch,
    handleDistrictChange,
    handleCategoryChange,
    clearFilters,
    hasActiveFilters,
  } = usePlaceFilters();

  // Fetch districts and categories from API
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const API_BASE = getApiBase();
        
        const [districtRes, categoryRes] = await Promise.all([
          fetch(`${API_BASE}/api/filters/districts`),
          fetch(`${API_BASE}/api/filters/categories`)
        ]);

        if (districtRes.ok) {
          const data = await districtRes.json();
          if (data.success && Array.isArray(data.districts)) {
            setDbDistricts(
              data.districts.map((d: string) => ({
                value: d,
                label: d
              }))
            );
          }
        }

        if (categoryRes.ok) {
          const data = await categoryRes.json();
          if (data.success && Array.isArray(data.categories)) {
            setDbCategories(
              data.categories.map((c: string) => ({
                value: c,
                label: c
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };

    fetchFilters();
  }, []);

  // Fetch places from database
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const API_BASE = getApiBase();
        const response = await fetch(`${API_BASE}/api/places`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.places)) {
          // Ensure all places have required fields with defaults
          const processedPlaces = data.places.map((place: any) => {
            // Get the first image from images array or use image field
            let imageUrl = '/placeholder.jpg';
            if (Array.isArray(place.images) && place.images.length > 0) {
              imageUrl = place.images[0];
            } else if (place.image) {
              imageUrl = place.image;
            } else if (place.image_url) {
              imageUrl = place.image_url;
            }

            return {
              id: place.id || '',
              name: place.name || 'Unknown',
              nameTh: place.name || '', // Use name if nameTh not available
              description: place.description || '',
              descriptionTh: place.description || '',
              location: place.address || place.location || '',
              district: place.city || place.district || '',
              category: place.category || place.type?.[0] || '',
              image: imageUrl,
              images: Array.isArray(place.images) ? place.images : [imageUrl],
              rating: place.rating ?? null,
              tags: Array.isArray(place.tags) ? place.tags : (place.type || []),
              openTime: place.openTime || place.opening_hours || '',
              closeTime: place.closeTime || '',
              isOpen: place.isOpen !== false,
              googleMapsUrl: place.googleMapsUrl || '',
              address: place.address || '',
              addressTh: place.addressTh || '',
            };
          });
          setAllPlaces(processedPlaces);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Error fetching places:", err);
        setError(err instanceof Error ? err.message : "Failed to load places");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  // Filter places based on search and selected filters
  const filteredPlaces = useMemo(() => {
    return allPlaces.filter((place) => {
      // Filter by district
      if (selectedDistrict && place.district !== selectedDistrict) {
        return false;
      }

      // Filter by category
      if (selectedCategory && place.category !== selectedCategory) {
        return false;
      }

      // Filter by search query
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          place.name.toLowerCase().includes(searchLower) ||
          place.nameTh.includes(search) ||
          place.description.toLowerCase().includes(searchLower) ||
          place.descriptionTh.includes(search) ||
          place.tags.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [allPlaces, selectedDistrict, selectedCategory, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <header className="pt-24 pb-8 bg-gradient-sky">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            สถานที่ท่องเที่ยว
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore Places — {filteredPlaces.length} destinations to discover
          </p>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-md border-b border-border py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสถานที่... (Search places)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 bg-background"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <Button
              variant="outline"
              className="md:hidden h-12"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-2 bg-primary text-primary-foreground">
                  Active
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="hidden md:flex h-12"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Filters */}
          <div
            className={`mt-4 space-y-4 ${showFilters ? "block" : "hidden md:block"
              }`}
          >
            {/* District Filter */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                อำเภอ (District)
              </p>
              <div className="flex flex-wrap gap-2">
                {dbDistricts.map((district) => (
                  <Button
                    key={district.value}
                    variant={
                      selectedDistrict === district.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleDistrictChange(district.value)}
                    className="rounded-full"
                  >
                    {district.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                ประเภท (Category)
              </p>
              <div className="flex flex-wrap gap-2">
                {dbCategories.map((category) => (
                  <Button
                    key={category.value}
                    variant={
                      selectedCategory === category.value ? "sky" : "outline"
                    }
                    size="sm"
                    onClick={() => handleCategoryChange(category.value)}
                    className="rounded-full"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 animate-spin text-primary mr-2" />
              <p className="text-muted-foreground">Loading places...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Error Loading Places
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : filteredPlaces.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-6">
                พบ {filteredPlaces.length} สถานที่ (Found {filteredPlaces.length}{" "}
                places)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaces.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    id={place.id}
                    name={place.name}
                    nameTh={place.nameTh}
                    location={place.location}
                    image={place.image}
                    rating={place.rating}
                    tags={place.tags}
                    isOpen={place.isOpen}
                    className={`animate-slide-up animation-delay-${(index % 3) * 100
                      }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                ไม่พบสถานที่
              </h3>
              <p className="text-muted-foreground">
                No places found. Try adjusting your filters.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Places;
