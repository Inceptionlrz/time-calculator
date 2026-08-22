// utils/format.js —— 结果展示格式化助手

const { formatDate, weekdayName } = require('./dateUtils');

/**
 * 将计算结果转换为页面可渲染的结构。
 * @param {object} result { deadline: Date, detail: {...} }
 * @param {object} meta 附加信息：{ typeLabel, length, directionLabel, includeStartDay }
 */
function formatResult(result, meta) {
  const { deadline, detail } = result;
  return {
    deadlineText: formatDate(deadline),
    deadlineWeekday: weekdayName(deadline),
    typeLabel: meta.typeLabel || '',
    length: meta.length,
    directionLabel: meta.directionLabel || '',
    countedDays: detail.countedDays,
    weekendDays: detail.weekendDays,
    holidayDays: detail.holidayDays,
    makeupWorkdays: detail.makeupWorkdays,
    skippedOffDays: detail.skippedOffDays,
    weekendSample: detail.weekendDateList.slice(0, 5),
    holidaySample: detail.holidayDateList.slice(0, 5),
    makeupSample: detail.makeupDateList.slice(0, 5),
    hasWeekend: detail.weekendDateList.length > 0,
    hasHoliday: detail.holidayDateList.length > 0,
    hasMakeup: detail.makeupDateList.length > 0,
  };
}

/**
 * 今日 'YYYY-MM-DD'（用于日期选择器默认值）。
 */
function todayKey() {
  return formatDate(new Date());
}

module.exports = { formatResult, todayKey, formatDate, weekdayName };
