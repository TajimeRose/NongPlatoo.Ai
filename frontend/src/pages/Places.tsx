import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import PlaceCard from "@/components/PlaceCard";
import { places, filterPlaces } from "@/data/places";
import { usePlaceFilters } from "@/hooks/usePlaceFilters";
import { DISTRICTS, CATEGORIES, WATERMARK_CONFIG } from "@/data/placesConstants";

const Places = () => {
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredPlaces = useMemo(() => {
    return filterPlaces(
      selectedDistrict || undefined,
      selectedCategory || undefined,
      search || undefined
    );
  }, [selectedDistrict, selectedCategory, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Work in Progress Watermark - Top Layer */}
      <div className={WATERMARK_CONFIG.position}>
        <div className="bg-amber-400 dark:bg-amber-600 text-amber-900 dark:text-amber-50 px-4 py-2 rounded-lg shadow-lg border-2 border-amber-500 dark:border-amber-400 rotate-12 font-bold text-sm flex items-center gap-2">
          <span className="text-lg">{WATERMARK_CONFIG.icon}</span>
          <div>
            <div>{WATERMARK_CONFIG.text.main}</div>
            <div className="text-xs">{WATERMARK_CONFIG.text.sub}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="pt-24 pb-8 bg-gradient-sky">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            สถานที่ท่องเที่ยว
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore Places — {places.length} destinations to discover
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
                {DISTRICTS.map((district) => (
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
                    <span className="text-xs opacity-70 ml-1">
                      ({district.labelEn})
                    </span>
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
                {CATEGORIES.map((category) => (
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
                    <span className="text-xs opacity-70 ml-1">
                      ({category.labelEn})
                    </span>
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
          <p className="text-muted-foreground mb-6">
            พบ {filteredPlaces.length} สถานที่ (Found {filteredPlaces.length}{" "}
            places)
          </p>

          {filteredPlaces.length > 0 ? (
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
