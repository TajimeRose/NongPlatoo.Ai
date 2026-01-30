import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudDrizzle, 
  CloudFog, 
  Sun, 
  CloudSun,
  Wind,
  Droplets,
  ThermometerSun,
  Calendar,
  Eye,
  Clock
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  updated: string;
  hourlyTemps: number[];
}

interface NewsItem {
  id: number;
  title: string;
  title_th: string;
  summary: string;
  summary_th: string;
  content?: string;
  content_th?: string;
  category: string;
  image_url: string;
  author: string;
  views: number;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

const News = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
    fetchNews();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // Refresh every 30 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news?published=true&limit=50');
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('News API returned non-JSON response, skipping news load');
        setNewsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setNewsItems(data.data);
      }
      setNewsLoading(false);
    } catch (error) {
      console.error("Error fetching news:", error);
      setNewsLoading(false);
      // Don't throw - silently fail for news as it's not critical
    }
  };

  const fetchWeather = async () => {
    try {
      // Samut Songkhram coordinates
      const lat = 13.0236;
      const lon = 100.2968;
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&timezone=Asia/Bangkok&forecast_days=1`
      );
      
      const data = await response.json();
      
      // Get next 24 hours of temperature data
      const currentHour = new Date().getHours();
      const hourlyTemps = data.hourly.temperature_2m.slice(currentHour, currentHour + 24);
      
      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        condition: getWeatherCondition(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        location: "สมุทรสงคราม",
        updated: new Date().toLocaleString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        hourlyTemps: hourlyTemps
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching weather:", error);
      setLoading(false);
    }
  };

  const getWeatherCondition = (code: number): string => {
    const conditions: { [key: number]: string } = {
      0: "ท้องฟ้าแจ่มใส",
      1: "ท้องฟ้าแจ่มใส",
      2: "มีเมฆบางส่วน",
      3: "มีเมฆมาก",
      45: "มีหมอก",
      48: "มีหมอกจัด",
      51: "ฝนปรอย ๆ เบา",
      53: "ฝนปรอย ๆ ปานกลาง",
      55: "ฝนปรอย ๆ หนัก",
      61: "ฝนเบา",
      63: "ฝนปานกลาง",
      65: "ฝนหนัก",
      71: "หิมะตกเบา",
      73: "หิมะตกปานกลาง",
      75: "หิมะตกหนัก",
      77: "เกล็ดหิมะ",
      80: "ฝนตกเป็นครั้งคราว เบา",
      81: "ฝนตกเป็นครั้งคราว ปานกลาง",
      82: "ฝนตกเป็นครั้งคราว หนัก",
      85: "หิมะตกเป็นครั้งคราว เบา",
      86: "หิมะตกเป็นครั้งคราว หนัก",
      95: "พายุฝนฟ้าคะนอง",
      96: "พายุฝนฟ้าคะนองพร้อมลูกเห็บเบา",
      99: "พายุฝนฟ้าคะนองพร้อมลูกเห็บหนัก"
    };
    return conditions[code] || "ไม่ทราบสภาพอากาศ";
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.includes("แจ่มใส")) return <Sun className="h-8 w-8 text-yellow-500" />;
    if (condition.includes("เมฆบางส่วน")) return <CloudSun className="h-8 w-8 text-gray-600" />;
    if (condition.includes("เมฮมาก")) return <Cloud className="h-8 w-8 text-gray-500" />;
    if (condition.includes("ฝนหนัก") || condition.includes("พายุ")) return <CloudRain className="h-8 w-8 text-blue-600" />;
    if (condition.includes("ฝน") || condition.includes("ปรอย")) return <CloudDrizzle className="h-8 w-8 text-blue-500" />;
    if (condition.includes("หิมะ")) return <CloudSnow className="h-8 w-8 text-blue-300" />;
    if (condition.includes("หมอก")) return <CloudFog className="h-8 w-8 text-gray-400" />;
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };



  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "กิจกรรม": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "ข่าวท้องถิ่น": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "ร้านอาหาร": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "การท่องเที่ยว": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  // Calculate temperature range for the gradient bar
  const minTemp = weather?.hourlyTemps ? Math.min(...weather.hourlyTemps) : 0;
  const maxTemp = weather?.hourlyTemps ? Math.max(...weather.hourlyTemps) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            ข่าวสารและสภาพอากาศ
          </h1>
          <p className="text-muted-foreground">
            ข่าวสารท้องถิ่นและสภาพอากาศแบบเรียลไทม์ สมุทรสงคราม
          </p>
        </div>

        {/* Weather Widget */}
        <Card className="mb-4 p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-800">
          <div className="mb-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {weather?.location || "สมุทรสงคราม"}
              </h2>
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                อัปเดต: {weather?.updated || "-"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                {/* Temperature */}
                <Card className="rounded-lg border border-border/60 p-1.5 bg-muted/30 backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center">
                    <div className="[&>svg]:h-5 [&>svg]:w-5">
                      {getWeatherIcon(weather?.condition || "")}
                    </div>
                    <div className="text-xl font-bold">{weather?.temperature}°C</div>
                    <div className="text-[10px] text-muted-foreground text-center line-clamp-1">{weather?.condition}</div>
                  </div>
                </Card>

                {/* High/Low */}
                <Card className="rounded-lg border border-border/60 p-1.5 bg-muted/30 backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center">
                    <ThermometerSun className="h-5 w-5 text-red-500" />
                    <div className="text-lg font-bold">{Math.round(maxTemp)}°</div>
                    <div className="text-[10px] text-muted-foreground">สูงสุด</div>
                    <div className="text-base font-semibold">{Math.round(minTemp)}°</div>
                    <div className="text-[10px] text-muted-foreground">ต่ำสุด</div>
                  </div>
                </Card>

                {/* Humidity */}
                <Card className="rounded-lg border border-border/60 p-1.5 bg-muted/30 backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    <div className="text-xl font-bold">{weather?.humidity}%</div>
                    <div className="text-[10px] text-muted-foreground">ความชื้น</div>
                  </div>
                </Card>

                {/* Wind Speed */}
                <Card className="rounded-lg border border-border/60 p-1.5 bg-muted/30 backdrop-blur-sm">
                  <div className="flex flex-col items-center justify-center">
                    <Wind className="h-5 w-5 text-gray-500" />
                    <div className="text-xl font-bold">{weather?.windSpeed}</div>
                    <div className="text-[10px] text-muted-foreground">km/h</div>
                    <div className="text-[10px] text-muted-foreground">ความเร็วลม</div>
                  </div>
                </Card>

                {/* Temperature Range Bar */}
                <Card className="rounded-lg border border-border/60 p-1.5 bg-muted/30 backdrop-blur-sm col-span-2 sm:col-span-1">
                  <div className="flex flex-col justify-center h-full">
                    <div className="text-[10px] font-medium mb-0.5 text-center">อุณหภูมิ 24 ชม.</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(minTemp)}°</span>
                        <span>{Math.round(maxTemp)}°</span>
                      </div>
                      <div className="relative h-3 bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                      <div className="text-[10px] text-center text-muted-foreground">
                        ช่วง {Math.round(maxTemp - minTemp)}°C
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          )}
        </Card>

        {/* News Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">ข่าวสารล่าสุด</h2>
          {newsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : newsItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">ไม่มีข่าวสารในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {newsItems.map((news) => (
                <Card key={news.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={news.image_url || 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop'} 
                      alt={news.title_th}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {news.category && (
                      <Badge className={`absolute top-3 left-3 ${getCategoryColor(news.category)}`}>
                        {news.category}
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {news.title_th || news.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {news.summary_th || news.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(news.published_at || news.created_at).toLocaleDateString('th-TH', { 
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {news.views.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm" className="w-full">
                        อ่านเพิ่มเติม
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default News;
