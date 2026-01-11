import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const AuthPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get("redirect") || "/", [searchParams]);

  const { user, initializing, authLoading, authError, signIn, signUp, resetAuthError } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [localError, setLocalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });

  useEffect(() => {
    if (user && !initializing) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, initializing, navigate, redirectTo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    resetAuthError();

    if (!formData.email || !formData.password) {
      setLocalError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    if (mode === "register" && formData.password !== formData.confirmPassword) {
      setLocalError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    try {
      if (mode === "login") {
        await signIn(formData.email, formData.password);
        toast({
          title: "เข้าสู่ระบบสำเร็จ",
          description: "ยินดีต้อนรับกลับ น้องปลาทูพร้อมช่วยเหลือแล้ว",
        });
      } else {
        await signUp({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName.trim() || undefined,
        });
        toast({
          title: "สร้างบัญชีสำเร็จ",
          description: "เริ่มใช้ NongPlatoo.Ai ได้เลย",
        });
      }
      navigate(redirectTo, { replace: true });
    } catch {
      // error messages are handled by context
    }
  };

  const highlightCards = [
    {
      title: "ปลอดภัยด้วย Firebase Auth",
      description: "ยืนยันตัวตนด้วยระบบสากล รองรับ MFA และการจัดการผู้ใช้",
      icon: ShieldCheck,
    },
    {
      title: "ล็อคอินครั้งเดียว ใช้ได้ทุกหน้า",
      description: "เชื่อมต่อกับการใช้งานเว็บไซต์โดยไม่ต้องล็อคอินซ้ำ",
      icon: Lock,
    },
    {
      title: "ประสบการณ์ลื่นไหล",
      description: "ดีไซน์โทนสีเดียวกับเว็บ ตอบสนองรวดเร็วบนทุกอุปกรณ์",
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-sky relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-12 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white/10 dark:from-background" />
      </div>

      <Navbar />

      <div className="container relative mx-auto px-4 pt-28 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            <Badge className="bg-primary/15 text-primary border border-primary/20">
              ระบบใหม่
            </Badge>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Firebase Login
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                ล็อคอินกับ NongPlatoo.Ai
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                เชื่อมต่อประสบการณ์การท่องเที่ยวสมุทรสงครามอย่างปลอดภัย ด้วยระบบยืนยันตัวตนของ Firebase
                ที่ผสานโทนสีและสไตล์เดียวกับเว็บไซต์หลัก
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {highlightCards.map((item) => (
                <div
                  key={item.title}
                  className="glass p-4 rounded-2xl border border-border/80 shadow-soft flex gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              ข้อมูลของคุณถูกเข้ารหัสและจัดการตามมาตรฐานความปลอดภัย
            </div>
          </div>

          <Card className="glass shadow-elevated border border-primary/10 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    เข้าสู่ระบบหรือสร้างบัญชีใหม่
                  </p>
                  <span className="text-xl font-semibold">NongPlatoo Account</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={mode} onValueChange={(value) => setMode(value as "login" | "register")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
                  <TabsTrigger value="register">สมัครสมาชิก</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" /> อีเมล
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4" /> รหัสผ่าน
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>

                    {(localError || authError) && (
                      <div className="text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm">
                        {localError || authError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-river text-primary-foreground"
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          กำลังเข้าสู่ระบบ...
                        </>
                      ) : (
                        "เข้าสู่ระบบ"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-6">
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="flex items-center gap-2">
                        <UserRound className="w-4 h-4" /> ชื่อที่ต้องการแสดง
                      </Label>
                      <Input
                        id="displayName"
                        placeholder="ชื่อเล่นหรือชื่อจริง"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" /> อีเมล
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4" /> รหัสผ่าน
                        </Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> ยืนยันรหัสผ่าน
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {(localError || authError) && (
                      <div className="text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm">
                        {localError || authError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-river text-primary-foreground"
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          กำลังสร้างบัญชี...
                        </>
                      ) : (
                        "สมัครสมาชิก"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="text-sm text-muted-foreground text-center">
                การเข้าสู่ระบบแปลว่าคุณยอมรับ{" "}
                <Link to="/" className="text-primary hover:underline">
                  เงื่อนไขการใช้งาน
                </Link>{" "}
                และ{" "}
                <Link to="/" className="text-primary hover:underline">
                  นโยบายความเป็นส่วนตัว
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
