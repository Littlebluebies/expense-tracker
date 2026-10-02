import { compareWithPreviousMonth, frequentItems, percentChange } from "./insights";
import { monthKey } from "./format";

const tx = (y, m, d, amount, category = "food", extra = {}) => {
  const date = new Date(y, m - 1, d, 12);
  return { type: "expense", amount, category, date, monthKey: monthKey(date), ...extra };
};

test("เดือนปัจจุบัน: เทียบเฉพาะช่วงวันเดียวกันของเดือนก่อน", () => {
  const data = [
    tx(2026, 9, 3, 100),
    tx(2026, 9, 25, 5000), // หลังวันที่ 10 ของเดือนก่อน -> ไม่นับ
    tx(2026, 10, 2, 300),
  ];
  const r = compareWithPreviousMonth(data, "2026-10", new Date(2026, 9, 10));
  expect(r.partial).toBe(true);
  expect(r.previous).toBe(100);
  expect(r.current).toBe(300);
  expect(r.diff).toBe(200);
});

test("เดือนที่จบแล้ว: เทียบทั้งเดือน และเรียงหมวดตามส่วนต่างมากสุด", () => {
  const data = [
    tx(2026, 8, 5, 1000, "food"),
    tx(2026, 8, 6, 500, "travel"),
    tx(2026, 9, 5, 1200, "food"),
    tx(2026, 9, 28, 100, "travel"),
  ];
  const r = compareWithPreviousMonth(data, "2026-09", new Date(2026, 9, 10));
  expect(r.partial).toBe(false);
  expect(r.changes.map((c) => c.key)).toEqual(["travel", "food"]);
  expect(r.changes[0].diff).toBe(-400);
});

test("percentChange", () => {
  expect(percentChange(123, 100)).toBe(23);
  expect(percentChange(50, 0)).toBeNull();
});

test("frequentItems: เอาเฉพาะที่จดซ้ำ ≥ 2 ครั้ง และไม่นับรายการประจำ", () => {
  const today = new Date(2026, 9, 10);
  const data = [
    tx(2026, 10, 1, 60, "food", { note: "กาแฟ" }),
    tx(2026, 10, 2, 60, "food", { note: "กาแฟ" }),
    tx(2026, 10, 3, 60, "food", { note: "กาแฟ" }),
    tx(2026, 10, 4, 45, "travel"),
    tx(2026, 10, 5, 45, "travel"),
    tx(2026, 10, 6, 999, "shopping"),
    tx(2026, 10, 1, 5000, "housing", { recurringId: "r1" }),
    tx(2026, 10, 1, 5000, "housing", { recurringId: "r1" }),
    tx(2026, 6, 1, 60, "food", { note: "เก่าเกิน 60 วัน" }),
    tx(2026, 6, 2, 60, "food", { note: "เก่าเกิน 60 วัน" }),
  ];
  const items = frequentItems(data, today);
  expect(items.map((i) => i.note || i.category)).toEqual(["กาแฟ", "travel"]);
  expect(items[0].count).toBe(3);
});
