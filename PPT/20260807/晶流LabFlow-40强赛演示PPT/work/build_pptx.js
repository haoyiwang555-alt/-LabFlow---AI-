const PptxGenJS = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────
// Style Card: Simple Dark
// ─────────────────────────────────────────────────────────────
const C = {
  canvas: "0A0A0F",      // 深墨灰背景
  ink: "FAFAFA",         // 米白正文
  accent: "F59E0B",      // 琥珀金强调
  support: "71717A",     // 锌灰辅助
  card: "1A1A24",        // 卡片背景
  cardBorder: "2A2A36",  // 卡片边框
};

const FONT = "微软雅黑";
const FONT_SIZE = {
  hero: 48,
  h1: 36,
  h2: 24,
  h3: 18,
  body: 16,
  small: 14,
  label: 12,
};

const RADIUS = 0.17; // 12pt in inches

// ─────────────────────────────────────────────────────────────
// Helper: 安全添加图片（检查文件存在）
// ─────────────────────────────────────────────────────────────
function safeAddImage(slide, imgPath, x, y, w, h) {
  const fullPath = path.join(__dirname, imgPath);
  if (fs.existsSync(fullPath)) {
    slide.addImage({ path: fullPath, x, y, w, h });
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Helper: 添加卡片容器
// ─────────────────────────────────────────────────────────────
function addCard(slide, x, y, w, h) {
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: C.card },
    line: { color: C.cardBorder, width: 1 },
    rectRadius: RADIUS,
  });
}

// ─────────────────────────────────────────────────────────────
// Helper: 添加要点（带竖线装饰）
// ─────────────────────────────────────────────────────────────
function addBullet(slide, text, x, y, w) {
  // 竖线装饰
  slide.addShape("line", {
    x: x,
    y: y + 0.1,
    w: 0,
    h: 0.5,
    line: { color: C.accent, width: 2 },
  });
  // 文本
  slide.addText(text, {
    x: x + 0.15,
    y,
    w: w - 0.15,
    h: 0.7,
    fontSize: FONT_SIZE.body,
    color: C.ink,
    font: FONT,
    valign: "top",
  });
}

// ─────────────────────────────────────────────────────────────
// Initialize Presentation
// ─────────────────────────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AI先锋未来人才大赛";
pptx.title = "晶流 LabFlow · AI实验研发加速器";

// ─────────────────────────────────────────────────────────────
// P01: 封面页
// ─────────────────────────────────────────────────────────────
let slide01 = pptx.addSlide();
slide01.background = { color: C.canvas };

// 背景图片
safeAddImage(slide01, "../visual/vis_20260807_170701_993ea2c9/现代化智能实验室_科研人员_高通量实验设备_暗调科技氛围.png", 0, 0, 13.33, 7.5);

// 半透明遮罩
slide01.addShape("rect", {
  x: 0, y: 0, w: 13.33, h: 7.5,
  fill: { color: "000000", transparency: 40 },
});

// 主标题
slide01.addText("晶流 LabFlow", {
  x: 1, y: 2.5, w: 11, h: 1.2,
  fontSize: 72,
  font: FONT,
  color: C.ink,
  bold: true,
  align: "center",
});

// 副标题
slide01.addText("AI实验研发加速器", {
  x: 1, y: 3.8, w: 11, h: 0.8,
  fontSize: 36,
  font: FONT,
  color: C.accent,
  align: "center",
});

// 核心主张
slide01.addText("让每一次实验，都成为下一次发现的起点", {
  x: 1, y: 5.2, w: 11, h: 0.6,
  fontSize: 20,
  font: FONT,
  color: C.support,
  align: "center",
  italic: true,
});

// 底部信息
slide01.addText("2026 AI先锋未来人才大赛 · 晶泰科技命题", {
  x: 0, y: 6.8, w: 13.33, h: 0.4,
  fontSize: FONT_SIZE.label,
  font: FONT,
  color: C.support,
  align: "center",
});

// ─────────────────────────────────────────────────────────────
// P02: 目录页
// ─────────────────────────────────────────────────────────────
let slide02 = pptx.addSlide();
slide02.background = { color: C.canvas };

