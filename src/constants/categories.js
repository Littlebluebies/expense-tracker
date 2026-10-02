// หมวดหมู่รายจ่าย/รายรับ (key ที่เก็บใน Firestore -> ชื่อที่แสดง)
export const EXPENSE_CATEGORIES = [
    { key: "food", label: "อาหาร/เครื่องดื่ม", icon: "🍜" },
    { key: "travel", label: "เดินทาง", icon: "🚗" },
    { key: "shopping", label: "ช้อปปิ้ง", icon: "🛍️" },
    { key: "bills", label: "ค่าน้ำ/ไฟ/เน็ต/โทรศัพท์", icon: "💡" },
    { key: "housing", label: "ค่าที่พัก", icon: "🏠" },
    { key: "health", label: "สุขภาพ", icon: "💊" },
    { key: "entertainment", label: "บันเทิง", icon: "🎬" },
    { key: "education", label: "การศึกษา", icon: "📚" },
    { key: "other", label: "อื่นๆ", icon: "📦" },
];

export const INCOME_CATEGORIES = [
    { key: "salary", label: "เงินเดือน", icon: "💼" },
    { key: "bonus", label: "โบนัส", icon: "🎁" },
    { key: "freelance", label: "งานเสริม", icon: "🧑‍💻" },
    { key: "income", label: "รายรับอื่นๆ", icon: "💰" }, // ข้อมูลเก่าใช้ "income"
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const getCategory = (key) =>
    ALL.find((c) => c.key === key) || { key, label: key, icon: "📦" };
