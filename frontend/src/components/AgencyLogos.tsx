import { Building2 } from "lucide-react";

// นำเข้ารูปภาพหน่วยงานจาก assets
import localAdminLogo from "@/assets/กรรมส่งเสริมการปกครองท้องถื่น.png";
import tourismMinistryLogo from "@/assets/กระทรวงการท่องเที่ยวและกีฬา.png";
import prSamutLogo from "@/assets/ประชาสัมพันธ์จังหวัดสมุทรสงคราม.png";
import nsoLogo from "@/assets/สำนักงานสถิติแห่งชาติ จังหวัดสมุทรสงคราม.jpg";
import paoLogo from "@/assets/องค์การบริหานส่วนจังหวัด.png";

const AgencyLogos = () => {
    // อัพเดทข้อมูลหน่วยงานตามรูปภาพที่ให้มา
    const agencies = [
        {
            id: "tourism",
            name: "MOTS",
            label: "การท่องเที่ยวและกีฬาจังหวัดสมุทรสงคราม",
            image: tourismMinistryLogo
        },
        {
            id: "pr",
            name: "PR Samut",
            label: "ประชาสัมพันธ์\nจังหวัดสมุทรสงคราม",
            image: prSamutLogo
        },
        {
            id: "pao",
            name: "PAO",
            label: "องค์การบริหารส่วน\nจังหวัดสมุทรสงคราม",
            image: paoLogo
        },
        {
            id: "local",
            name: "DLA",
            label: "สำนักงานส่งเสริมการปกครองท้องถิ่น\nจังหวัดสมุทรสงคราม",
            image: localAdminLogo
        },
        {
            id: "nso",
            name: "NSO",
            label: "สำนักงานสถิติ\nจังหวัดสมุทรสงคราม",
            image: nsoLogo
        },
    ];

    return (
        <section className="py-16 bg-muted/30 border-b border-border/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                        Logos 
                    </p>
                    <h3 className="text-2xl font-bold text-foreground">
                        หน่วยงานรัฐที่สนับสนุนข้อมูลและทดสอบระบบ
                    </h3>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                    {agencies.map((agency) => (
                        <div
                            key={agency.id}
                            className="w-48 h-48 bg-card rounded-2xl flex flex-col items-center justify-center p-6 shadow-sm hover:shadow-lg transition-all duration-300 group border border-border/50"
                        >
                            {/* แสดงรูปโลโก้แทน placeholder เดิม */}
                            <div className="w-24 h-24 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <img
                                    src={agency.image}
                                    alt={agency.label}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <p className="text-sm text-center text-muted-foreground font-medium leading-tight min-h-[2.5rem] flex items-center justify-center whitespace-pre-line">
                                {agency.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AgencyLogos;
