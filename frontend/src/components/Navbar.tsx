import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, MapPin, MessageCircle, Home, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import logoImage from "@/assets/น้องปลาทู.png";

import VoiceAIInterface from "@/components/VoiceAIInterface";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, initializing, signOutUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/", label: "หน้าแรก", labelEn: "Home", icon: Home },
    { to: "/places", label: "ค้นหาสถานที่", labelEn: "Places", icon: MapPin },
    { to: "/chat", label: "คุยกับ NongPlatoo", labelEn: "Chat", icon: MessageCircle },
  ];

  const isHomePage = location.pathname === "/";
  const redirectQuery = `?redirect=${encodeURIComponent(location.pathname)}`;

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast({
        title: "ออกจากระบบแล้ว",
        description: "กลับมาเมื่อไรก็ล็อคอินเข้ามาใหม่ได้ทันที",
      });
      if (location.pathname === "/auth") {
        navigate("/");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "ออกจากระบบไม่สำเร็จ",
        description: "กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

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
            <img
              src={logoImage}
              alt="NongPlatoo Logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span
              className={cn(
                "font-display font-semibold text-lg hidden sm:block transition-colors",
                isScrolled || !isHomePage ? "text-foreground" : "text-primary-foreground"
              )}
            >
              NongPlatoo.Ai
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



            {!initializing && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="ml-2 pl-2 pr-3 gap-3 border-primary/30 text-foreground hover:text-primary hover:border-primary/60"
                    >
                      <Avatar className="h-8 w-8 bg-primary/15 text-primary">
                        <AvatarFallback>
                          {(user.displayName || user.email || "NP")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left leading-tight hidden lg:block">
                        <p className="text-xs text-muted-foreground">สวัสดี</p>
                        <p className="font-medium">
                          {user.displayName || user.email?.split("@")[0] || "ผู้ใช้งาน"}
                        </p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => navigate(`/auth${redirectQuery}`)}
                      className="cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      จัดการบัญชี
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to={`/auth${redirectQuery}`}>
                  <Button className="ml-2 gap-2 bg-gradient-river text-primary-foreground shadow-soft hover:opacity-90">
                    <LogIn className="w-4 h-4" />
                    <span className="font-thai">เข้าสู่ระบบ</span>
                  </Button>
                </Link>
              )
            )}
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

            {!initializing && (
              <div className="pt-2 flex gap-2">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ
                  </Button>
                ) : (
                  <Link
                    to={`/auth${redirectQuery}`}
                    className="w-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button className="w-full justify-center gap-2 bg-gradient-river text-primary-foreground">
                      <LogIn className="w-4 h-4" />
                      เข้าสู่ระบบ
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Voice AI Interface */}
      <VoiceAIInterface isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </nav>
  );
};

export default Navbar;
