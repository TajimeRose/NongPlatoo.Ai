import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Flame, Star } from "lucide-react";


const NewsBanner = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="group cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg max-w-[200px] animate-fade-in ring-1 ring-white/10 hover:ring-primary/50">
                    <div className="bg-red-500/20 p-2 rounded-lg group-hover:bg-red-500/30 transition-colors">
                        <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold">
                            Breaking News
                        </span>
                        <span className="text-sm font-medium text-white line-clamp-1">
                            พิธาเยือนแม่กลอง!
                        </span>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] bg-background border-border">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                            HOT
                        </span>
                        <span className="text-muted-foreground text-sm">อัปเดตล่าสุด</span>
                    </div>
                    <DialogTitle className="text-2xl font-display leading-tight">
                        ภารกิจ "พิธา" บุกแม่กลอง (28 ม.ค. 2569)
                    </DialogTitle>
                    <DialogDescription>
                        คุณพิธา ลิ้มเจริญรัตน์ ในฐานะผู้ช่วยหาเสียงพรรคประชาชน ลงพื้นที่จังหวัดสมุทรสงคราม เมื่อวันที่ 28 มกราคม 2569 ที่ผ่านมาครับ บรรยากาศถือว่าคึกคักมากจนตลาดแทบแตกตามภาพที่คุณส่งมาเลย
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 shadow-md bg-muted">
                        {/* Use the imported image */}
                        <img
                            src="https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1VaE5R.img?w=768&h=432&m=6&x=290&y=196&s=313&d=232"
                            alt="Pita at Maeklong"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    <div className="space-y-3 text-muted-foreground">
                        <p>
                            <strong className="text-foreground">สมุทรสงคราม —</strong> วันนี้ นายพิธา ลิ้มเจริญรัตน์ เดินทางเยือนจังหวัดสมุทรสงคราม เพื่อเยี่ยมชมวิถีชีวิตชาวริมน้ำและส่งเสริมการท่องเที่ยวเมืองรอง
                        </p>
                        <p>
                            1. ยุทธศาสตร์ "5 ส." เพื่อคนสมุทรสงคราม
                            บนเวทีปราศรัย คุณพิธาได้ชูนโยบายหลัก 5 ด้านที่ต้องการให้ สส. อานุภาพ เข้าไปผลักดันต่อในสมัยที่ 2 ได้แก่:

                            เซฟตี้ (Safety): เน้นแก้ปัญหา "ถนนพระราม 2" ที่ก่อสร้างยาวนาน โดยย้ำว่าต้องจบในรุ่นนี้ และต้องมีมาตรการป้องกันอุบัติเหตุรวมถึงการเยียวยาที่เป็นรูปธรรม

                            เศรษฐกิจ: ผลักดันการท่องเที่ยวเมืองรอง และส่งเสริมเศรษฐกิจท้องถิ่นอย่างยั่งยืน

                            สุขภาพ: สัญญาว่าจะผลักดันการเพิ่มโรงพยาบาลและยกระดับการดูแลสุขภาพในพื้นที่

                            สวัสดิการ: แก้ไขระบบประกันสังคม โดยเฉพาะปัญหาเว็บล่มและสิทธิประโยชน์ของอาชีพอิสระ

                            สิ่งแวดล้อม: จัดการปัญหาฝุ่นและมลพิษจากโรงงาน เพื่อรักษาเสน่ห์เมืองที่น่าอยู่ของสมุทรสงคราม

                            2. บรรยากาศที่ตลาดร่มหุบ-อัมพวา
                            ตลาดแตก: ทันทีที่คุณพิธาปรากฏตัว พ่อค้าแม่ค้าและนักท่องเที่ยวต่างรุมล้อมขอถ่ายรูปและมอบของฝากท้องถิ่น เช่น ส้มโอ และขนมไข่

                            สัญลักษณ์ทางการเมือง: คุณพิธาอ้อนขอคะแนนให้เลือกพรรคประชาชนทั้ง 2 ใบ (บัตรเลือกคนและบัตรเลือกพรรค) พร้อมเชิญชวนไปลงประชามติทำรัฐธรรมนูญฉบับใหม่

                            3. ร้านลับที่ "พิธา" แนะนำ
                            ในภาพที่คุณส่งมามีการพูดถึง "ร้านกาแฟโบราณ" ซึ่งในการลงพื้นที่ครั้งนี้ คุณพิธามักจะแวะเวียนไปสัมผัสวิถีชีวิตดั้งเดิม และร้านที่ถูกพูดถึงบ่อยในย่านแม่กลองคือร้านกาแฟสไตล์ท้องถิ่นริมทาง หรือร้านที่ตั้งอยู่ใกล้สถานีรถไฟแม่กลอง ซึ่งคุณพิธามักจะใช้เป็นจุดนั่งพักและพูดคุยกับชาวบ้านแบบเป็นกันเอง
                        </p>
                        <div className="flex items-center gap-2 mt-4 text-sm text-primary bg-primary/10 p-2 rounded-lg">
                            <Star className="w-4 h-4 fill-primary" />
                            <span>อย่าลืมแวะ "ร้านกาแฟโบราณ" ที่คุณพิธาแนะนำ!</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NewsBanner;
