import { useState } from "react";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    getCategory,
} from "../constants/categories";
import { formatMoney, monthKey, shiftMonth } from "../utils/format";
import { dueDate, nextMonth } from "../utils/useRecurring";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const emptyForm = () => ({
    type: "expense",
    amount: "",
    category: "bills",
    day: String(new Date().getDate()),
    note: "",
    startNextMonth: false,
});

export default function RecurringCard({ uid, items, notify }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(null); // null = ปิดฟอร์ม
    const [editingId, setEditingId] = useState(null);

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
    const categories = form?.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm());
        setOpen(true);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm({
            type: item.type,
            amount: String(item.amount),
            category: item.category,
            day: String(item.day),
            note: item.note || "",
            startNextMonth: false,
        });
    };

    const closeForm = () => {
        setForm(null);
        setEditingId(null);
    };

    const save = (e) => {
        e.preventDefault();
        const amount = Number(form.amount);
        if (!form.amount || Number.isNaN(amount) || amount <= 0) {
            notify("กรุณากรอกจำนวนเงินมากกว่า 0", "danger");
            return;
        }
        if (!form.note.trim()) {
            notify("กรุณาตั้งชื่อรายการ เช่น ค่าเช่าห้อง", "danger");
            return;
        }

        const data = {
            type: form.type,
            amount: Math.round(amount * 100) / 100,
            category: form.category,
            day: Number(form.day),
            note: form.note.trim(),
        };

        if (editingId) {
            // มีผลกับเดือนถัดๆ ไป รายการที่ลงไปแล้วไม่เปลี่ยน
            commit(updateDoc(doc(db, "recurring", editingId), data), notify);
            notify("แก้ไขรายการประจำแล้ว");
        } else {
            const current = monthKey(new Date());
            commit(
                addDoc(collection(db, "recurring"), {
                    ...data,
                    userId: uid,
                    active: true,
                    startMonth: form.startNextMonth ? shiftMonth(current, 1) : current,
                    lastPosted: null,
                    createdAt: serverTimestamp(),
                }),
                notify
            );
            notify("เพิ่มรายการประจำแล้ว");
        }
        closeForm();
    };

    const toggleActive = (item) => {
        const update = { active: !item.active };
        // เปิดใช้ใหม่: ไม่ย้อนลงเดือนที่หยุดไว้ (เริ่มนับตั้งแต่เดือนนี้)
        if (!item.active) {
            const prev = shiftMonth(monthKey(new Date()), -1);
            if (!item.lastPosted || item.lastPosted < prev) update.lastPosted = prev;
        }
        commit(updateDoc(doc(db, "recurring", item.id), update), notify);
    };

    const remove = (item) => {
        if (!window.confirm(`ลบรายการประจำ "${item.note}"?\n(รายการที่ลงไปแล้วจะยังอยู่)`)) return;
        commit(deleteDoc(doc(db, "recurring", item.id)), notify);
        if (editingId === item.id) closeForm();
        notify("ลบรายการประจำแล้ว");
    };

    const monthlyNet = items
        .filter((i) => i.active)
        .reduce((sum, i) => sum + (i.type === "income" ? i.amount : -i.amount), 0);

    return (
        <div className="card app-card p-3 mb-3">
            <button
                type="button"
                className="btn btn-link p-0 text-reset text-decoration-none d-flex justify-content-between align-items-center w-100"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <h6 className="mb-0">🔁 รายการประจำ ({items.length})</h6>
                <span className="small text-body-secondary">
                    {items.length > 0 && `${monthlyNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(monthlyNet))}/เดือน `}
                    {open ? "▲" : "▼"}
                </span>
            </button>

            {open && (
                <div className="mt-3">
                    {items.length === 0 && !form && (
                        <small className="text-body-secondary d-block mb-2">
                            ตั้งรายการที่เกิดทุกเดือน เช่น ค่าเช่า ค่าเน็ต เงินเดือน
                            แอปจะลงรายการให้อัตโนมัติเมื่อถึงวันที่กำหนด
                        </small>
                    )}

                    {items.map((item) => {
                        const cat = getCategory(item.category);
                        const isIncome = item.type === "income";
                        return (
                            <div
                                key={item.id}
                                className={`tx-row d-flex align-items-center ${item.active ? "" : "opacity-50"} ${editingId === item.id ? "tx-editing" : ""}`}
                            >
                                <span className="tx-icon me-2">{cat.icon}</span>
                                <div className="flex-fill min-w-0">
                                    <div className="text-truncate">{item.note}</div>
                                    <small className="text-body-secondary d-block text-truncate">
                                        {item.active
                                            ? `ทุกวันที่ ${item.day} · ครั้งถัดไป ${dueDate(item, nextMonth(item)).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`
                                            : "⏸ หยุดไว้"}
                                    </small>
                                </div>
                                <div
                                    className={`fw-semibold text-nowrap ms-2 ${isIncome ? "text-success" : "text-danger"}`}
                                >
                                    {isIncome ? "+" : "−"}
                                    {formatMoney(item.amount)}
                                </div>
                                <div className="ms-1 text-nowrap">
                                    <button
                                        className="btn btn-sm btn-link px-1"
                                        title={item.active ? "หยุดชั่วคราว" : "เปิดใช้"}
                                        aria-label={item.active ? "หยุดชั่วคราว" : "เปิดใช้"}
                                        onClick={() => toggleActive(item)}
                                    >
                                        {item.active ? "⏸" : "▶️"}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-link px-1"
                                        title="แก้ไข"
                                        aria-label="แก้ไข"
                                        onClick={() => openEdit(item)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn btn-sm btn-link px-1"
                                        title="ลบ"
                                        aria-label="ลบ"
                                        onClick={() => remove(item)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {form ? (
                        <form onSubmit={save} className="mt-3 pt-3 border-top">
                            <h6 className="small fw-semibold mb-2">
                                {editingId ? "แก้ไขรายการประจำ" : "เพิ่มรายการประจำ"}
                            </h6>
                            <div className="btn-group btn-group-sm w-100 mb-2" role="group">
                                <button
                                    type="button"
                                    className={`btn ${form.type === "expense" ? "btn-danger" : "btn-outline-danger"}`}
                                    onClick={() => setForm((f) => ({ ...f, type: "expense", category: "bills" }))}
                                >
                                    รายจ่าย
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${form.type === "income" ? "btn-success" : "btn-outline-success"}`}
                                    onClick={() => setForm((f) => ({ ...f, type: "income", category: "salary" }))}
                                >
                                    รายรับ
                                </button>
                            </div>

                            <input
                                className="form-control mb-2"
                                placeholder="ชื่อรายการ เช่น ค่าเช่าห้อง, Netflix"
                                maxLength={100}
                                value={form.note}
                                onChange={(e) => set("note", e.target.value)}
                            />

                            <div className="row g-2 mb-2">
                                <div className="col-7">
                                    <div className="input-group">
                                        <input
                                            className="form-control"
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
                                </div>
                                <div className="col-5">
                                    <select
                                        className="form-select"
                                        value={form.day}
                                        onChange={(e) => set("day", e.target.value)}
                                        aria-label="วันที่ของทุกเดือน"
                                    >
                                        {DAYS.map((d) => (
                                            <option key={d} value={d}>
                                                ทุกวันที่ {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <select
                                className="form-select mb-2"
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

                            {Number(form.day) > 28 && (
                                <small className="text-body-secondary d-block mb-2">
                                    เดือนที่มีไม่ถึง {form.day} วัน จะลงวันสุดท้ายของเดือนแทน
                                </small>
                            )}

                            {!editingId && (
                                <div className="form-check mb-2">
                                    <input
                                        id="startNextMonth"
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={form.startNextMonth}
                                        onChange={(e) => set("startNextMonth", e.target.checked)}
                                    />
                                    <label htmlFor="startNextMonth" className="form-check-label small">
                                        เริ่มเดือนหน้า (เดือนนี้จดเองไปแล้ว)
                                    </label>
                                </div>
                            )}

                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-primary flex-fill">
                                    บันทึก
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button className="btn btn-outline-primary btn-sm w-100 mt-2" onClick={openAdd}>
                            + เพิ่มรายการประจำ
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
