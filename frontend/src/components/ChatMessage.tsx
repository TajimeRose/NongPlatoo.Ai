import { cn } from "@/lib/utils";
import { Bot, User, MapPin, Clock, Phone, ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";
import chatLogo from "@/assets/logochatน้องปลาทู.png";
import fallbackImage from "@/assets/hero-floating-market.jpg";
import { Button } from "@/components/ui/button";

type StructuredPlace = {
  id?: string | number;
  place_name?: string;
  name?: string;
  description?: string;
  short_description?: string;
  address?: string;
  location?: string | { district?: string; province?: string };
  category?: string;
  type?: string | string[];
  images?: string[] | string | unknown;
  opening_hours?: string;
  contact?: string;
  google_maps_link?: string;
};

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  structuredData?: StructuredPlace[];
  meta?: {
    source?: string;
    intent?: string;
  };
  messageId?: string;
  chatLogId?: number;  // Backend Chat Log ID for feedback
  userMessage?: string;
}

import { getApiBase } from "@/lib/api";

const API_BASE = getApiBase();

const formatLocation = (location?: StructuredPlace["location"]): string => {
  if (!location) return "";
  if (typeof location === "string") return location;
  const district = location.district || "";
  const province = location.province || "";
  return [district, province].filter(Boolean).join(", ");
};

const normalizeType = (type?: string | string[]): string | undefined => {
  if (!type) return undefined;
  return Array.isArray(type) ? type.join(", ") : type;
};

