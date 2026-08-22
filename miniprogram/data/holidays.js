// data/holidays.js —— 内置节假日/调休数据（2024–2027）
// 与 Web 版 src/data/holidays.ts 数据一致。
// ⚠️ 2027 为预估数据，官方发布后请更新。

/** 生成闭区间 [startKey, endKey] 内的所有日期（'YYYY-MM-DD'）。 */
function dateRange(startKey, endKey) {
  const start = parse(startKey);
  const end = parse(endKey);
  const result = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    result.push(fmt(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
function parse(key) {
  const p = String(key).split('-').map(Number);
  return new Date(p[0] || 0, (p[1] || 1) - 1, p[2] || 1);
}
function fmt(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const holidays2024 = {
  year: 2024,
  holidays: [
    '2024-01-01',
    ...dateRange('2024-02-10', '2024-02-17'),
    ...dateRange('2024-04-04', '2024-04-06'),
    ...dateRange('2024-05-01', '2024-05-05'),
    '2024-06-10',
    ...dateRange('2024-09-15', '2024-09-17'),
    ...dateRange('2024-10-01', '2024-10-07'),
  ],
  makeupWorkdays: [
    '2024-02-04', '2024-02-18', '2024-04-07', '2024-04-28',
    '2024-05-11', '2024-09-14', '2024-09-29', '2024-10-12',
  ],
};

const holidays2025 = {
  year: 2025,
  holidays: [
    '2025-01-01',
    ...dateRange('2025-01-28', '2025-02-04'),
    ...dateRange('2025-04-04', '2025-04-06'),
    ...dateRange('2025-05-01', '2025-05-05'),
    ...dateRange('2025-05-31', '2025-06-02'),
    ...dateRange('2025-10-01', '2025-10-08'),
  ],
  makeupWorkdays: [
    '2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11',
  ],
};

const holidays2026 = {
  year: 2026,
  holidays: [
    ...dateRange('2026-01-01', '2026-01-03'),
    ...dateRange('2026-02-15', '2026-02-23'),
    ...dateRange('2026-04-04', '2026-04-06'),
    ...dateRange('2026-05-01', '2026-05-05'),
    ...dateRange('2026-06-19', '2026-06-21'),
    ...dateRange('2026-09-25', '2026-09-27'),
    ...dateRange('2026-10-01', '2026-10-07'),
  ],
  makeupWorkdays: [
    '2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10',
  ],
};

// ⚠️ 预估数据
const holidays2027 = {
  year: 2027,
  holidays: [
    '2027-01-01',
    ...dateRange('2027-02-06', '2027-02-13'),
    ...dateRange('2027-04-03', '2027-04-05'),
    ...dateRange('2027-05-01', '2027-05-05'),
    ...dateRange('2027-06-09', '2027-06-11'),
    ...dateRange('2027-09-15', '2027-09-17'),
    ...dateRange('2027-10-01', '2027-10-07'),
  ],
  makeupWorkdays: [
    '2027-01-31', '2027-02-14', '2027-04-25', '2027-05-08',
    '2027-06-12', '2027-09-18', '2027-09-26', '2027-10-09',
  ],
};

/** 内置节假日数据（2024–2027），按年份升序。 */
const defaultHolidayData = [holidays2024, holidays2025, holidays2026, holidays2027];

module.exports = { defaultHolidayData };
