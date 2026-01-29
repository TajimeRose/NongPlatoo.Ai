import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Clock,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ArrowLeft,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { getApiBase } from "@/lib/api";
import fallbackImage from "@/assets/hero-floating-market.jpg";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type PlaceRecord = Record<string, unknown>;

const defaultMarkerIcon = L.icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

// Thai field name mappings
const FIELD_LABELS: Record<string, string> = {
  id: "รหัสสถานที่ (ID)",
  name: "ชื่อ (Name)",
  place_name: "ชื่อสถานที่",
  nameTh: "ชื่อไทย",
  description: "คำอธิบาย (Description)",
  descriptionTh: "คำอธิบายไทย",
  address: "ที่อยู่ (Address)",
  addressTh: "ที่อยู่ไทย",
  latitude: "ละติจูด (Latitude)",
  longitude: "ลองจิจูด (Longitude)",
  opening_hours: "เวลาเปิด-ปิด (Opening Hours)",
  openTime: "เวลาเปิด",
  closeTime: "เวลาปิด",
  price_range: "ช่วงราคา (Price Range)",
  category: "หมวดหมู่ (Category)",
  attraction_type: "ประเภทสถานที่ (Type)",
  type: "ประเภท",
  tags: "แท็ก (Tags)",
  highlights: "ไฮไลท์",
  rating: "คะแนน (Rating)",
  reviews: "รีวิว (Reviews)",
  city: "เมือง (City)",
  district: "อำเภอ (District)",
  province: "จังหวัด (Province)",
  images: "รูปภาพ (Images)",
  image: "รูปภาพ",
  image_url: "URL รูปภาพ",
  googleMapsUrl: "Google Maps URL",
  isOpen: "สถานะเปิด-ปิด (Status)",
  place_information: "ข้อมูลสถานที่",
  source: "แหล่งข้อมูล (Source)",
  description_embedding: "Vector Embedding",
};

const PlaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [place, setPlace] = useState<PlaceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = getApiBase();

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const API_BASE = getApiBase();
        const response = await fetch(`${API_BASE}/api/places/${id}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.place) {
          setPlace(data.place);
        } else {
          throw new Error("Place not found");
        }
      } catch (err) {
        console.error("Error fetching place:", err);
        setError(err instanceof Error ? err.message : "Failed to load place");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPlace();
    } else {
      setIsLoading(false);
      setError("Invalid place ID");
    }
  }, [id]);

  const normalizeImageUrl = (rawUrl: string | null | undefined): string => {
    if (!rawUrl) return fallbackImage;
    let url = String(rawUrl).trim();
    if (!url) return fallbackImage;
    if (url.startsWith("data:")) return url;
    if (url.startsWith("//")) url = `https:${url}`;

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

    const allowedPrefixes = [
      "https://lh3.googleusercontent.com",
      "https://lh5.googleusercontent.com",
      "https://maps.googleapis.com",
      "https://streetviewpixels-pa.googleapis.com",
    ];

    if (allowedPrefixes.some((prefix) => url.startsWith(prefix))) {
      return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
    }

    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  const primaryImage = useMemo(() => {
    if (!place) return fallbackImage;
    const images = place.images;
    if (Array.isArray(images) && images.length > 0) return normalizeImageUrl(String(images[0]));
    if (place.image_url) return normalizeImageUrl(String(place.image_url));
    if (place.image) return normalizeImageUrl(String(place.image));
    return fallbackImage;
  }, [place, API_BASE]);

  const latitude = useMemo(() => {
    if (!place) return null;
    const value = place.latitude ?? place.lat ?? place.location_lat;
    const num = Number(value);
    const result = Number.isFinite(num) ? num : null;
    console.log('Latitude check:', { value, num, result, place_id: place.id });
    return result;
  }, [place]);

  const longitude = useMemo(() => {
    if (!place) return null;
    const value = place.longitude ?? place.lng ?? place.location_lng;
    const num = Number(value);
    const result = Number.isFinite(num) ? num : null;
    console.log('Longitude check:', { value, num, result, place_id: place.id });
    return result;
  }, [place]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-primary mr-2" />
            <p className="text-muted-foreground">Loading place...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            ไม่พบสถานที่
          </h1>
          <p className="text-muted-foreground mb-8">{error || "Place not found"}</p>
          <Link to="/places">
            <Button>Back to Places</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Image */}
      <div className="relative h-[40vh] min-h-[320px]">
        <img
          src={primaryImage}
          alt={String(place.nameTh || place.name || "Place")}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-20 left-4 bg-card/80 backdrop-blur-sm hover:bg-card"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Rating Badge */}
        {place.rating !== null && place.rating !== undefined && (
          <div className="absolute top-20 right-4">
            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft">
              <Star className="w-4 h-4 fill-golden text-golden" />
              <span className="font-medium text-foreground">
                {Number(place.rating).toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Full Info */}
          <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {String(place.nameTh || place.name || "")}
                </h1>
                <p className="text-muted-foreground text-lg">{String(place.name || "")}</p>
              </div>
              <Badge
                variant={place.isOpen ? "default" : "secondary"}
                className={
                  place.isOpen
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }
              >
                <Clock className="w-3 h-3 mr-1" />
                {place.isOpen ? "เปิด" : "ปิด"}
              </Badge>
            </div>

            {/* Tags */}
            {Array.isArray(place.tags) && place.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {place.tags.map((tag: unknown) => (
                  <Badge
                    key={String(tag)}
                    variant="outline"
                    className="border-border text-muted-foreground"
                  >
                    {String(tag)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Address */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-secondary" />
                ที่อยู่ (Address)
              </h3>
              <p className="text-muted-foreground text-sm">
                {String(place.addressTh || "")}
              </p>
              <p className="text-muted-foreground text-sm">{String(place.address || "")}</p>
            </div>

            {/* Opening Hours */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                เวลาเปิด-ปิด (Hours)
              </h3>
              <p className="text-muted-foreground">
                {String(place.openTime || place.opening_hours || "")}
                {place.closeTime ? ` - ${place.closeTime}` : ""}
              </p>
            </div>
          </div>

          {/* Google Maps Button */}
          {place.googleMapsUrl && (
            <a
              href={String(place.googleMapsUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full md:w-auto mb-6">
                <MapPin className="w-4 h-4" />
                Open in Google Maps
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}

          {/* Description */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-foreground mb-3">
              รายละเอียด (Description)
            </h3>
            <div
              className={`text-muted-foreground leading-relaxed ${
                !isDescriptionExpanded && "line-clamp-3"
              }`}
            >
              <p className="mb-3">{String(place.descriptionTh || "")}</p>
              <p>{String(place.description || "")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 text-primary"
            >
              {isDescriptionExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Read More
                </>
              )}
            </Button>
          </div>
          
          {/* Full Data Table */}
          <div className="border-t border-border pt-6 mt-6">
            <h3 className="font-medium text-foreground mb-3">ข้อมูลทั้งหมด (Full Place Data)</h3>
            <div className="divide-y divide-border rounded-lg border border-border">
              {Object.entries(place)
                .filter(([key]) => {
                  // Exclude fields already displayed above and place_information
                  const excludeFields = [
                    'name', 'nameTh', 'place_name',
                    'description', 'descriptionTh',
                    'address', 'addressTh',
                    'openTime', 'closeTime', 'opening_hours',
                    'tags', 'rating', 'isOpen',
                    'place_information',
                    'image', 'images', 'image_url' // Already shown in hero
                  ];
                  return !excludeFields.includes(key);
                })
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 p-3 text-sm">
                    <div className="font-medium text-foreground break-words">
                      {FIELD_LABELS[key] || key}
                    </div>
                    <div className="col-span-2 text-muted-foreground break-words">
                      {Array.isArray(value)
                        ? value.map((v) => String(v)).join(", ")
                        : typeof value === "object" && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value ?? "")}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="bg-card rounded-2xl shadow-elevated p-4 md:p-6 h-fit">
          <h3 className="font-medium text-foreground mb-3">แผนที่ (Map)</h3>
          {latitude !== null && longitude !== null ? (
            <div className="h-[500px] w-full overflow-hidden rounded-xl border border-border">
              <MapContainer
                center={[latitude, longitude]}
                zoom={15}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]}>
                  <Popup>{String(place.name || "Place")}</Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            <div className="h-[500px] w-full rounded-xl border border-border flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">ไม่มีข้อมูลแผนที่ (Map not available)</p>
                <p className="text-xs">
                  Latitude: {String(place.latitude ?? 'null')}, Longitude: {String(place.longitude ?? 'null')}
                </p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* AI Assistant CTA */}
        <div className="mt-6 bg-gradient-river rounded-2xl p-6 shadow-elevated">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-primary-foreground mb-1">
                ถาม AI เกี่ยวกับสถานที่นี้
              </h3>
              <p className="text-primary-foreground/80 text-sm">
                Get tips, recommendations, and plan your visit with our AI assistant
              </p>
            </div>
            <Link to={`/chat?place=${String(place.id || "")}`}>
              <Button
                variant="heroOutline"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Ask AI Guide
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlaceDetail;
