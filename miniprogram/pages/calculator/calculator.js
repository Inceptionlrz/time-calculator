// pages/calculator/calculator.js
const { computeDeadline } = require('../../utils/calculator');
const { formatResult, todayKey, weekdayName, formatDate } = require('../../utils/format');
const { parseDateKey } = require('../../utils/dateUtils');
const { regions, regionList, defaultRegionId } = require('../../data/regions');
const app = getApp();

const TYPE_LABELS = { workday: '工作日', calendar: '日历日', natural: '自然日' };
const DIR_LABELS = { forward: '向后', backward: '向前' };

Page({
  data: {
    startDate: '',
    startWeekday: '',
    length: '10',
    type: 'workday',
    direction: 'forward',
    includeStartDay: true,
    regionIndex: 0,
    regionNames: [],
    result: null,
    error: '',
  },

  onLoad() {
    const prefs = (app.globalData && app.globalData.prefs) || {};
    const idx = Math.max(
      0,
      regionList.findIndex((r) => r.id === (prefs.region || defaultRegionId)),
    );
    const today = todayKey();
    this.setData({
      startDate: today,
      startWeekday: weekdayName(new Date()),
      regionIndex: idx,
      regionNames: regionList.map((r) => r.name),
      includeStartDay: prefs.includeStartDay !== false,
    });
  },

  onStartChange(e) {
    const d = parseDateKey(e.detail.value);
    this.setData({ startDate: e.detail.value, startWeekday: weekdayName(d) });
  },

  onLengthInput(e) {
    this.setData({ length: e.detail.value });
  },

  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  onDirTap(e) {
    this.setData({ direction: e.currentTarget.dataset.dir });
  },

  onIncludeChange(e) {
    this.setData({ includeStartDay: e.detail.value });
    app.savePrefs({ includeStartDay: e.detail.value });
  },

  onRegionChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ regionIndex: idx });
    app.savePrefs({ region: regionList[idx].id });
  },

  onCalc() {
    const len = parseInt(this.data.length, 10);
    if (!Number.isInteger(len) || len <= 0) {
      this.setData({ error: '期限长度必须为正整数', result: null });
      return;
    }
    const region = regionList[this.data.regionIndex];
    const start = parseDateKey(this.data.startDate);
    try {
      const res = computeDeadline(
        {
          start,
          type: this.data.type,
          length: len,
          direction: this.data.direction,
          includeStartDay: this.data.includeStartDay,
          config: { restDays: region.defaultRestDays },
        },
        region.data,
      );
      const formatted = formatResult(res, {
        typeLabel: TYPE_LABELS[this.data.type],
        length: len,
        directionLabel: DIR_LABELS[this.data.direction],
      });
      formatted.weekendSampleText = formatted.weekendSample.join('、') || '无';
      formatted.holidaySampleText = formatted.holidaySample.join('、') || '无';
      formatted.makeupSampleText = formatted.makeupSample.join('、') || '无';
      this.setData({ result: formatted, error: '' });
    } catch (err) {
      this.setData({ error: err.message || '计算出错', result: null });
    }
  },

  onShareAppMessage() {
    const r = this.data.result;
    const title = r
      ? `截止日：${r.deadlineText}（${r.deadlineWeekday}）`
      : '时间计算器 - 快速算工作日/截止日';
    return { title, path: '/pages/calculator/calculator' };
  },
});
