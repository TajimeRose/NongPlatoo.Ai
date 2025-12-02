import { Link } from "react-router-dom";
import { MapPin, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  id: string;
  name: string;
  nameTh: string;
  location: string;
  image: string;
  rating: number;
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
  return (
    <Link
      to={`/places/${id}`}
      className={cn("group block card-hover", className)}
    >
      <div className="bg-card rounded-2xl overflow-hidden shadow-card">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={nameTh}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-golden text-golden" />
              <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
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
