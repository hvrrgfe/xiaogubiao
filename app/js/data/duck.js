/* ============ 小胖鸭 · 正向激励文案 ============ */
/* 核心原则：只奖励，不惩罚。没有打卡也不扣任何东西。 */
window.DUCK = {
  levels: [
    { id: 'duck', emoji: '🐤', name: '小胖鸭', desc: '默认解锁', need: { type: 'none' } },
    { id: 'star', emoji: '🐤✨', name: '星星鸭', desc: '连续打卡7天', need: { type: 'streak', n: 7 } },
    { id: 'fire', emoji: '🐤🔥', name: '火焰鸭', desc: '连续打卡30天', need: { type: 'streak', n: 30 } },
    { id: 'crown', emoji: '🐤👑', name: '皇冠鸭', desc: '完成1个目标', need: { type: 'goals', n: 1 } },
    { id: 'sakura', emoji: '🐤🌸', name: '樱花鸭', desc: '累计打卡100次', need: { type: 'total', n: 100 } }
  ],

  greetings: [
    '太棒了！今天也做到了！',
    '继续保持！你已经很棒了！',
    '哇，连续打卡第{day}天！',
    '小胖鸭为你鼓掌！👏',
    '今天的你比昨天更厉害！',
    '每一点坚持都算数！'
  ],
  returnMsgs: [
    '欢迎回来！休息一下也很正常，继续加油！',
    '没关系，今天重新开始！送你一朵小红花 🌸',
    '小胖鸭一直在等你呢！',
    '中断不代表失败，回来就是胜利！'
  ],
  milestoneMsgs: [
    '里程碑达成！你太厉害啦！',
    '一步一步，你在靠近终点！',
    '这就是坚持的样子！'
  ],
  goalDoneMsgs: [
    '你做到了！！我为你骄傲！！',
    '目标达成！你是自己的英雄！',
    '从今天起，你有了新的高度！'
  ],
  noPending: [
    '今天所有目标都完成啦，好好休息！',
    '今天的任务清空，小胖鸭给你点赞！',
    '全部打卡完成！去享受你的一天吧！'
  ],
  idleMsgs: [
    '慢慢来，比较快。',
    '目标不怕大，就怕不开始。',
    '每天进步一点点，一年就是一大步。',
    '想做什么就去做，小胖鸭陪你。',
    '今天也记得对自己好一点。'
  ],

  /* 根据场景取文案 */
  pick(arr, ctx) {
    const list = arr.slice();
    return list[Math.floor(Math.random() * list.length)].replace('{day}', ctx && ctx.day != null ? ctx.day : '');
  }
};
