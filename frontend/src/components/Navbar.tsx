import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, MapPin, MessageCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/", label: "หน้าแรก", labelEn: "Home", icon: Home },
    { to: "/places", label: "สถานที่", labelEn: "Places", icon: MapPin },
    { to: "/chat", label: "AI Guide", labelEn: "Chat", icon: MessageCircle },
  ];

  const isHomePage = location.pathname === "/";

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled || !isHomePage
          ? "bg-card/95 backdrop-blur-md shadow-soft"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg transition-colors",
              isScrolled || !isHomePage
                ? "bg-gradient-river text-primary-foreground"
                : "bg-primary-foreground/20 text-primary-foreground backdrop-blur-sm"
            )}>
              ส
            </div>
            <span className={cn(
              "font-display font-semibold text-lg hidden sm:block transition-colors",
              isScrolled || !isHomePage ? "text-foreground" : "text-primary-foreground"
            )}>
              สมุทรสงคราม
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2 transition-colors",
                    location.pathname === link.to
                      ? isScrolled || !isHomePage
                        ? "bg-primary/10 text-primary"
                        : "bg-primary-foreground/20 text-primary-foreground"
                      : isScrolled || !isHomePage
                        ? "text-foreground hover:text-primary hover:bg-primary/5"
                        : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  <span className="font-thai">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              isScrolled || !isHomePage ? "text-foreground" : "text-primary-foreground"
            )}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card/95 backdrop-blur-md border-t border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3",
                    location.pathname === link.to
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-thai">{link.label}</span>
                  <span className="text-muted-foreground text-sm">({link.labelEn})</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
