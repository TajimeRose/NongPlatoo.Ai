import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  title: string;
  titleTh: string;
  description: string;
  image: string;
  category: string;
  className?: string;
}

const CategoryCard = ({
  title,
  titleTh,
  description,
  image,
  category,
  className,
}: CategoryCardProps) => {
  return (
    <Link
      to={`/places?category=${category}`}
      className={cn("group block card-hover", className)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-card">
        {/* Image */}
        <div className="aspect-square overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-display text-xl font-semibold text-primary-foreground mb-1">
            {titleTh}
          </h3>
          <p className="text-primary-foreground/80 text-sm mb-2">{title}</p>
          <p className="text-primary-foreground/60 text-xs line-clamp-2">
            {description}
          </p>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Link>
  );
};

export default CategoryCard;
