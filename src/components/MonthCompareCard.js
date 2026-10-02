import { getCategory } from "../constants/categories";
import { compareWithPreviousMonth, percentChange } from "../utils/insights";
import { formatMoney, monthLabel, shiftMonth } from "../utils/format";

// ▲ ใช้มากขึ้น (แย่) / ▼ ใช้น้อยลง (ดี) — มีลูกศร + ข้อความ ไม่พึ่งสีอย่างเดียว
function Change({ diff, current, previous }) {
    const pct = percentChange(current, previous);
    const up = diff > 0;
    return (
        <span className={`text-nowrap ${up ? "text-danger-emphasis" : "text-success-emphasis"}`}>
            {up ? "▲" : "▼"} {formatMoney(Math.abs(diff))}
            {pct !== null && ` (${up ? "+" : "−"}${Math.abs(pct)}%)`}
        </span>
    );
}

export default function MonthCompareCard({ transactions, month }) {
    const r = compareWithPreviousMonth(transactions, month);
    if (r.current === 0 && r.previous === 0) return null;

    const prevLabel = monthLabel(shiftMonth(month, -1), "short");
    const period = r.partial ? `ช่วงวันที่ 1–${r.cutoff} ของ${prevLabel}` : prevLabel;

    let headline;
    if (r.previous === 0) {
        headline = <>{prevLabel} ไม่มีรายจ่ายในช่วงเดียวกัน</>;
    } else if (Math.abs(r.diff) < 0.01) {
        headline = <>รายจ่ายเท่ากับ{period}</>;
    } else {
        headline = (
            <>
                รายจ่าย{r.diff > 0 ? "มากกว่า" : "น้อยกว่า"}{period}{" "}
                <Change diff={r.diff} current={r.current} previous={r.previous} />
            </>
        );
    }

    return (
        <div className="card app-card p-3 mb-3">
            <h6 className="mb-2">📌 เทียบกับเดือนก่อน</h6>
            <div className="small mb-2">{headline}</div>
            {r.previous > 0 &&
                r.changes.slice(0, 3).map((c) => {
                    const cat = getCategory(c.key);
                    return (
                        <div key={c.key} className="d-flex justify-content-between small">
                            <span className="text-truncate">
                                {cat.icon} {cat.label}
                            </span>
                            <Change diff={c.diff} current={c.current} previous={c.previous} />
                        </div>
                    );
                })}
        </div>
    );
}
