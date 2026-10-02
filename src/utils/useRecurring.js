import { useEffect, useRef, useState } from "react";
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import { daysInMonth, fromInputDate, monthKey, shiftMonth } from "./format";

// ย้อนลงรายการที่ตกหล่นได้สูงสุดกี่เดือน (กันกรณีไม่ได้เปิดแอปนานๆ)
const MAX_CATCH_UP = 12;

// วันที่ลงรายการในเดือนนั้น (ตั้งวันที่ 31 แต่เดือนมี 30 วัน -> วันที่ 30)
export const dueDay = (item, month) => Math.min(item.day, daysInMonth(month));

export const dueDate = (item, month) =>
    fromInputDate(`${month}-${String(dueDay(item, month)).padStart(2, "0")}`);

// เดือนแรกที่ยังไม่ได้ลงรายการ
export const nextMonth = (item) =>
    item.lastPosted ? shiftMonth(item.lastPosted, 1) : item.startMonth;

// เดือนที่ถึงกำหนดแล้วแต่ยังไม่ได้ลง
export const dueMonths = (item, today) => {
    const current = monthKey(today);
    let m = nextMonth(item);
    const earliest = shiftMonth(current, -(MAX_CATCH_UP - 1));
    if (m < earliest) m = earliest;

    const out = [];
    while (m <= current) {
        if (m === current && dueDay(item, m) > today.getDate()) break;
        out.push(m);
        m = shiftMonth(m, 1);
    }
    return out;
};

// recurring/{id} = { userId, type, amount, category, note, day, startMonth, lastPosted, active }
// เปิดแอปเมื่อไหร่ จะลงรายการประจำที่ถึงกำหนดให้อัตโนมัติ
export function useRecurring(uid, transactions, transactionsLoaded, notify) {
    const [items, setItems] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const inFlight = useRef(new Set());

    useEffect(() => {
        if (!uid) return undefined;
        const q = query(collection(db, "recurring"), where("userId", "==", uid));
        return onSnapshot(
            q,
            (snap) => {
                const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
                data.sort((a, b) => a.day - b.day);
                setItems(data);
                setLoaded(true);
            },
            (err) => console.error("Error loading recurring:", err)
        );
    }, [uid]);

    useEffect(() => {
        if (!uid || !loaded || !transactionsLoaded) return;

        const today = new Date();
        const existing = new Set(transactions.map((t) => t.id));
        let posted = 0;

        items
            .filter((item) => item.active)
            .forEach((item) => {
                const months = dueMonths(item, today);
                if (months.length === 0) return;

                const last = months[months.length - 1];
                const guard = `${item.id}:${last}`;
                if (inFlight.current.has(guard)) return;
                inFlight.current.add(guard);

                const batch = writeBatch(db);
                months.forEach((m) => {
                    // id ตายตัวต่อเดือน -> ต่อให้หลายเครื่องลงพร้อมกันก็ไม่ซ้ำ
                    const id = `rec_${item.id}_${m}`;
                    if (existing.has(id)) return;
                    batch.set(doc(db, "transactions", id), {
                        amount: item.amount,
                        type: item.type,
                        category: item.category,
                        note: item.note || "",
                        date: dueDate(item, m),
                        userId: uid,
                        recurringId: item.id,
                        createdAt: serverTimestamp(),
                    });
                    posted += 1;
                });
                batch.update(doc(db, "recurring", item.id), { lastPosted: last });
                commit(batch.commit(), notify);
            });

        if (posted > 0) notify(`🔁 ลงรายการประจำอัตโนมัติ ${posted} รายการ`);
    }, [uid, loaded, transactionsLoaded, items, transactions, notify]);

    return { items, loaded };
}
