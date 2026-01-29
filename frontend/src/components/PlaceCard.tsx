import { Link } from "react-router-dom";
import { MapPin, Star, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getPlaceViews, incrementPlaceViews, formatViewCount } from "@/utils/viewCounter";
import { getApiBase } from "@/lib/api";
import fallbackImage from "@/assets/hero-floating-market.jpg";

interface PlaceCardProps {
  id: string;
  name: string;
  nameTh: string;
  location: string;
  image: string;
  rating: number | null | undefined;
  tags: string[];
  isOpen?: boolean;
  className?: string;
}

const PlaceCard = ({
  id,
  name,
  nameTh,
  location,
  image,
  rating,
  tags,
  isOpen = true,
  className,
}: PlaceCardProps) => {
  const [viewCount, setViewCount] = useState(0);
  const [imageErrored, setImageErrored] = useState(false);
  const API_BASE = getApiBase();

  useEffect(() => {
    // Load initial view count
    setViewCount(getPlaceViews(id));
  }, [id]);

  const handleClick = () => {
    // Increment view count when card is clicked
    const newCount = incrementPlaceViews(id);
    setViewCount(newCount);
  };

  const getProxiedImageUrl = (url: string): string => {
    if (!url) return fallbackImage;
    const allowedPrefixes = [
      "https://lh3.googleusercontent.com",
      "https://lh5.googleusercontent.com",
      "https://maps.googleapis.com",
      "https://streetviewpixels-pa.googleapis.com",
    ];
    if (allowedPrefixes.some((prefix) => url.startsWith(prefix))) {
      return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const normalizeImageUrl = (rawUrl: string | null | undefined): string => {
    if (!rawUrl) return fallbackImage;
    let url = String(rawUrl).trim();
    if (!url) return fallbackImage;

    if (url.startsWith("data:")) return url;
    if (url.startsWith("//")) url = `https:${url}`;

    // Normalize Windows paths to URL-style
    if (/^[a-zA-Z]:\\/.test(url) || url.includes("\\")) {
      url = url.replace(/\\/g, "/");
    }

    const lower = url.toLowerCase();
    const backendStaticIndex = lower.lastIndexOf("/backend/static/");
    if (backendStaticIndex !== -1) {
      url = url.slice(backendStaticIndex + "/backend/static/".length);
    }

    const staticIndex = lower.lastIndexOf("/static/");
    if (staticIndex !== -1) {
      url = url.slice(staticIndex + "/static/".length);
    }

    const publicIndex = lower.lastIndexOf("/public/");
    if (publicIndex !== -1) {
      url = url.slice(publicIndex + "/public/".length);
    }

    if (/^https?:\/\//i.test(url)) return getProxiedImageUrl(url);
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  const imageSrc = imageErrored ? fallbackImage : normalizeImageUrl(image);

  return (
    <Link
      to={`/places/${id}`}
      onClick={handleClick}
      className={cn("group block card-hover", className)}
    >
      <div className="bg-card rounded-2xl overflow-hidden shadow-card">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageSrc}
            alt={nameTh || name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageErrored(true)}
          />

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge
              variant={isOpen ? "default" : "secondary"}
              className={cn(
                "flex items-center gap-1",
                isOpen ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Clock className="w-3 h-3" />
              {isOpen ? "เปิด" : "ปิด"}
            </Badge>
          </div>

          {/* Rating */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {rating !== null && rating !== undefined && (
              <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-golden text-golden" />
                <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
              </div>
            )}
            {/* View Count */}
            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{formatViewCount(viewCount)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {nameTh}
          </h3>
          <p className="text-muted-foreground text-sm mb-2">{name}</p>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="w-4 h-4 text-secondary" />
            <span className="line-clamp-1">{location}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-border text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PlaceCard;
