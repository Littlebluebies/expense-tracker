import { dueDate, dueMonths } from "./useRecurring";
import { toInputDate } from "./format";

const item = (over) => ({ day: 5, startMonth: "2026-10", lastPosted: null, ...over });

test("ยังไม่ถึงวันที่กำหนดในเดือนนี้ -> ยังไม่ลง", () => {
  expect(dueMonths(item({ day: 25 }), new Date(2026, 9, 2))).toEqual([]);
});

test("ถึงวันที่แล้ว -> ลงเดือนนี้", () => {
  expect(dueMonths(item({ day: 1 }), new Date(2026, 9, 2))).toEqual(["2026-10"]);
});

test("ไม่ได้เปิดแอปหลายเดือน -> ลงย้อนหลังให้ครบ", () => {
  const months = dueMonths(item({ startMonth: "2026-07", lastPosted: "2026-07" }), new Date(2026, 9, 10));
  expect(months).toEqual(["2026-08", "2026-09", "2026-10"]);
});

test("ลงย้อนหลังไม่เกิน 12 เดือน", () => {
  const months = dueMonths(item({ startMonth: "2020-01" }), new Date(2026, 9, 10));
  expect(months).toHaveLength(12);
  expect(months[0]).toBe("2025-11");
});

test("ลงแล้วเดือนนี้ -> ไม่ลงซ้ำ", () => {
  expect(dueMonths(item({ lastPosted: "2026-10" }), new Date(2026, 9, 20))).toEqual([]);
});

test("วันที่ 31 ในเดือนกุมภา -> ลงวันสุดท้ายของเดือน", () => {
  expect(toInputDate(dueDate(item({ day: 31 }), "2027-02"))).toBe("2027-02-28");
  expect(dueMonths(item({ day: 31, startMonth: "2027-02" }), new Date(2027, 1, 28))).toEqual(["2027-02"]);
});
