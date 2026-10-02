import { Bar, Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { EXPENSE_CATEGORIES, getCategory } from "../constants/categories";
import { formatMoney, monthLabel, shiftMonth } from "../utils/format";

ChartJS.register(
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip
);

// ชุดสีที่ผ่านการตรวจ color-blind แล้ว (light / dark) เรียงตามลำดับตายตัว
const PALETTE = {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

const THEME = {
    light: { surface: "#ffffff", text: "#52514e", grid: "#e8e7e3", neutral: "#8a8984" },
    dark: { surface: "#212529", text: "#c3c2b7", grid: "#3a3a37", neutral: "#8a8984" },
};

// สีผูกกับหมวด (ไม่ใช่อันดับ) -> หมวดเดิมได้สีเดิมเสมอ, "อื่นๆ" เป็นสีเทา
const categoryColor = (key, mode) => {
    const idx = EXPENSE_CATEGORIES.findIndex((c) => c.key === key);
    if (key === "other" || idx < 0 || idx >= PALETTE[mode].length) return THEME[mode].neutral;
    return PALETTE[mode][idx];
};

export function CategoryChart({ totals, mode }) {
    const t = THEME[mode];
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    if (entries.length === 0) {
        return (
            <div className="card app-card p-3 mb-3">
                <h6 className="mb-2">📊 รายจ่ายตามหมวด</h6>
                <p className="text-body-secondary small mb-0">ยังไม่มีรายจ่ายในเดือนนี้</p>
            </div>
        );
    }

    const data = {
        labels: entries.map(([k]) => getCategory(k).label),
        datasets: [
            {
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map(([k]) => categoryColor(k, mode)),
                borderColor: t.surface,
                borderWidth: 2,
                hoverOffset: 4,
            },
        ],
    };

    return (
        <div className="card app-card p-3 mb-3">
            <h6 className="mb-3">📊 รายจ่ายตามหมวด</h6>
            <div className="row align-items-center g-3">
                <div className="col-5">
                    <Doughnut
                        data={data}
                        options={{
                            cutout: "62%",
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) =>
                                            ` ${formatMoney(ctx.parsed)} (${Math.round((ctx.parsed / total) * 100)}%)`,
                                    },
                                },
                            },
                        }}
                    />
                </div>
                <div className="col-7">
                    {/* legend + ตัวเลข (อ่านได้โดยไม่ต้องพึ่งสี) */}
                    {entries.map(([k, v]) => (
                        <div key={k} className="d-flex align-items-center small mb-1">
                            <span
                                className="legend-dot me-2"
                                style={{ background: categoryColor(k, mode) }}
                            />
                            <span className="flex-fill text-truncate">
                                {getCategory(k).icon} {getCategory(k).label}
                            </span>
                            <span className="ms-2 text-nowrap">
                                {formatMoney(v)}{" "}
                                <span className="text-body-secondary">
                                    {Math.round((v / total) * 100)}%
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// รายจ่ายรายเดือน (ย้อนหลัง 6 เดือนจนถึงเดือนที่เลือก) เทียบกับงบของแต่ละเดือน
export function MonthlyChart({ transactions, month, budgetFor, mode, onSelectMonth }) {
    const t = THEME[mode];
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));

    const expenseByMonth = Object.fromEntries(months.map((m) => [m, 0]));
    transactions.forEach((tx) => {
        if (tx.type === "expense" && tx.monthKey in expenseByMonth) {
            expenseByMonth[tx.monthKey] += tx.amount;
        }
    });

    const expenses = months.map((m) => expenseByMonth[m]);
    const budgets = months.map((m) => budgetFor(m) || null);
    const hasBudget = budgets.some((b) => b);

    const data = {
        labels: months.map((m) => monthLabel(m, "short")),
        datasets: [
            {
                type: "bar",
                label: "รายจ่าย",
                data: expenses,
                backgroundColor: months.map((m) =>
                    m === month ? PALETTE[mode][0] : `${PALETTE[mode][0]}80`
                ),
                borderRadius: 4,
                maxBarThickness: 36,
                order: 2,
            },
            ...(hasBudget
                ? [
                      {
                          type: "line",
                          label: "งบประมาณ",
                          data: budgets,
                          borderColor: t.neutral,
                          backgroundColor: t.neutral,
                          borderWidth: 2,
                          borderDash: [6, 4],
                          pointRadius: 4,
                          stepped: "middle",
                          spanGaps: true,
                          order: 1,
                      },
                  ]
                : []),
        ],
    };

    return (
        <div className="card app-card p-3 mb-3">
            <h6 className="mb-2">📈 รายจ่ายรายเดือน (6 เดือน)</h6>
            <div style={{ height: 220 }}>
                <Bar
                    data={data}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        onClick: (_, elements) => {
                            if (elements.length) onSelectMonth(months[elements[0].index]);
                        },
                        plugins: {
                            legend: {
                                display: hasBudget,
                                labels: { color: t.text, boxWidth: 12, usePointStyle: true },
                            },
                            tooltip: {
                                callbacks: {
                                    title: (items) => monthLabel(months[items[0].dataIndex]),
                                    label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}`,
                                    afterBody: (items) => {
                                        const i = items[0].dataIndex;
                                        const b = budgets[i];
                                        if (!b) return "";
                                        const diff = b - expenses[i];
                                        return diff >= 0
                                            ? `คงเหลือ ${formatMoney(diff)}`
                                            : `⛔ เกินงบ ${formatMoney(-diff)}`;
                                    },
                                },
                            },
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: t.text } },
                            y: {
                                beginAtZero: true,
                                grid: { color: t.grid },
                                border: { display: false },
                                ticks: {
                                    color: t.text,
                                    maxTicksLimit: 5,
                                    callback: (v) => Number(v).toLocaleString("th-TH"),
                                },
                            },
                        },
                    }}
                />
            </div>
            <small className="text-body-secondary">แตะที่แท่งกราฟเพื่อดูเดือนนั้น</small>
        </div>
    );
}
