import { getCategory } from "../constants/categories";
import { toInputDate } from "./format";

// ส่งออกเป็น CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยนเพราะใส่ BOM)
export const exportCsv = (rows, filename) => {
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
