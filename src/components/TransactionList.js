import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import { getCategory } from "../constants/categories";
import { formatMoney, toInputDate } from "../utils/format";

// ส่งออกเป็น CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยนเพราะใส่ BOM)
const exportCsv = (rows, filename) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
        ["วันที่", "ประเภท", "หมวด", "จำนวนเงิน", "บันทึก"].map(esc).join(","),
        ...rows.map((t) =>
            [
                toInputDate(t.date),
                t.type === "income" ? "รายรับ" : "รายจ่าย",
                getCategory(t.category).label,
                t.type === "income" ? t.amount : -t.amount,
                t.note,
            ]
                .map(esc)
                .join(",")
        ),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export default function TransactionList({ transactions, month, editingId, onEdit, notify }) {
    const [typeFilter, setTypeFilter] = useState("all");
    const [search, setSearch] = useState("");

    const keyword = search.trim().toLowerCase();
    const rows = transactions.filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (!keyword) return true;
        const cat = getCategory(t.category);
        return (
            (t.note || "").toLowerCase().includes(keyword) ||
            cat.label.toLowerCase().includes(keyword) ||
            String(t.amount).includes(keyword)
        );
    });

    // จัดกลุ่มตามวัน (transactions เรียงใหม่สุดก่อนอยู่แล้ว)
    const groups = [];
    rows.forEach((t) => {
        const key = toInputDate(t.date);
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) {
            g = { key, date: t.date, items: [], net: 0 };
            groups.push(g);
        }
        g.items.push(t);
        g.net += t.type === "income" ? t.amount : -t.amount;
    });

    const remove = (t) => {
        const label = `${getCategory(t.category).label} ${formatMoney(t.amount)}`;
        if (!window.confirm(`ลบรายการ "${label}" ใช่ไหม?`)) return;
        commit(deleteDoc(doc(db, "transactions", t.id)), notify);
        notify("ลบรายการแล้ว");
    };

    return (
        <div className="card app-card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">🧾 รายการ ({rows.length})</h6>
                <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={rows.length === 0}
                    onClick={() => exportCsv(rows, `transactions-${month}.csv`)}
                >
                    ⬇️ CSV
                </button>
            </div>

            <div className="d-flex gap-2 mb-3">
                <select
                    className="form-select form-select-sm w-auto"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="กรองประเภท"
                >
                    <option value="all">ทั้งหมด</option>
                    <option value="expense">รายจ่าย</option>
                    <option value="income">รายรับ</option>
                </select>
                <input
                    className="form-control form-control-sm"
                    placeholder="🔍 ค้นหา หมวด/บันทึก/จำนวน"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {groups.length === 0 && (
                <p className="text-body-secondary small text-center my-3">
                    {transactions.length === 0 ? "ยังไม่มีรายการในเดือนนี้" : "ไม่พบรายการที่ค้นหา"}
                </p>
            )}

            {groups.map((g) => (
                <div key={g.key} className="mb-2">
                    <div className="d-flex justify-content-between small text-body-secondary border-bottom pb-1 mb-1">
                        <span>
                            {g.date.toLocaleDateString("th-TH", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                            })}
                        </span>
                        <span>
                            {g.net >= 0 ? "+" : "−"}
                            {formatMoney(Math.abs(g.net))}
                        </span>
                    </div>

                    {g.items.map((t) => {
                        const cat = getCategory(t.category);
                        const isIncome = t.type === "income";
                        return (
                            <div
                                key={t.id}
                                className={`tx-row d-flex align-items-center ${editingId === t.id ? "tx-editing" : ""}`}
                            >
                                <span className="tx-icon me-2">{cat.icon}</span>
                                <div className="flex-fill min-w-0">
                                    <div className="text-truncate">
                                        {cat.label}
                                        {t.recurringId && (
                                            <span className="ms-1 small" title="รายการประจำ">
                                                🔁
                                            </span>
                                        )}
                                    </div>
                                    {t.note && (
                                        <small className="text-body-secondary d-block text-truncate">
                                            {t.note}
                                        </small>
                                    )}
                                </div>
                                <div
                                    className={`fw-semibold text-nowrap ms-2 ${isIncome ? "text-success" : "text-danger"}`}
                                >
                                    {isIncome ? "+" : "−"}
                                    {formatMoney(t.amount)}
                                </div>
                                <div className="ms-2 text-nowrap">
                                    <button
                                        className="btn btn-sm btn-link px-1"
                                        title="แก้ไข"
                                        aria-label="แก้ไข"
                                        onClick={() => onEdit(t)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn btn-sm btn-link px-1"
                                        title="ลบ"
                                        aria-label="ลบ"
                                        onClick={() => remove(t)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
