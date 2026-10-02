import {
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { db } from "./config";
import { commit } from "./write";

const UNDO = "เลิกทำ";

// เพิ่มรายการ + ปุ่มเลิกทำใน toast
export function addTransaction(uid, data, notify, message = "เพิ่มรายการแล้ว") {
    const ref = doc(collection(db, "transactions"));
    commit(setDoc(ref, { ...data, userId: uid, createdAt: serverTimestamp() }), notify);
    notify(message, "success", {
        label: UNDO,
        onClick: () => {
            commit(deleteDoc(ref), notify);
            notify("ยกเลิกรายการแล้ว");
        },
    });
}

// ลบรายการ + ปุ่มเลิกทำ (สร้างกลับด้วย id เดิม)
export function deleteTransaction(t, notify) {
    commit(deleteDoc(doc(db, "transactions", t.id)), notify);
    notify("ลบรายการแล้ว", "success", {
        label: UNDO,
        onClick: () => {
            // ตัด field ที่คำนวณในแอป (id, monthKey) และค่า undefined ที่ Firestore ไม่รับ
            const { id, monthKey, ...rest } = t;
            const data = Object.fromEntries(
                Object.entries(rest).filter(([, v]) => v !== undefined && v !== null)
            );
            commit(
                setDoc(doc(db, "transactions", id), {
                    ...data,
                    createdAt: t.createdAt || serverTimestamp(),
                }),
                notify
            );
            notify("กู้คืนรายการแล้ว");
        },
    });
}
