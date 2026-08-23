// app.js —— 小程序全局逻辑
App({
  globalData: {
    prefs: {},
  },

  onLaunch() {
    // 启动时从本地存储恢复用户偏好（地区、是否含起点等）
    try {
      const saved = wx.getStorageSync('tc_prefs');
      if (saved && typeof saved === 'object') {
        this.globalData.prefs = saved;
      }
    } catch (e) {
      // 忽略读取异常，使用默认偏好
    }
  },

  // 合并并持久化用户偏好
  savePrefs(patch) {
    const merged = Object.assign({}, this.globalData.prefs, patch);
    this.globalData.prefs = merged;
    try {
      wx.setStorageSync('tc_prefs', merged);
    } catch (e) {
      // 忽略写入异常
    }
  },
});
