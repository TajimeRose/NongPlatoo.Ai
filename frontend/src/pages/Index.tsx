import { Link } from "react-router-dom";
import { MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import CategoryCard from "@/components/CategoryCard";
import heroImage from "@/assets/ปกเว็บ.jpg";
import templeImage from "@/assets/category-temple.jpg";
import homestayImage from "@/assets/category-homestay.jpg";
import AgencyLogos from "@/components/AgencyLogos";

const Index = () => {
  const categories = [
    {
      title: "Floating Markets",
      titleTh: "ตลาดน้ำ",
      description: "เที่ยวตลาดน้ำอัมพวา ชิมอาหารทะเลสดและวิถีพายเรือเมืองแม่กลอง",
      image: "https://paimayang.com/wp-content/uploads/2020/02/82_20190826014648_1-840x560.jpg",
      category: "market",
    },
    {
      title: "Temples & Culture",
      titleTh: "วัดและวัฒนธรรม",
      description: "ไหว้พระริมน้ำ ชมวัดดังและวัฒนธรรมโบราณของสมุทรสงคราม",
      image: "https://t1.blockdit.com/photos/2023/03/64053c674d188033c3a4bb5a_800x0xcover_Xv4jzo41.jpg",
      category: "temple",
    },
    {
      title: "Homestays & Gardens",
      titleTh: "โฮมสเตย์และสวน",
      description: "พักโฮมสเตย์สวนมะพร้าว ริมคลองสงบใกล้กรุงเทพฯ",
      image: "https://www.saitiew.com/upload/2024/11/3zkr3nr94bba.jpg",
      category: "homestay",
    },
  ];

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
              <span className="block text-golden">ผู้ช่วยประชาสัมพันธ์</span>
              <span className="block text-golden">การท่องเที่ยวอัจฉริยะ</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4 font-display">

            </p>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              “Nong Pla Too" Intelligent Travel Publicity with AI
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

      {/* Footer */}
      <footer className="py-8 bg-muted border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 สาขาวิชาเทคโนโลยีธุรกิจดิจิทัล  วิทยาลัยเทคนิคสมุทรสงคราม.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
