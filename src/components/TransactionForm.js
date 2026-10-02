import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import { addTransaction } from "../firebase/transactions";
import {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    getCategory,
} from "../constants/categories";
import { formatMoney, fromInputDate, toInputDate } from "../utils/format";

const emptyForm = () => ({
    type: "expense",
    amount: "",
    category: EXPENSE_CATEGORIES[0].key,
    date: toInputDate(new Date()),
    note: "",
});

export default function TransactionForm({ uid, editing, onDone, notify, quickItems = [] }) {
    const [form, setForm] = useState(emptyForm);

    // เปิดโหมดแก้ไข -> เติมค่าลงฟอร์ม
    useEffect(() => {
        if (editing) {
            setForm({
                type: editing.type,
                amount: String(editing.amount),
                category: editing.category,
                date: toInputDate(editing.date),
                note: editing.note || "",
            });
        } else {
            setForm(emptyForm());
        }
    }, [editing]);

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const changeType = (type) =>
        setForm((f) => ({
            ...f,
            type,
            category: (type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0].key,
        }));

    const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    const submit = (e) => {
        e.preventDefault();
        const amount = Number(form.amount);
        if (!form.amount || Number.isNaN(amount) || amount <= 0) {
            notify("กรุณากรอกจำนวนเงินมากกว่า 0", "danger");
            return;
        }
        if (!form.date) {
            notify("กรุณาเลือกวันที่", "danger");
            return;
        }

        const data = {
            amount: Math.round(amount * 100) / 100,
            type: form.type,
            category: form.category,
            date: fromInputDate(form.date),
            note: form.note.trim(),
        };

        if (editing) {
            commit(updateDoc(doc(db, "transactions", editing.id), data), notify);
            notify("แก้ไขรายการแล้ว");
        } else {
            addTransaction(uid, data, notify);
        }
        // คงประเภท/หมวด/วันที่ไว้ เผื่อจดหลายรายการติดกัน
        setForm((f) => ({ ...f, amount: "", note: "" }));
        onDone(fromInputDate(form.date));
    };

    // จดด่วน: กดครั้งเดียวลงรายการวันนี้เลย
    const quickAdd = (item) => {
        const label = item.note || getCategory(item.category).label;
        addTransaction(
            uid,
            {
                amount: item.amount,
                type: item.type,
                category: item.category,
                note: item.note,
                date: new Date(),
            },
            notify,
            `เพิ่ม "${label}" แล้ว`
        );
        onDone(new Date());
    };

    return (
        <form className="card app-card p-3 mb-3" onSubmit={submit} id="transaction-form">
            <h6 className="mb-2">{editing ? "✏️ แก้ไขรายการ" : "➕ เพิ่มรายการ"}</h6>

            {!editing && quickItems.length > 0 && (
                <div className="mb-3">
                    <small className="text-body-secondary d-block mb-1">⚡ จดด่วน (วันนี้)</small>
                    <div className="d-flex flex-wrap gap-2">
                        {quickItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className="btn btn-sm btn-outline-secondary quick-chip"
                                onClick={() => quickAdd(item)}
                            >
                                {getCategory(item.category).icon}{" "}
                                <span className="text-truncate">
                                    {item.note || getCategory(item.category).label}
                                </span>{" "}
                                <span className={item.type === "income" ? "text-success" : "text-danger"}>
                                    {item.type === "income" ? "+" : "−"}
                                    {formatMoney(item.amount)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="btn-group w-100 mb-2" role="group">
                <button
                    type="button"
                    className={`btn ${form.type === "expense" ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={() => changeType("expense")}
                >
                    รายจ่าย
                </button>
                <button
                    type="button"
                    className={`btn ${form.type === "income" ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => changeType("income")}
                >
                    รายรับ
                </button>
            </div>

            <div className="input-group mb-2">
                <input
                    className="form-control form-control-lg"
                    inputMode="decimal"
                    placeholder="จำนวนเงิน"
                    value={form.amount}
                    onChange={(e) => {
                        const v = e.target.value.replace(/,/g, "");
                        if (/^\d*\.?\d{0,2}$/.test(v)) set("amount", v);
                    }}
                />
                <span className="input-group-text">฿</span>
            </div>

            <div className="row g-2 mb-2">
                <div className="col-7">
                    <select
                        className="form-select"
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        aria-label="หมวดหมู่"
                    >
                        {categories.map((c) => (
                            <option key={c.key} value={c.key}>
                                {c.icon} {c.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-5">
                    <input
                        type="date"
                        className="form-control"
                        value={form.date}
                        max={toInputDate(new Date())}
                        onChange={(e) => set("date", e.target.value)}
                        aria-label="วันที่"
                    />
                </div>
            </div>

            <input
                className="form-control mb-2"
                placeholder="บันทึกเพิ่มเติม (ไม่บังคับ) เช่น ข้าวกลางวัน"
                maxLength={100}
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
            />

            <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary flex-fill">
                    {editing ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
                </button>
                {editing && (
                    <button type="button" className="btn btn-secondary" onClick={() => onDone()}>
                        ยกเลิก
                    </button>
                )}
            </div>
        </form>
    );
}
