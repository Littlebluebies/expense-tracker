import { errorMessage } from "./errors";

// Firestore อัปเดตข้อมูลในเครื่อง (และ onSnapshot) ทันทีที่สั่งเขียน
// แต่ promise จะรอจนเซิร์ฟเวอร์ตอบ -> ถ้าออฟไลน์จะค้างจนกว่าจะกลับมาออนไลน์
// จึงไม่ await แต่ดัก error ไว้แจ้งผู้ใช้แทน
export const commit = (promise, notify) =>
    promise.catch((err) => {
        console.error(err);
        notify?.(errorMessage(err), "danger");
    });
