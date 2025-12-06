import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, ArrowRight, BarChart3, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import CategoryCard from "@/components/CategoryCard";
import heroImage from "@/assets/ปกเว็บ.jpg";
import marketImage from "@/assets/category-market.jpg";
import templeImage from "@/assets/category-temple.jpg";
import homestayImage from "@/assets/category-homestay.jpg";
import AgencyLogos from "@/components/AgencyLogos";

type VisitStats = {
  total: number;
  pages: Record<string, number>;
};

const API_BASE = import.meta.env.VITE_API_BASE || "";

const Index = () => {
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  const categories = [
    {
      title: "Floating Markets",
      titleTh: "ตลาดน้ำ",
      description: "Experience the charm of traditional floating markets with fresh seafood and local delicacies",
      image: marketImage,
      category: "market",
    },
    {
      title: "Temples & Culture",
      titleTh: "วัดและวัฒนธรรม",
      description: "Discover ancient temples nestled in nature and rich cultural heritage",
      image: templeImage,
      category: "temple",
    },
    {
      title: "Homestays & Gardens",
      titleTh: "โฮมสเตย์และสวน",
      description: "Relax in riverside homestays surrounded by lush coconut gardens",
      image: homestayImage,
      category: "homestay",
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const fetchVisits = async () => {
      setIsLoadingVisits(true);
      try {
        const res = await fetch(`${API_BASE}/api/visits`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to load visit counts");
        }
        const data = await res.json();
        setVisitStats({
          total: data?.total ?? 0,
          pages: data?.pages ?? {},
        });
      } catch (err) {
        console.error("Unable to fetch visit counts", err);
      } finally {
        setIsLoadingVisits(false);
      }
    };

    fetchVisits();
    return () => controller.abort();
  }, []);

  const sortedPages = useMemo(() => {
    if (!visitStats) return [];

    const labelMap: Record<string, string> = {
      "/": "หน้าแรก",
      "/places": "สถานที่ทั้งหมด",
      "/places/:id": "รายละเอียดสถานที่",
      "/chat": "Chat กับน้องปลาทู",
      "/auth": "เข้าสู่ระบบ / สมัครสมาชิก",
    };

    const preferredOrder = ["/", "/places", "/places/:id", "/chat", "/auth"];
    const existing = Object.entries(visitStats.pages);

    const ordered = preferredOrder
      .filter((path) => visitStats.pages[path] !== undefined)
      .map((path) => [path, visitStats.pages[path]] as [string, number]);

    const extras = existing.filter(([path]) => !preferredOrder.includes(path));
    return [...ordered, ...extras].map(([path, count]) => ({
      path,
      label: labelMap[path] || path,
      count,
    }));
  }, [visitStats]);

  const formatNumber = (value: number) => new Intl.NumberFormat("th-TH").format(value);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Amphawa Floating Market"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/50 to-primary/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="font-display text-4xl md:text-6xl lg:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
              <span className="block mb-3">น้องปลาทู</span>
              <span className="block text-golden">ผู้ช่วยประชาสัมพันธ์ท่องเที่ยว</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4 font-display">
              การท่องเที่ยวอัจฉริยะ 
            </p>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Nong Pla Too” Intelligent Travel Publicity with AI
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/places">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <MapPin className="w-5 h-5" />
                  ค้นหาสถานที่
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  <MessageCircle className="w-5 h-5" />
                  Chat with NongPlatoo
                </Button>
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
            <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/50 flex justify-center pt-2">
              <div className="w-1.5 h-3 bg-primary-foreground/70 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Agency Logos Section */}
      <AgencyLogos />

      {/* Categories Section */}
      <section className="py-20 bg-gradient-sky">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              สถานที่แนะนำ
            </h2>
            <p className="text-lg text-muted-foreground">
              Featured Categories — Discover what awaits you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categories.map((category, index) => (
              <CategoryCard
                key={category.category}
                {...category}
                className={`animate-slide-up animation-delay-${(index + 1) * 100}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Teaser */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-river rounded-3xl p-8 md:p-12 shadow-elevated">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-foreground/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                พบกับ NongPlatoo.Ai
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                ให้น้องปลาทูช่วยวางแผนเที่ยว ค้นหาที่กิน-ที่เที่ยวลับแบบรู้ใจ จัดทริปวันหยุดของคุณให้ง่ายและสนุกกว่าเดิม
              </p>
              <Link to="/chat">
                <Button
                  variant="heroOutline"
                  size="lg"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Start Chatting
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visitor Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
              ยอดการเข้าชม
            </p>
            <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              ติดตามการเข้าชมเว็บไซต์
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ดูสถิติยอดเข้าชมรวมทุกหน้า และแยกตามหน้าเพื่อวัดความสนใจของผู้ใช้งาน
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="md:col-span-1 bg-card border border-border rounded-3xl p-6 shadow-soft flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Globe2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">ยอดเข้าชมรวม</p>
              <p className="text-4xl font-display font-bold text-foreground">
                {formatNumber(visitStats?.total || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                รวมทุกหน้าบนเว็บไซต์ตั้งแต่เปิดใช้งานตัวนับ
              </p>
            </div>

            <div className="md:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ยอดเข้าชมแยกตามหน้า</p>
                    <p className="font-display font-semibold text-lg text-foreground">Page-level views</p>
                  </div>
                </div>
                {isLoadingVisits && (
                  <span className="text-xs text-muted-foreground">กำลังโหลด...</span>
                )}
              </div>

              {sortedPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลการเข้าชม
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedPages.map(({ path, label, count }) => (
                    <div
                      key={path}
                      className="border border-border rounded-2xl px-4 py-3 flex items-center justify-between bg-background"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground">{path}</span>
                      </div>
                      <span className="text-lg font-display font-semibold text-primary">
                        {formatNumber(count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-muted border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 สาขาเทคโนโลยีธุรกิจดิจิทัล วิทยาลัยเทคสมุทรสงคราม.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