const StructuredPlaceCard = ({ place, fallback }: { place: StructuredPlace; fallback: string }) => {
  const [imageErrored, setImageErrored] = useState(false);

  const name = place.place_name || place.name || "สถานที่";
  const desc = place.short_description || place.description || "ข้อมูลสถานที่เพิ่มเติม";
  const typeLabel = place.category || normalizeType(place.type);
  const locationText = formatLocation(place.location) || place.address;

  // Robust image extraction handling string or array
  const extractImages = (imgs: unknown): string[] => {
    if (!imgs) return [];
    if (Array.isArray(imgs)) return imgs.filter((u) => u && String(u).trim()).map((u) => String(u).trim());
    if (typeof imgs === 'string') {
      const trimmed = imgs.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter((u) => u && String(u).trim()).map((u) => String(u).trim());
        } catch (e) {
          console.warn('Failed to parse images JSON:', e);
        }
      }
      // Single URL string
      return trimmed ? [trimmed] : [];
    }
    return [];
  };

  const imageUrls = extractImages(place.images);
  const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;

  // Use proxy for Google Maps images to avoid CORS issues
  const getProxiedImageUrl = (url: string): string => {
    if (!url) return fallback;
    if (url.startsWith('https://lh3.googleusercontent.com')) {
      return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const imageSrc = !primaryImage || imageErrored ? fallback : getProxiedImageUrl(primaryImage);

  const handleImageError = () => {
    console.warn(`Failed to load image: ${primaryImage}, using fallback`);
    setImageErrored(true);
  };

  const mapsLink = place.google_maps_link;

  const ImageComponent = (
    <img
      src={imageSrc}
      alt={name}
      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 transition-transform hover:scale-105"
      loading="lazy"
      onError={handleImageError}
    />
  );

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 hover:bg-muted/60 transition-colors">
      <div className="flex items-start gap-3">
        {mapsLink ? (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block flex-shrink-0 cursor-pointer"
            title="ดูแผนที่ใน Google Maps"
          >
            {ImageComponent}
          </a>
        ) : (
          <div className="flex-shrink-0">
            {ImageComponent}
          </div>
        )}
        <div className="space-y-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <p className="font-semibold text-foreground leading-tight truncate">{name}</p>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex-shrink-0"
              >
                แผนที่
              </a>
            )}
          </div>
          {typeLabel && <p className="text-xs text-muted-foreground">{typeLabel}</p>}
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{desc}</p>
          {locationText && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationText}</span>
            </div>
          )}
          {place.opening_hours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{place.opening_hours}</span>
            </div>
          )}
          {place.contact && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{place.contact}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main place detail card - larger, more prominent
const MainPlaceCard = ({ place, fallback }: { place: StructuredPlace; fallback: string }) => {
  const [imageErrored, setImageErrored] = useState(false);

  const name = place.place_name || place.name || "สถานที่";
  const desc = place.short_description || place.description || "ข้อมูลสถานที่เพิ่มเติม";
  const typeLabel = place.category || normalizeType(place.type);
  const locationText = formatLocation(place.location) || place.address;

  // Robust image extraction
  const extractImages = (imgs: unknown): string[] => {
    if (!imgs) return [];
    if (Array.isArray(imgs)) return imgs.filter((u) => u && String(u).trim()).map((u) => String(u).trim());
    if (typeof imgs === 'string') {
      const trimmed = imgs.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter((u) => u && String(u).trim()).map((u) => String(u).trim());
        } catch (e) {
          console.warn('Failed to parse images JSON:', e);
        }
      }
      return trimmed ? [trimmed] : [];
    }
    return [];
  };

  const imageUrls = extractImages(place.images);
  const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;

  const getProxiedImageUrl = (url: string): string => {
    if (!url) return fallback;
    if (url.startsWith('https://lh3.googleusercontent.com')) {
      return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Always use fallback if no image or error, never leave img empty
  const imageSrc = !primaryImage || imageErrored ? fallback : getProxiedImageUrl(primaryImage);

  const handleImageError = () => {
    console.warn(`Failed to load image: ${primaryImage}, using fallback`);
    setImageErrored(true);
  };

  const mapsLink = (place as any).google_maps_link;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      {/* Image Section */}
      <div className="relative aspect-video overflow-hidden bg-muted group">
        {mapsLink ? (
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full cursor-pointer relative"
          >
            <img
              src={imageSrc}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                ดูแผนที่
              </div>
            </div>
          </a>
        ) : (
          <img
            src={imageSrc}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleImageError}
          />
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            {typeLabel && <p className="text-sm font-medium text-primary">{typeLabel}</p>}
            <h3 className="text-xl font-bold text-foreground">{name}</h3>
          </div>
          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded-md text-foreground transition-colors"
            >
              Google Maps
            </a>
          )}
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{desc}</p>

        <div className="space-y-2 pt-2">
          {locationText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{locationText}</span>
            </div>
          )}
          {place.opening_hours && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{place.opening_hours}</span>
            </div>
          )}
          {place.contact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>{place.contact}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StructuredPlaces = ({ places }: { places: StructuredPlace[] }) => {
  if (!places.length) return null;

  const mainPlace = places[0];
  const recommendedPlaces = places.slice(1);

  return (
    <div className="mt-4 space-y-4">
      {/* Main Place Detail */}
      <MainPlaceCard place={mainPlace} fallback={fallbackImage} />

      {/* Recommended Places */}
      {recommendedPlaces.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">อื่นๆ ที่แนะนำ</p>
          <div className="space-y-2">
            {recommendedPlaces.map((place, index) => (
              <StructuredPlaceCard
                key={place.id || `${place.place_name || place.name || "place"}-${index}`}
                place={place}
                fallback={fallbackImage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatMessage = ({
  message,
  isUser,
  timestamp,
  structuredData = [],
  meta,
  messageId,
  chatLogId,
  userMessage,
}: ChatMessageProps) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type: 'like' | 'dislike') => {
    // Prefer chatLogId over messageId for new feedback system
    const logId = chatLogId || messageId;
    if (!logId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_log_id: logId,  // Use chat_log_id for new API
          type: type,
          comment: '',
        }),
      });

      if (response.ok) {
        setFeedback(type);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <img src={chatLogo} alt="NongPlatoo" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card shadow-soft border border-border rounded-bl-sm"
        )}
      >
        <p
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            isUser ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {message}
        </p>
        {structuredData.length > 0 && <StructuredPlaces places={structuredData} />}

        {/* Feedback Buttons for AI Messages */}
        {!isUser && (chatLogId || messageId) && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                feedback === 'like' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
              onClick={() => handleFeedback('like')}
              disabled={isSubmitting || feedback !== null}
            >
              <ThumbsUp className="w-3.5 h-3.5 mr-1" />
              Helpful
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                feedback === 'dislike' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
              onClick={() => handleFeedback('dislike')}
              disabled={isSubmitting || feedback !== null}
            >
              <ThumbsDown className="w-3.5 h-3.5 mr-1" />
              Not helpful
            </Button>
          </div>
        )}

        {(timestamp || meta?.source) && (
          <p
            className={cn(
              "text-xs mt-1.5 flex items-center gap-2",
              isUser ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {timestamp}
            {meta?.source && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] border border-border">
                {meta.source}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
