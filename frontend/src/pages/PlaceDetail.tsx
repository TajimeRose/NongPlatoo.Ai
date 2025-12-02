import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { getPlaceById } from "@/data/places";

const PlaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const place = getPlaceById(id || "");

  if (!place) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            ไม่พบสถานที่
          </h1>
          <p className="text-muted-foreground mb-8">Place not found</p>
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
      <div className="relative h-[50vh] min-h-[400px]">
        <img
          src={place.image}
          alt={place.nameTh}
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
        <div className="absolute top-20 right-4">
          <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft">
            <Star className="w-4 h-4 fill-golden text-golden" />
            <span className="font-medium text-foreground">
              {place.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
        <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {place.nameTh}
                </h1>
                <p className="text-muted-foreground text-lg">{place.name}</p>
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
            <div className="flex flex-wrap gap-2">
              {place.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-border text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
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
                {place.addressTh}
              </p>
              <p className="text-muted-foreground text-sm">{place.address}</p>
            </div>

            {/* Opening Hours */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                เวลาเปิด-ปิด (Hours)
              </h3>
              <p className="text-muted-foreground">
                {place.openTime} - {place.closeTime}
              </p>
            </div>
          </div>

          {/* Google Maps Button */}
          <a
            href={place.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full md:w-auto mb-6">
              <MapPin className="w-4 h-4" />
              Open in Google Maps
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>

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
              <p className="mb-3">{place.descriptionTh}</p>
              <p>{place.description}</p>
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
            <Link to={`/chat?place=${place.id}`}>
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
