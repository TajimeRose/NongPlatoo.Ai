import { Link } from "react-router-dom";
import { MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import CategoryCard from "@/components/CategoryCard";
import heroImage from "@/assets/รูปปก.jpg";
import marketImage from "@/assets/category-market.jpg";
import templeImage from "@/assets/category-temple.jpg";
import homestayImage from "@/assets/category-homestay.jpg";
import AgencyLogos from "@/components/AgencyLogos";


const Index = () => {
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
              Explore Samut Songkhram
            </p>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              with Nong Platoo, public relations assistant travel that will take everyone to see the local culture Most natural tourist attractions
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
            © 2024 Samut Songkhram Travel Guide. Made with 💙 for river lovers.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
