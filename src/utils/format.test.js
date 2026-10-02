import { daysInMonth, fromInputDate, monthKey, shiftMonth, toDate, toInputDate } from "./format";

test("monthKey / shiftMonth ข้ามปีได้ถูกต้อง", () => {
  expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2025-12", 1)).toBe("2026-01");
});

test("daysInMonth รองรับปีอธิกสุรทิน", () => {
  expect(daysInMonth("2028-02")).toBe(29);
  expect(daysInMonth("2026-02")).toBe(28);
});

test("วันที่จาก input ไม่เลื่อนวันเพราะ timezone", () => {
  expect(toInputDate(fromInputDate("2026-10-31"))).toBe("2026-10-31");
});

test("toDate รับ Firestore Timestamp แบบเก่าได้", () => {
  expect(toDate({ seconds: 0 }).getTime()).toBe(0);
});
