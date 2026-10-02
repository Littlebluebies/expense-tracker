import { useState } from "react";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { commit } from "../firebase/write";
import { EXPENSE_CATEGORIES, getCategory } from "../constants/categories";
import { budgetStatus, formatMoney } from "../utils/format";

// งบรายหมวด (ใช้เหมือนกันทุกเดือน) เทียบกับยอดใช้จริงของเดือนที่เลือก
export default function CategoryBudgetCard({
    uid,
    limits,
    spent,
    monthBudget,
    notify,
}) {
    const [editing, setEditing] = useState(false);
    const [inputs, setInputs] = useState({});

    const startEdit = () => {
        setInputs(
            Object.fromEntries(
                EXPENSE_CATEGORIES.map((c) => [c.key, limits[c.key] ? String(limits[c.key]) : ""])
            )
        );
        setEditing(true);
    };

    const save = (e) => {
        e.preventDefault();
        const categories = {};
        EXPENSE_CATEGORIES.forEach(({ key }) => {
            const value = Number(inputs[key]);
            // ช่องว่าง/0 = ไม่ตั้งงบหมวดนี้
            categories[key] = inputs[key] && value > 0 ? value : deleteField();
        });
        commit(setDoc(doc(db, "budgets", uid), { categories }, { merge: true }), notify);
        setEditing(false);
        notify("บันทึกงบรายหมวดแล้ว");
    };

    const rows = Object.entries(limits)
        .filter(([, limit]) => limit > 0)
        .map(([key, limit]) => {
            const used = spent[key] || 0;
            return { key, limit, used, percent: (used / limit) * 100 };
        })
        .sort((a, b) => b.percent - a.percent);

    const unbudgeted = Object.entries(spent)
        .filter(([key]) => !(limits[key] > 0))
        .reduce((sum, [, v]) => sum + v, 0);

    const totalLimits = rows.reduce((sum, r) => sum + r.limit, 0);
    const editTotal = Object.values(inputs).reduce((sum, v) => sum + (Number(v) || 0), 0);

    return (
        <div className="card app-card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">🗂️ งบรายหมวด</h6>
                {!editing && (
                    <button className="btn btn-sm btn-outline-primary" onClick={startEdit}>
                        {rows.length ? "แก้ไข" : "ตั้งงบหมวด"}
                    </button>
                )}
            </div>

            {editing ? (
                <form onSubmit={save}>
                    <small className="text-body-secondary d-block mb-2">
                        ใส่งบต่อเดือนของแต่ละหมวด (เว้นว่าง = ไม่จำกัด)
                    </small>
                    {EXPENSE_CATEGORIES.map((c) => (
                        <div key={c.key} className="input-group input-group-sm mb-1">
                            <span className="input-group-text flex-fill text-start cat-label">
                                {c.icon} {c.label}
                            </span>
                            <input
                                className="form-control text-end cat-input"
                                inputMode="decimal"
                                placeholder="-"
                                value={inputs[c.key]}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/,/g, "");
                                    if (/^\d*\.?\d{0,2}$/.test(v)) {
                                        setInputs((s) => ({ ...s, [c.key]: v }));
                                    }
                                }}
                                aria-label={`งบ ${c.label}`}
                            />
                            <span className="input-group-text">฿</span>
                        </div>
                    ))}
                    <div className="small my-2">
                        รวม {formatMoney(editTotal)}
                        {monthBudget > 0 && editTotal > monthBudget && (
                            <span className="text-warning-emphasis">
                                {" "}
                                ⚠️ มากกว่างบรวมของเดือน ({formatMoney(monthBudget)})
                            </span>
                        )}
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
            ) : rows.length === 0 ? (
                <small className="text-body-secondary">
                    ตั้งงบให้แต่ละหมวด เช่น อาหาร 6,000 ฿ เพื่อดูว่าเงินรั่วไปที่หมวดไหน
                </small>
            ) : (
                <>
                    {rows.map((r) => {
                        const cat = getCategory(r.key);
                        const status = budgetStatus(r.percent);
                        const left = r.limit - r.used;
                        return (
                            <div key={r.key} className="mb-2">
                                <div className="d-flex justify-content-between small">
                                    <span className="text-truncate">
                                        {cat.icon} {cat.label}
                                    </span>
                                    <span className="text-nowrap ms-2">
                                        {formatMoney(r.used)} / {formatMoney(r.limit)}
                                    </span>
                                </div>
                                <div
                                    className="progress mt-1"
                                    style={{ height: 6 }}
                                    role="progressbar"
                                    aria-label={cat.label}
                                    aria-valuenow={Math.round(r.percent)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div
                                        className={`progress-bar bg-${status.cls}`}
                                        style={{ width: `${Math.min(r.percent, 100)}%` }}
                                    />
                                </div>
                                <div className={`small text-${status.cls}-emphasis`}>
                                    {status.icon}{" "}
                                    {left >= 0
                                        ? `เหลือ ${formatMoney(left)}`
                                        : `เกิน ${formatMoney(-left)}`}
                                </div>
                            </div>
                        );
                    })}
                    {unbudgeted > 0 && (
                        <div className="small text-body-secondary mt-2">
                            หมวดที่ไม่ได้ตั้งงบ ใช้ไป {formatMoney(unbudgeted)}
                        </div>
                    )}
                    {monthBudget > 0 && totalLimits > monthBudget && (
                        <div className="small text-warning-emphasis mt-1">
                            ⚠️ งบรายหมวดรวม {formatMoney(totalLimits)} มากกว่างบเดือน
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
