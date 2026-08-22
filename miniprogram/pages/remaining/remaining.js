// pages/remaining/remaining.js
const { computeRemaining } = require('../../utils/calculator');
const { todayKey, weekdayName, formatDate } = require('../../utils/format');
const { parseDateKey, diffInDays } = require('../../utils/dateUtils');
const { regionList, defaultRegionId } = require('../../data/regions');
const app = getApp();

const TYPE_LABELS = { workday: '工作日', calendar: '日历日' };

Page({
  data: {
    startDate: '',
    startWeekday: '',
    deadlineDate: '',
    deadlineWeekday: '',
    type: 'workday',
    regionIndex: 0,
    regionNames: [],
    result: null,
    error: '',
  },

  onLoad() {
    const prefs = (app.globalData && app.globalData.prefs) || {};
    const idx = Math.max(0, regionList.findIndex((r) => r.id === (prefs.region || defaultRegionId)));
    const today = todayKey();
    // 默认截止日设为 30 天后，方便演示
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const dl = formatDate(d);
    this.setData({
      startDate: today,
      startWeekday: weekdayName(new Date()),
      deadlineDate: dl,
      deadlineWeekday: weekdayName(d),
      regionIndex: idx,
      regionNames: regionList.map((r) => r.name),
    });
  },

  onStartChange(e) {
    const d = parseDateKey(e.detail.value);
    this.setData({ startDate: e.detail.value, startWeekday: weekdayName(d) });
  },

  onDeadlineChange(e) {
    const d = parseDateKey(e.detail.value);
    this.setData({ deadlineDate: e.detail.value, deadlineWeekday: weekdayName(d) });
  },

  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  onRegionChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ regionIndex: idx });
    app.savePrefs({ region: regionList[idx].id });
  },

  onCalc() {
    const region = regionList[this.data.regionIndex];
    const start = parseDateKey(this.data.startDate);
    const deadline = parseDateKey(this.data.deadlineDate);
    try {
      const res = computeRemaining(
        {
          start,
          deadline,
          type: this.data.type,
          config: { restDays: region.defaultRestDays },
        },
        region.data,
      );
      const span = Math.abs(diffInDays(start, deadline));
      this.setData({
        result: {
          countedDays: res.detail.countedDays,
          typeLabel: TYPE_LABELS[this.data.type],
          weekendDays: res.detail.weekendDays,
          holidayDays: res.detail.holidayDays,
          makeupWorkdays: res.detail.makeupWorkdays,
          skippedOffDays: res.detail.skippedOffDays,
          spanText: `起 ${this.data.startDate} → 止 ${this.data.deadlineDate}（跨度 ${span} 天）`,
        },
        error: '',
      });
    } catch (err) {
      this.setData({ error: err.message || '计算出错', result: null });
    }
  },

  onShareAppMessage() {
    const r = this.data.result;
    const title = r
      ? `间隔：${r.countedDays} 个${r.typeLabel}`
      : '时间计算器 - 快速算间隔天数';
    return { title, path: '/pages/remaining/remaining' };
  },
});
