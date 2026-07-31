/* ============ 目标模板库 ============ */
/* type: quantitative 量化 / habit 习惯 / milestone 里程碑 */
window.GOAL_TEMPLATES = [
  { emoji: '📚', name: '一年读24本书', cat: '学习', type: 'quantitative',
    desc: '每月2本，每两周1本', target: 24, unit: '本', days: 365,
    milestones: [{ title: '读完6本', days: 90 }, { title: '读完12本', days: 180 }, { title: '读完18本', days: 270 }] },
  { emoji: '💪', name: '减重10斤', cat: '健康', type: 'quantitative',
    desc: '健康饮食+每周运动3次', target: 10, unit: '斤', days: 180,
    milestones: [{ title: '减重3斤', days: 54 }, { title: '减重5斤', days: 90 }, { title: '减重7.5斤', days: 135 }] },
  { emoji: '💰', name: '攒2万块', cat: '财务', type: 'quantitative',
    desc: '记账+每月固定储蓄', target: 20000, unit: '元', days: 365,
    milestones: [{ title: '攒5000', days: 90 }, { title: '攒1万', days: 180 }, { title: '攒1.5万', days: 270 }] },
  { emoji: '🏃', name: '每周运动3次', cat: '健康', type: 'habit',
    desc: '跑步/健身/球类均可', unit: '次/周', days: 90 },
  { emoji: '📖', name: '每天背20个单词', cat: '学习', type: 'habit',
    desc: '早晚各10个', unit: '个/天', days: 365 },
  { emoji: '😴', name: '每天23点前睡觉', cat: '生活', type: 'habit',
    desc: '睡前1小时不碰手机', unit: '', days: 90 },
  { emoji: '🧘', name: '每天冥想10分钟', cat: '健康', type: 'habit',
    desc: '专注呼吸，放空大脑', unit: '分钟', days: 90 },
  { emoji: '💼', name: '每天学习1小时', cat: '工作', type: 'habit',
    desc: '读书/课程/技能练习', unit: '小时', days: 365 },
  { emoji: '🏆', name: '考过日语N2', cat: '学习', type: 'milestone',
    desc: '系统学习+真题练习', days: 300,
    milestones: [{ title: '学完初级教材', days: 100 }, { title: '学完中级教材', days: 200 }, { title: '真题模拟通过', days: 280 }] },
  { emoji: '🎸', name: '学会弹一首曲子', cat: '生活', type: 'milestone',
    desc: '从零开始学吉他', days: 180,
    milestones: [{ title: '掌握基础和弦', days: 60 }, { title: '能弹简单旋律', days: 120 }] },
  { emoji: '✍️', name: '坚持写日记', cat: '生活', type: 'habit',
    desc: '记录每天三件小事', unit: '', days: 100 },
  { emoji: '🌱', name: '每天喝水1.5L', cat: '健康', type: 'habit',
    desc: '随身带水杯', unit: 'L', days: 60 }
];

window.GOAL_CATEGORIES = ['学习', '健康', '财务', '工作', '生活'];
