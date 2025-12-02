export interface Place {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  location: string;
  district: "amphawa" | "mueang" | "bang-khonthi";
  category: "market" | "temple" | "cafe" | "homestay" | "photo-spot";
  image: string;
  rating: number;
  tags: string[];
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  googleMapsUrl: string;
  address: string;
  addressTh: string;
}

export const places: Place[] = [
  {
    id: "1",
    name: "Amphawa Floating Market",
    nameTh: "ตลาดน้ำอัมพวา",
    description: "The famous floating market where you can enjoy fresh seafood and local snacks from boats along the canal. Best visited in the evening for the magical firefly boat tours.",
    descriptionTh: "ตลาดน้ำที่มีชื่อเสียงที่คุณสามารถเพลิดเพลินกับอาหารทะเลสดและขนมท้องถิ่นจากเรือตามคลอง ดีที่สุดในช่วงเย็นสำหรับทัวร์เรือชมหิ่งห้อย",
    location: "Amphawa, Samut Songkhram",
    district: "amphawa",
    category: "market",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800",
    rating: 4.7,
    tags: ["ตลาดน้ำ", "อาหาร", "หิ่งห้อย"],
    openTime: "15:00",
    closeTime: "21:00",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Amphawa+Floating+Market",
    address: "Amphawa Sub-district, Amphawa District, Samut Songkhram 75110",
    addressTh: "ตำบลอัมพวา อำเภออัมพวา สมุทรสงคราม 75110",
  },
  {
    id: "2",
    name: "Wat Bang Kung",
    nameTh: "วัดบางกุ้ง",
    description: "An ancient temple enshrined within the roots of a massive banyan tree. Also known as the Church in the Tree, it's a mystical and serene place.",
    descriptionTh: "วัดโบราณที่ประดิษฐานอยู่ภายในรากของต้นไทรขนาดใหญ่ หรือที่เรียกว่าโบสถ์ในต้นไม้ เป็นสถานที่ที่ลึกลับและเงียบสงบ",
    location: "Bang Khonthi, Samut Songkhram",
    district: "bang-khonthi",
    category: "temple",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800",
    rating: 4.8,
    tags: ["วัด", "ประวัติศาสตร์", "ธรรมชาติ"],
    openTime: "08:00",
    closeTime: "17:00",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Wat+Bang+Kung",
    address: "Bang Kung Sub-district, Bang Khonthi District, Samut Songkhram 75120",
    addressTh: "ตำบลบางกุ้ง อำเภอบางคนที สมุทรสงคราม 75120",
  },
  {
    id: "3",
    name: "Maeklong Railway Market",
    nameTh: "ตลาดร่มหุบ",
    description: "Witness the incredible sight of vendors quickly clearing their stalls as the train passes through this unique market built on the railway tracks.",
    descriptionTh: "ชมภาพที่น่าทึ่งของผู้ค้าที่เก็บแผงลอยอย่างรวดเร็วขณะที่รถไฟแล่นผ่านตลาดแห่งนี้ที่สร้างบนรางรถไฟ",
    location: "Mueang, Samut Songkhram",
    district: "mueang",
    category: "market",
    image: "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=800",
    rating: 4.6,
    tags: ["ตลาด", "รถไฟ", "ท่องเที่ยว"],
    openTime: "06:00",
    closeTime: "18:00",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Maeklong+Railway+Market",
    address: "Mae Klong Sub-district, Mueang District, Samut Songkhram 75000",
    addressTh: "ตำบลแม่กลอง อำเภอเมือง สมุทรสงคราม 75000",
  },
  {
    id: "4",
    name: "Baan Rak Amphawa",
    nameTh: "บ้านรักอัมพวา",
    description: "A charming riverside homestay offering authentic Thai hospitality. Wake up to the gentle sounds of the river and enjoy homemade breakfast.",
    descriptionTh: "โฮมสเตย์ริมน้ำที่มีเสน่ห์พร้อมการต้อนรับแบบไทยแท้ ตื่นมาพร้อมเสียงแม่น้ำที่อ่อนโยนและเพลิดเพลินกับอาหารเช้าโฮมเมด",
    location: "Amphawa, Samut Songkhram",
    district: "amphawa",
    category: "homestay",
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
    rating: 4.9,
    tags: ["โฮมสเตย์", "ริมน้ำ", "พักผ่อน"],
    openTime: "00:00",
    closeTime: "23:59",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Baan+Rak+Amphawa",
    address: "Amphawa Sub-district, Amphawa District, Samut Songkhram 75110",
    addressTh: "ตำบลอัมพวา อำเภออัมพวา สมุทรสงคราม 75110",
  },
  {
    id: "5",
    name: "Café Kantary",
    nameTh: "คาเฟ่ แคนทารี",
    description: "A beautiful riverside café with stunning views of the Mae Klong river. Perfect for enjoying coffee while watching traditional boats pass by.",
    descriptionTh: "คาเฟ่ริมน้ำที่สวยงามพร้อมวิวแม่น้ำแม่กลอง เหมาะสำหรับการดื่มกาแฟขณะชมเรือแบบดั้งเดิมแล่นผ่าน",
    location: "Amphawa, Samut Songkhram",
    district: "amphawa",
    category: "cafe",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    rating: 4.5,
    tags: ["คาเฟ่", "ริมน้ำ", "กาแฟ"],
    openTime: "08:00",
    closeTime: "20:00",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Cafe+Kantary+Amphawa",
    address: "Amphawa Sub-district, Amphawa District, Samut Songkhram 75110",
    addressTh: "ตำบลอัมพวา อำเภออัมพวา สมุทรสงคราม 75110",
  },
  {
    id: "6",
    name: "Don Hoi Lot",
    nameTh: "ดอนหอยหลอด",
    description: "A unique sandbar formation home to the razor clam. Visit during low tide to walk on the exposed sandbar and see these fascinating creatures.",
    descriptionTh: "สันทรายที่มีลักษณะเฉพาะเป็นบ้านของหอยหลอด เยี่ยมชมในช่วงน้ำลงเพื่อเดินบนสันทรายและชมสิ่งมีชีวิตที่น่าทึ่ง",
    location: "Bang Tabun, Samut Songkhram",
    district: "bang-khonthi",
    category: "photo-spot",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    rating: 4.3,
    tags: ["ธรรมชาติ", "ถ่ายรูป", "ทะเล"],
    openTime: "06:00",
    closeTime: "18:00",
    isOpen: true,
    googleMapsUrl: "https://maps.google.com/?q=Don+Hoi+Lot",
    address: "Bang Tabun Sub-district, Bang Khonthi District, Samut Songkhram 75120",
    addressTh: "ตำบลบางตะบูน อำเภอบางคนที สมุทรสงคราม 75120",
  },
];

export const getPlaceById = (id: string): Place | undefined => {
  return places.find((place) => place.id === id);
};

export const filterPlaces = (
  district?: string,
  category?: string,
  search?: string
): Place[] => {
  return places.filter((place) => {
    if (district && place.district !== district) return false;
    if (category && place.category !== category) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        place.name.toLowerCase().includes(searchLower) ||
        place.nameTh.includes(search) ||
        place.tags.some((tag) => tag.includes(search))
      );
    }
    return true;
  });
};
