import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useBudgets, useTransactions } from "../utils/useFinanceData";
import { useRecurring } from "../utils/useRecurring";
import { useTheme } from "../utils/theme";
import { frequentItems } from "../utils/insights";
import { formatMoney, monthKey, monthLabel, shiftMonth } from "../utils/format";
import BudgetCard from "../components/BudgetCard";
import MonthCompareCard from "../components/MonthCompareCard";
import CategoryBudgetCard from "../components/CategoryBudgetCard";
import RecurringCard from "../components/RecurringCard";
import TransactionForm from "../components/TransactionForm";
import TransactionList from "../components/TransactionList";
import { CategoryChart, MonthlyChart } from "../components/Charts";

function useOnline() {
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);
    return online;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [theme, toggleTheme] = useTheme();

    const notify = useToast();

    const { transactions, loading, error } = useTransactions(user.uid);
    const { items: recurringItems } = useRecurring(user.uid, transactions, !loading, notify);
    const online = useOnline();

    const { budgets, budgetFor } = useBudgets(user.uid);

    const currentMonth = monthKey(new Date());
    const [month, setMonth] = useState(currentMonth);
    const [editing, setEditing] = useState(null);

    const monthTx = useMemo(
        () => transactions.filter((t) => t.monthKey === month),
        [transactions, month]
    );

    const { income, expense, categoryTotals, topCategory } = useMemo(() => {
        let income = 0;
        let expense = 0;
        const categoryTotals = {};
        monthTx.forEach((t) => {
            if (t.type === "income") {
                income += t.amount;
            } else {
                expense += t.amount;
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });
        const topCategory = Object.keys(categoryTotals).sort(
            (a, b) => categoryTotals[b] - categoryTotals[a]
        )[0];
        return { income, expense, categoryTotals, topCategory };
    }, [monthTx]);

    const quickItems = useMemo(() => frequentItems(transactions), [transactions]);

    const budget = budgetFor(month);
    const isCustomBudget =
        budgets.monthly[month] !== undefined && budgets.monthly[month] !== null;

    const startEdit = (t) => {
        setEditing(t);
        document
            .getElementById("transaction-form")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // หลังบันทึก: ถ้ารายการอยู่คนละเดือน ให้สลับไปเดือนนั้น
    const handleFormDone = (savedDate) => {
        setEditing(null);
        if (savedDate) setMonth(monthKey(savedDate));
    };

    const changeMonth = (key) => {
        setEditing(null);
        setMonth(key);
    };

    return (
        <div className="app-bg min-vh-100">
            <div className="app-container py-3">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="min-w-0">
                        <div className="fw-semibold text-truncate">
                            สวัสดี, {user.displayName || user.email}
                        </div>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={toggleTheme}
                            aria-label="สลับธีม"
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <Link
                            to="/settings"
                            className="btn btn-sm btn-outline-secondary"
                            aria-label="ตั้งค่าบัญชี"
                            title="ตั้งค่าบัญชี"
                        >
                            ⚙️
                        </Link>
                    </div>
                </div>

                {/* เลือกเดือน */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => changeMonth(shiftMonth(month, -1))}
                        aria-label="เดือนก่อนหน้า"
                    >
                        ‹
                    </button>
                    <div className="text-center">
                        <div className="fw-bold fs-5">{monthLabel(month)}</div>
                        {month !== currentMonth && (
                            <button
                                className="btn btn-link btn-sm p-0"
                                onClick={() => changeMonth(currentMonth)}
                            >
                                กลับไปเดือนปัจจุบัน
                            </button>
                        )}
                    </div>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => changeMonth(shiftMonth(month, 1))}
                        disabled={month >= currentMonth}
                        aria-label="เดือนถัดไป"
                    >
                        ›
                    </button>
                </div>

                {!online && (
                    <div className="alert alert-warning small py-2">
                        📴 ออฟไลน์อยู่ — จดรายการได้ตามปกติ ข้อมูลจะซิงค์เมื่อกลับมาออนไลน์
                    </div>
                )}

                {!user.emailVerified && (
                    <div className="alert alert-info small py-2">
                        📧 ยังไม่ได้ยืนยันอีเมล — <Link to="/settings">ยืนยันที่หน้าตั้งค่า</Link>{" "}
                        (ช่วยให้กู้รหัสผ่านได้แน่นอน)
                    </div>
                )}

                {error && <div className="alert alert-danger small">{error}</div>}

                {/* สรุปยอดเดือน */}
                <div className="wallet-card p-4 mb-3 text-white">
                    <small className="opacity-75">คงเหลือเดือนนี้ (รายรับ − รายจ่าย)</small>
                    <h2 className="fw-bold my-1">
                        {loading ? "…" : formatMoney(income - expense)}
                    </h2>
                    <div className="d-flex justify-content-between mt-2 small">
                        <span>⬆️ รายรับ {formatMoney(income)}</span>
                        <span>⬇️ รายจ่าย {formatMoney(expense)}</span>
                    </div>
                </div>

                <MonthCompareCard transactions={transactions} month={month} />

                <BudgetCard
                    key={month}
                    uid={user.uid}
                    month={month}
                    budget={budget}
                    isCustom={isCustomBudget}
                    expense={expense}
                    topCategory={topCategory}
                    notify={notify}
                />

                <TransactionForm
                    uid={user.uid}
                    editing={editing}
                    onDone={handleFormDone}
                    notify={notify}
                    quickItems={quickItems}
                />

                <CategoryBudgetCard
                    uid={user.uid}
                    limits={budgets.categories}
                    spent={categoryTotals}
                    monthBudget={budget}
                    notify={notify}
                />

                <RecurringCard uid={user.uid} items={recurringItems} notify={notify} />

                <CategoryChart totals={categoryTotals} mode={theme} />

                <MonthlyChart
                    transactions={transactions}
                    month={month}
                    budgetFor={budgetFor}
                    mode={theme}
                    onSelectMonth={changeMonth}
                />

                <TransactionList
                    transactions={monthTx}
                    month={month}
                    editingId={editing?.id}
                    onEdit={startEdit}
                    notify={notify}
                />
            </div>
        </div>
    );
}