slide02.addText("目录", {
  x: 1, y: 0.5, w: 11, h: 1,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

const tocItems = [
  { num: "01", title: "痛点分析", desc: "研发团队的四大困境" },
  { num: "02", title: "解决方案", desc: "全链路闭环设计" },
  { num: "03", title: "技术架构", desc: "AI引擎与知识图谱" },
  { num: "04", title: "风险管理", desc: "主动预警机制" },
  { num: "05", title: "业务价值", desc: "量化收益与扩展路径" },
  { num: "06", title: "团队介绍", desc: "分工与愿景" },
];

tocItems.forEach((item, i) => {
  const yPos = 1.8 + i * 0.85;
  addCard(slide02, 1.5, yPos, 10, 0.7);
  
  slide02.addText(item.num, {
    x: 1.8, y: yPos + 0.1, w: 0.6, h: 0.5,
    fontSize: FONT_SIZE.h2,
    font: FONT,
    color: C.accent,
    bold: true,
  });
  
  slide02.addText(item.title, {
    x: 2.5, y: yPos + 0.1, w: 3, h: 0.5,
    fontSize: FONT_SIZE.h3,
    font: FONT,
    color: C.ink,
    bold: true,
    valign: "middle",
  });
  
  slide02.addText(item.desc, {
    x: 5.8, y: yPos + 0.1, w: 5, h: 0.5,
    fontSize: FONT_SIZE.body,
    font: FONT,
    color: C.support,
    valign: "middle",
  });
});

// ─────────────────────────────────────────────────────────────
// P03: 痛点分析（卡片网格2×2）
// ─────────────────────────────────────────────────────────────
let slide03 = pptx.addSlide();
slide03.background = { color: C.canvas };

slide03.addText("研发团队的四大痛点", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

const painPoints = [
  { icon: "💬", title: "信息孤岛", desc: "实验参数、会议讨论、文献资料分散在多个系统，难以关联追溯" },
  { icon: "🔗", title: "经验断层", desc: "前辈的试错经验留在口头或邮件，新人无法复用历史教训" },
  { icon: "⚠️", title: "风险滞后", desc: "问题在实验失败后才被发现，缺乏主动预警机制" },
  { icon: "📊", title: "决策盲区", desc: "参数选择依赖直觉，缺少数据驱动的科学依据" },
];

painPoints.forEach((point, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const xPos = 1 + col * 5.8;
  const yPos = 1.8 + row * 2.6;
  
  addCard(slide03, xPos, yPos, 5.4, 2.2);
  
  slide03.addText(point.icon, {
    x: xPos + 0.3, y: yPos + 0.3, w: 0.6, h: 0.6,
    fontSize: 36,
    font: FONT,
    align: "center",
    valign: "middle",
  });
  
  slide03.addText(point.title, {
    x: xPos + 1.1, y: yPos + 0.3, w: 3.8, h: 0.5,
    fontSize: FONT_SIZE.h3,
    font: FONT,
    color: C.accent,
    bold: true,
    valign: "middle",
  });
  
  slide03.addText(point.desc, {
    x: xPos + 0.3, y: yPos + 1.1, w: 4.8, h: 0.9,
    fontSize: FONT_SIZE.body,
    font: FONT,
    color: C.ink,
    valign: "top",
  });
});

// ─────────────────────────────────────────────────────────────
// P04: 解决方案（左文右图）
// ─────────────────────────────────────────────────────────────
let slide04 = pptx.addSlide();
slide04.background = { color: C.canvas };

slide04.addText("晶流：从会议到知识的全链路闭环", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

// 左侧文字
const solutionSteps = [
  "会议实时解析：飞书妙记自动转录，AI提取关键信息",
  "结构化沉淀：参数、决策、风险自动分类归档",
  "知识图谱构建：实验与结论的关系网络可视化",
  "主动风险预警：新实验自动匹配历史失败案例",
];

solutionSteps.forEach((step, i) => {
  const yPos = 1.8 + i * 1.2;
  addBullet(slide04, step, 1, yPos, 5.5);
});

// 右侧配图
safeAddImage(slide04, "../visual/vis_20260807_170701_1ac5b29a/研发团队会议讨论_白板笔记_信息散落_混乱办公场景.jpg", 7, 2, 5.33, 3.5);

// ─────────────────────────────────────────────────────────────
// P05: AI引擎（左图右文）
// ─────────────────────────────────────────────────────────────
let slide05 = pptx.addSlide();
slide05.background = { color: C.canvas };

slide05.addText("AI会议分析引擎", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

// 左侧配图
safeAddImage(slide05, "../visual/vis_20260807_170701_1ac5b29a/研发团队会议讨论_白板笔记_信息散落_混乱办公场景_2.jpg", 1, 2, 5.33, 3.5);

// 右侧文字
const engineFeatures = [
  "SSE流式解析：实时展示AI分析过程，增强信任感",
  "多Agent协同：解析Agent + 质检Agent + 关联Agent",
  "置信度标注：每条结论附带可信度评分",
  "证据溯源：结论与原文时间戳精确关联",
];

engineFeatures.forEach((feature, i) => {
  const yPos = 1.8 + i * 1.2;
  addBullet(slide05, feature, 7, yPos, 5.5);
});

// ─────────────────────────────────────────────────────────────
// P06: 知识图谱（左文右图）
// ─────────────────────────────────────────────────────────────
let slide06 = pptx.addSlide();
slide06.background = { color: C.canvas };

slide06.addText("动态知识图谱可视化", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

// 左侧文字
const graphFeatures = [
  "力导向布局：节点自动排列，避免重叠",
  "实时交互：拖拽、缩放、悬停高亮",
  "多维关联：实验-参数-结论-风险的完整网络",
  "语义搜索：自然语言查询相关实验经验",
];

graphFeatures.forEach((feature, i) => {
  const yPos = 1.8 + i * 1.2;
  addBullet(slide06, feature, 1, yPos, 5.5);
});

// 右侧配图
safeAddImage(slide06, "../visual/vis_20260807_170701_1ac5b29a/研发团队会议讨论_白板笔记_信息散落_混乱办公场景_3.jpg", 7, 2, 5.33, 3.5);

// ─────────────────────────────────────────────────────────────
// P07: 风险守门员（双栏对比）
// ─────────────────────────────────────────────────────────────
let slide07 = pptx.addSlide();
slide07.background = { color: C.canvas };

slide07.addText("风险守门员：主动预警而非被动救火", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

// 左栏：传统方式
addCard(slide07, 1, 1.8, 5.4, 5);

slide07.addText("传统方式", {
  x: 1.3, y: 2, w: 4.8, h: 0.6,
  fontSize: FONT_SIZE.h2,
  font: FONT,
  color: C.support,
  bold: true,
});

const traditionalIssues = [
  "问题在实验失败后才暴露",
  "依赖人工翻阅历史记录",
  "风险判断主观且滞后",
  "经验教训无法系统化",
];

traditionalIssues.forEach((issue, i) => {
  const yPos = 2.8 + i * 1;
  slide07.addText("✗ " + issue, {
    x: 1.5, y: yPos, w: 4.6, h: 0.8,
    fontSize: FONT_SIZE.body,
    font: FONT,
    color: C.ink,
    valign: "top",
  });
});

// 右栏：晶流方式
addCard(slide07, 7, 1.8, 5.4, 5);

slide07.addText("晶流方式", {
  x: 7.3, y: 2, w: 4.8, h: 0.6,
  fontSize: FONT_SIZE.h2,
  font: FONT,
  color: C.accent,
  bold: true,
});

const labflowAdvantages = [
  "新实验自动匹配历史失败案例",
  "P0-P3风险分级实时推送",
  "AI建议 + 人工确认双重保障",
  "风险处理结果沉淀为团队知识",
];

labflowAdvantages.forEach((adv, i) => {
  const yPos = 2.8 + i * 1;
  slide07.addText("✓ " + adv, {
    x: 7.5, y: yPos, w: 4.6, h: 0.8,
    fontSize: FONT_SIZE.body,
    font: FONT,
    color: C.ink,
    valign: "top",
  });
});

// ─────────────────────────────────────────────────────────────
// P08: 业务价值（大数字+说明）
// ─────────────────────────────────────────────────────────────
let slide08 = pptx.addSlide();
slide08.background = { color: C.canvas };

slide08.addText("量化业务价值", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

const metrics = [
  { value: "24h", label: "知识SLA", desc: "实验经验沉淀为可检索知识的时间" },
  { value: "-30%", label: "重复讨论", desc: "减少因信息不对称导致的重复沟通" },
  { value: "-50%", label: "重复失败", desc: "通过风险预警避免踩同样的坑" },
  { value: "60%+", label: "决策准确率", desc: "数据驱动的参数选择与方案评审" },
];

metrics.forEach((metric, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const xPos = 1 + col * 5.8;
  const yPos = 1.8 + row * 2.6;
  
  addCard(slide08, xPos, yPos, 5.4, 2.2);
  
  slide08.addText(metric.value, {
    x: xPos + 0.3, y: yPos + 0.3, w: 2.5, h: 1.2,
    fontSize: 56,
    font: FONT,
    color: C.accent,
    bold: true,
    align: "center",
  });
  
  slide08.addText(metric.label, {
    x: xPos + 2.8, y: yPos + 0.3, w: 2.3, h: 0.6,
    fontSize: FONT_SIZE.h3,
    font: FONT,
    color: C.ink,
    bold: true,
    valign: "middle",
  });
  
  slide08.addText(metric.desc, {
    x: xPos + 2.8, y: yPos + 1, w: 2.3, h: 0.9,
    fontSize: FONT_SIZE.small,
    font: FONT,
    color: C.support,
    valign: "top",
  });
});

// ─────────────────────────────────────────────────────────────
// P09: 扩展路径（时间轴）
// ─────────────────────────────────────────────────────────────
let slide09 = pptx.addSlide();
slide09.background = { color: C.canvas };

slide09.addText("行业泛化与规模化路径", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

const timeline = [
  { phase: "Phase 1", title: "生物医药", desc: "验证晶泰科技命题场景" },
  { phase: "Phase 2", title: "化工材料", desc: "扩展至相似研发密集型行业" },
  { phase: "Phase 3", title: "制造业通用", desc: "抽象为研发知识管理平台" },
  { phase: "Phase 4", title: "企业级SaaS", desc: "产品化与商业化" },
];

// 时间轴线
slide09.addShape("line", {
  x: 1.5, y: 3.5, w: 10.33, h: 0,
  line: { color: C.support, width: 2 },
});

timeline.forEach((item, i) => {
  const xPos = 1.5 + i * 2.8;
  
  // 节点圆点
  slide09.addShape("oval", {
    x: xPos + 0.35, y: 3.3, w: 0.3, h: 0.3,
    fill: { color: C.accent },
  });
  
  // 阶段标签
  slide09.addText(item.phase, {
    x: xPos, y: 2.5, w: 1, h: 0.5,
    fontSize: FONT_SIZE.small,
    font: FONT,
    color: C.accent,
    bold: true,
    align: "center",
  });
  
  // 卡片
  addCard(slide09, xPos - 0.2, 4, 2.4, 2.5);
  
  slide09.addText(item.title, {
    x: xPos, y: 4.2, w: 2, h: 0.5,
    fontSize: FONT_SIZE.h3,
    font: FONT,
    color: C.ink,
    bold: true,
    align: "center",
  });
  
  slide09.addText(item.desc, {
    x: xPos, y: 4.8, w: 2, h: 1.2,
    fontSize: FONT_SIZE.small,
    font: FONT,
    color: C.support,
    align: "center",
    valign: "top",
  });
});

// ─────────────────────────────────────────────────────────────
// P10: 团队介绍（图标行2项）
// ─────────────────────────────────────────────────────────────
let slide10 = pptx.addSlide();
slide10.background = { color: C.canvas };

slide10.addText("团队与分工", {
  x: 1, y: 0.5, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h1,
  font: FONT,
  color: C.ink,
  bold: true,
});

// 成员1
addCard(slide10, 2, 2, 4.5, 4.5);

slide10.addText("👨‍💻", {
  x: 3.5, y: 2.3, w: 1.5, h: 1,
  fontSize: 48,
  font: FONT,
  align: "center",
});

slide10.addText("王浩毅", {
  x: 2.3, y: 3.4, w: 3.9, h: 0.6,
  fontSize: FONT_SIZE.h2,
  font: FONT,
  color: C.accent,
  bold: true,
  align: "center",
});

slide10.addText("技术负责人", {
  x: 2.3, y: 4, w: 3.9, h: 0.5,
  fontSize: FONT_SIZE.body,
  font: FONT,
  color: C.ink,
  align: "center",
});

slide10.addText("全栈开发、AI Agent设计、\n知识图谱架构", {
  x: 2.5, y: 4.6, w: 3.5, h: 1.2,
  fontSize: FONT_SIZE.small,
  font: FONT,
  color: C.support,
  align: "center",
  valign: "top",
});

// 成员2
addCard(slide10, 7, 2, 4.5, 4.5);

slide10.addText("👩‍🔬", {
  x: 8.5, y: 2.3, w: 1.5, h: 1,
  fontSize: 48,
  font: FONT,
  align: "center",
});

slide10.addText("崔永辉", {
  x: 7.3, y: 3.4, w: 3.9, h: 0.6,
  fontSize: FONT_SIZE.h2,
  font: FONT,
  color: C.accent,
  bold: true,
  align: "center",
});

slide10.addText("业务顾问", {
  x: 7.3, y: 4, w: 3.9, h: 0.5,
  fontSize: FONT_SIZE.body,
  font: FONT,
  color: C.ink,
  align: "center",
});

slide10.addText("晶泰科技业务理解、\n场景验证与反馈", {
  x: 7.5, y: 4.6, w: 3.5, h: 1.2,
  fontSize: FONT_SIZE.small,
  font: FONT,
  color: C.support,
  align: "center",
  valign: "top",
});

// ─────────────────────────────────────────────────────────────
// P11: 愿景（居中主视觉）
// ─────────────────────────────────────────────────────────────
let slide11 = pptx.addSlide();
slide11.background = { color: C.canvas };

slide11.addShape("rect", {
  x: 0, y: 0, w: 13.33, h: 7.5,
  fill: { color: C.accent, transparency: 90 },
});

slide11.addText(`\u201c让每一次实验，`, {
  x: 1, y: 2.5, w: 11, h: 1.2,
  fontSize: 48,
  font: FONT,
  color: C.ink,
  bold: true,
  align: "center",
});

slide11.addText(`都成为下一次发现的起点\u201d`, {
  x: 1, y: 3.8, w: 11, h: 1.2,
  fontSize: 48,
  font: FONT,
  color: C.accent,
  bold: true,
  align: "center",
});

slide11.addText("—— 晶流 LabFlow 的愿景", {
  x: 1, y: 5.5, w: 11, h: 0.6,
  fontSize: FONT_SIZE.h3,
  font: FONT,
  color: C.support,
  align: "center",
  italic: true,
});

// ─────────────────────────────────────────────────────────────
// P12: 结尾页（致谢）
// ─────────────────────────────────────────────────────────────
let slide12 = pptx.addSlide();
slide12.background = { color: C.canvas };

slide12.addShape("rect", {
  x: 0, y: 0, w: 13.33, h: 7.5,
  fill: { color: C.accent, transparency: 95 },
});

slide12.addText("感谢聆听", {
  x: 1, y: 2.5, w: 11, h: 1.5,
  fontSize: 72,
  font: FONT,
  color: C.ink,
  bold: true,
  align: "center",
});

slide12.addText("期待与您的深入交流", {
  x: 1, y: 4.2, w: 11, h: 0.8,
  fontSize: FONT_SIZE.h2,
  font: FONT,
  color: C.support,
  align: "center",
});

slide12.addText("2026 AI先锋未来人才大赛 · 晶泰科技命题 · 知识催化剂团队", {
  x: 0, y: 6.5, w: 13.33, h: 0.5,
  fontSize: FONT_SIZE.label,
  font: FONT,
  color: C.support,
  align: "center",
});

// ─────────────────────────────────────────────────────────────
// Save File
// ─────────────────────────────────────────────────────────────
const outputPath = path.join(__dirname, "../晶流LabFlow-40强赛演示.pptx");
pptx.writeFile({ fileName: outputPath })
  .then(() => {
    console.log("✓ 幻灯片已生成: " + outputPath);
  })
  .catch((err) => {
    console.error("✗ 生成失败:", err);
  });
