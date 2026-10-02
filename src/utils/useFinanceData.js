import { useEffect, useState } from "react";
import {
    collection,
    doc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { errorMessage } from "../firebase/errors";
import { monthKey, toDate } from "./format";

// รายการทั้งหมดของผู้ใช้ อัปเดตแบบ real-time (ไม่ต้อง fetch ใหม่หลังเพิ่ม/ลบ)
export function useTransactions(uid) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!uid) return undefined;
        const q = query(collection(db, "transactions"), where("userId", "==", uid));
        return onSnapshot(
            q,
            (snap) => {
                const data = snap.docs.map((d) => {
                    const t = d.data();
                    const date = toDate(t.date);
                    return {
                        ...t,
                        id: d.id,
                        amount: Number(t.amount) || 0,
                        date,
                        monthKey: monthKey(date),
                        createdAt: t.createdAt ? toDate(t.createdAt) : null,
                    };
                });
                // ใหม่สุดก่อน
                data.sort(
                    (a, b) => b.date - a.date || (b.createdAt || 0) - (a.createdAt || 0)
                );
                setTransactions(data);
                setLoading(false);
            },
            (err) => {
                console.error(err);
                setError(errorMessage(err));
                setLoading(false);
            }
        );
    }, [uid]);

    return { transactions, loading, error };
}

// budgets/{uid} = {
//   budget: งบเริ่มต้นทุกเดือน,
//   monthly: { "YYYY-MM": งบเฉพาะเดือน },
//   categories: { food: 6000, ... }  งบรายหมวดต่อเดือน (ใช้ทุกเดือน)
// }
export function useBudgets(uid) {
    const [budgets, setBudgets] = useState({ budget: 0, monthly: {}, categories: {} });

    useEffect(() => {
        if (!uid) return undefined;
        return onSnapshot(
            doc(db, "budgets", uid),
            (snap) => {
                const data = snap.exists() ? snap.data() : {};
                setBudgets({
                    budget: Number(data.budget) || 0,
                    monthly: data.monthly || {},
                    categories: data.categories || {},
                });
            },
            (err) => console.error("Error loading budget:", err)
        );
    }, [uid]);

    const budgetFor = (key) => {
        const m = budgets.monthly[key];
        return m !== undefined && m !== null ? Number(m) : budgets.budget;
    };

    return { budgets, budgetFor };
}
