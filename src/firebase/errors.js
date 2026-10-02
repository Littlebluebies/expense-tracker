const MESSAGES = {
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/missing-email": "กรุณากรอกอีเมล",
    "auth/missing-password": "กรุณากรอกรหัสผ่าน",
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "ไม่พบบัญชีผู้ใช้นี้",
    "auth/user-disabled": "บัญชีนี้ถูกระงับการใช้งาน",
    "auth/email-already-in-use": "อีเมลนี้ถูกใช้สมัครแล้ว",
    "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/too-many-requests": "พยายามหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง",
    "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้",
    "permission-denied": "ไม่มีสิทธิ์เข้าถึงข้อมูล (ตรวจสอบ Firestore Rules)",
    unavailable: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่",
};

export const errorMessage = (error) =>
    MESSAGES[error?.code] || error?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
