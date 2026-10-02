import { monthKey, shiftMonth } from "./format";

// รายจ่ายเดือนนี้เทียบเดือนก่อน
// ถ้าเป็นเดือนปัจจุบัน (ยังไม่จบเดือน) จะเทียบ "ช่วงวันเดียวกัน" เช่น 1–15 เทียบ 1–15 จะได้ยุติธรรม
export function compareWithPreviousMonth(transactions, month, today = new Date()) {
    const prev = shiftMonth(month, -1);
    const partial = month === monthKey(today);
    const cutoff = partial ? today.getDate() : 31;

    const sum = (key) => {
        const byCat = {};
        let total = 0;
        transactions.forEach((t) => {
            if (t.type !== "expense" || t.monthKey !== key || t.date.getDate() > cutoff) return;
            total += t.amount;
            byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        });
        return { total, byCat };
    };

    const cur = sum(month);
    const before = sum(prev);

    const keys = new Set([...Object.keys(cur.byCat), ...Object.keys(before.byCat)]);
    const changes = [...keys]
        .map((key) => {
            const current = cur.byCat[key] || 0;
            const previous = before.byCat[key] || 0;
            return { key, current, previous, diff: current - previous };
        })
        .filter((c) => Math.abs(c.diff) >= 0.01)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return {
        partial,
        cutoff,
        current: cur.total,
        previous: before.total,
        diff: cur.total - before.total,
        changes,
    };
}

// % เปลี่ยนแปลง (null = เดือนก่อนเป็น 0 คิด % ไม่ได้)
export const percentChange = (current, previous) =>
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

// รายการที่จดซ้ำบ่อย (ประเภท+หมวด+จำนวน+บันทึก เหมือนกัน) ใน 60 วันล่าสุด -> ใช้ทำปุ่มจดด่วน
export function frequentItems(transactions, today = new Date(), limit = 4) {
    const since = new Date(today);
    since.setDate(since.getDate() - 60);

    const groups = new Map();
    transactions.forEach((t) => {
        // รายการประจำลงให้อัตโนมัติอยู่แล้ว ไม่ต้องมีปุ่มด่วน
        if (t.recurringId || t.date < since) return;
        const note = (t.note || "").trim();
        const key = [t.type, t.category, t.amount, note].join("|");
        const g = groups.get(key) || {
            key,
            type: t.type,
            category: t.category,
            amount: t.amount,
            note,
            count: 0,
            last: t.date,
        };
        g.count += 1;
        if (t.date > g.last) g.last = t.date;
        groups.set(key, g);
    });

    return [...groups.values()]
        .filter((g) => g.count >= 2)
        .sort((a, b) => b.count - a.count || b.last - a.last)
        .slice(0, limit);
}
