import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import { getCategory } from "../constants/categories";
import {
    budgetStatus,
    daysInMonth,
    formatMoney,
    monthKey,
    monthLabel,
} from "../utils/format";

export default function BudgetCard({
    uid,
    month,
    budget,
    isCustom,
    expense,
    topCategory,
    notify,
}) {
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState("");
    const [asDefault, setAsDefault] = useState(false);

    const startEdit = () => {
        setInput(budget ? String(budget) : "");
        setAsDefault(!isCustom);
        setEditing(true);
    };

    const save = (e) => {
        e.preventDefault();
        const value = Number(input);
        if (input === "" || Number.isNaN(value) || value < 0) {
            notify("กรุณากรอกงบประมาณให้ถูกต้อง", "danger");
            return;
        }
        // merge: true -> ไม่ทับงบของเดือนอื่น
        commit(
            setDoc(
                doc(db, "budgets", uid),
                asDefault
                    ? { budget: value, monthly: { [month]: null } }
                    : { monthly: { [month]: value } },
                { merge: true }
            ),
            notify
        );
        setEditing(false);
        notify("บันทึกงบประมาณแล้ว");
    };

    const remaining = budget - expense;
    const percent = budget > 0 ? (expense / budget) * 100 : 0;

    const status = budgetStatus(percent);

    // งบที่ใช้ได้ต่อวันที่เหลือ (เฉพาะเดือนปัจจุบัน)
    const today = new Date();
    const isCurrentMonth = monthKey(today) === month;
    const daysLeft = isCurrentMonth ? daysInMonth(month) - today.getDate() + 1 : 0;
    const perDay = daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0;

    return (
        <div className="card app-card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">🎯 งบประมาณ {monthLabel(month, "short")}</h6>
                {!editing && (
                    <button className="btn btn-sm btn-outline-primary" onClick={startEdit}>
                        {budget > 0 ? "แก้ไข" : "ตั้งงบ"}
                    </button>
                )}
            </div>

            {editing && (
                <form onSubmit={save} className="mb-2">
                    <div className="input-group mb-2">
                        <input
                            className="form-control"
                            inputMode="decimal"
                            placeholder="งบประมาณเดือนนี้"
                            value={input}
                            onChange={(e) => {
                                const v = e.target.value.replace(/,/g, "");
                                if (/^\d*\.?\d{0,2}$/.test(v)) setInput(v);
                            }}
                            autoFocus
                        />
                        <span className="input-group-text">฿</span>
                    </div>
                    <div className="form-check mb-2">
                        <input
                            id="asDefault"
                            type="checkbox"
                            className="form-check-input"
                            checked={asDefault}
                            onChange={(e) => setAsDefault(e.target.checked)}
                        />
                        <label htmlFor="asDefault" className="form-check-label small">
                            ใช้เป็นงบเริ่มต้นทุกเดือน (เดือนที่ไม่ได้ตั้งแยกไว้)
                        </label>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-success flex-fill">
                            บันทึก
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setEditing(false)}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            )}

            {budget > 0 ? (
                <>
                    <div className="d-flex justify-content-between small">
                        <span>
                            ใช้ไป <strong>{formatMoney(expense)}</strong> / {formatMoney(budget)}
                        </span>
                        <span className={`text-${status.cls}-emphasis`}>
                            {status.icon} {status.text}
                        </span>
                    </div>

                    <div
                        className="progress mt-2"
                        style={{ height: 10 }}
                        role="progressbar"
                        aria-valuenow={Math.round(percent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className={`progress-bar bg-${status.cls}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                    </div>

                    <div className="d-flex justify-content-between mt-2 small text-body-secondary">
                        <span>{Math.round(percent)}%</span>
                        <span>
                            {remaining >= 0
                                ? `คงเหลือ ${formatMoney(remaining)}`
                                : `เกินมา ${formatMoney(-remaining)}`}
                        </span>
                    </div>

                    {perDay > 0 && (
                        <div className="mt-2 small">
                            💡 ใช้ได้อีกวันละประมาณ <strong>{formatMoney(Math.floor(perDay))}</strong>{" "}
                            ({daysLeft} วันที่เหลือ)
                        </div>
                    )}

                    {percent > 100 && topCategory && (
                        <div className="mt-2 small text-danger-emphasis">
                            หมวดที่ใช้มากที่สุด: {getCategory(topCategory).icon}{" "}
                            {getCategory(topCategory).label}
                        </div>
                    )}

                    {!isCustom && (
                        <div className="mt-1 small text-body-secondary">
                            (ใช้งบเริ่มต้น)
                        </div>
                    )}
                </>
            ) : (
                !editing && (
                    <small className="text-body-secondary">
                        ยังไม่ได้ตั้งงบสำหรับเดือนนี้ — ใช้ไปแล้ว {formatMoney(expense)}
                    </small>
                )
            )}
        </div>
    );
}
