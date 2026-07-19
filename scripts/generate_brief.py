# -*- coding: utf-8 -*-
"""晶流 LabFlow · 开题报告补充材料 v2 — 几何科技感 6 页 PDF

设计要点（基于排版共识）：
- 字体：思源黑体 VF (正文，厚重) + 微软雅黑 Bold (粗体配对)，替代 reportlab CID 细宋。
- 字号：正文 10.5pt(留给几何点缀后仍可读) / H2 13 / H1 18 / 页眉页脚 8.5。
- 行距 leading=15.5 (≈×1.48)；页边距 20mm；信息层级靠留白而不靠多色。
- 配色：单一亮青强调色 #2EE6D6 + 深墨蓝 #0E1A2B + 中性灰阶；≤6 色。
- 线宽两档：0.4 分隔 / 0.8 强调；无 emoji、无圆角彩色徽章、无四列等高指标卡。
- 表格修复：表头用深墨蓝+白字（替代黑底）；正文行浅条纹；绝不深底深字。
- 封面：同心环 + 等距网格 + 节点连线网络 + 切角色块，深墨蓝底。
"""
from __future__ import annotations
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, NextPageTemplate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "晶流LabFlow-开题报告补充材料.pdf"
ARCH_PNG = ROOT / "output" / "晶流LabFlow-知识闭环与架构图.png"

FONT = "NotoSansSC"
FONTB = "NotoSansBd"

# ---------- 色板（克制 ≤6） ----------
INK = colors.HexColor("#0E1A2B")      # 深墨蓝
DEEP = colors.HexColor("#16304A")      # 次深
PAPER = colors.HexColor("#F7F9FB")     # 内页浅底
ACCENT = colors.HexColor("#2EE6D6")    # 亮青（单一强调色）
ACCENT_D = colors.HexColor("#10807A")   # 亮青深档
LIME = colors.HexColor("#C6F432")       # 极少使用之亮点
GREY = colors.HexColor("#5B6B7A")        # 中性灰
GREYL = colors.HexColor("#8FA0AC")       # 浅灰
LINE = colors.HexColor("#C7D2DC")        # 分隔线
STRIPE = colors.HexColor("#EDF2F6")       # 表格条纹
INKTX = colors.HexColor("#1E2B3A")       # 正文文字色


def register_fonts():
    pdfmetrics.registerFont(TTFont(FONT, "C:/Windows/Fonts/NotoSansSC-VF.ttf"))
    pdfmetrics.registerFont(TTFont(FONTB, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
    registerFontFamily(FONT, normal=FONT, bold=FONTB, italic=FONT, boldItalic=FONTB)


register_fonts()

PAGE_W, PAGE_H = A4

styles = {
    "h1": ParagraphStyle("h1", fontName=FONTB, fontSize=18, leading=22, textColor=INK, spaceBefore=2, spaceAfter=4),
    "h2": ParagraphStyle("h2", fontName=FONTB, fontSize=13, leading=17, textColor=INK, spaceBefore=8, spaceAfter=4),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=10.8, leading=17, textColor=INKTX, spaceAfter=5),
    "small": ParagraphStyle("small", fontName=FONT, fontSize=8.6, leading=13, textColor=GREY),
    "lead": ParagraphStyle("lead", fontName=FONT, fontSize=13, leading=21, textColor=INK, spaceAfter=6),
    "quote": ParagraphStyle("quote", fontName=FONTB, fontSize=13, leading=20, textColor=INK, spaceAfter=4),
    "metric_v": ParagraphStyle("mv", fontName=FONTB, fontSize=17, leading=19, textColor=INK, alignment=1),
    "metric_l": ParagraphStyle("ml", fontName=FONT, fontSize=8.5, leading=11, textColor=GREY, alignment=1),
    "cell": ParagraphStyle("cell", fontName=FONT, fontSize=9.5, leading=13.5, textColor=INKTX),
    "cellh": ParagraphStyle("cellh", fontName=FONTB, fontSize=9.5, leading=13, textColor=colors.white),
    "layer": ParagraphStyle("layer", fontName=FONTB, fontSize=9.5, leading=13, textColor=colors.white),
}

def P(t, s="body"): return Paragraph(t, styles[s])

from reportlab.platypus.flowables import Flowable

class GeoBand(Flowable):
    """底部几何装饰带：细线节点 + 连线，几何科技感填空白。canvas 直绘。"""
    def __init__(self, width=170*mm, height=26*mm):
        Flowable.__init__(self)
        self.width=width; self.height=height
    def wrap(self, aw, ah): return self.width, self.height
    def draw(self):
        c=self.canv
        pts=[(15,6),(40,18),(70,9),(98,20),(125,7),(150,19)]
        c.setStrokeColor(LINE); c.setLineWidth(0.4); c.line(0,self.height-1,self.width,self.height-1)
        c.setStrokeColor(ACCENT); c.setStrokeAlpha(0.5); c.setLineWidth(0.5)
        for i in range(len(pts)-1):
            c.line(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1])
        c.setStrokeAlpha(0.3); c.setLineWidth(0.4)
        c.line(pts[0][0],pts[0][1],pts[3][0],pts[3][1])
        c.line(pts[1][0],pts[1][1],pts[4][0],pts[4][1])
        c.setStrokeAlpha(1)
        for i,(x,y) in enumerate(pts):
            c.setFillColor(ACCENT); c.circle(x,y,2.2,fill=1,stroke=0)
            c.setFillColor(LIME if i%2 else colors.HexColor("#7FE3D6")); c.circle(x,y,1.1,fill=1,stroke=0)

def geo_band(width=170*mm, height=26*mm):
    return GeoBand(width, height)

# ---------- 封面（几何科技感 canvas） ----------
def cover(canvas, doc):
    c = canvas
    c.saveState()
    # 深墨蓝满底
    c.setFillColor(INK); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # —— 右上：同心环（信号扩散） ——
    cx, cy = PAGE_W - 42*mm, PAGE_H - 52*mm
    for rr, lw, op in [(40*mm,0.9,0.55),(28*mm,0.7,0.4),(17*mm,0.55,0.3),(8*mm,0.5,0.22)]:
        c.setStrokeColor(ACCENT); c.setStrokeAlpha(op); c.setLineWidth(lw); c.circle(cx, cy, rr, fill=0, stroke=1)
    c.setStrokeAlpha(1)
    # 中心点
    c.setFillColor(ACCENT); c.circle(cx, cy, 1.6*mm, fill=1, stroke=0)

    # —— 左下：等距网格（局部、不抢标题，仅画到 y<150 且 x<150 区域的左下） ——
    c.setStrokeColor(ACCENT); c.setStrokeAlpha(0.16); c.setLineWidth(0.4)
    origin_x, origin_y = 18*mm, 26*mm
    step = 11*mm
    for i in range(9):   # 竖线
        x = origin_x + i*step
        if x < 130*mm:
            c.line(x, origin_y, x, origin_y + 9*step)
    for j in range(9):   # 横线
        y = origin_y + j*step
        if y < origin_y + 9*step:
            c.line(origin_x, y, origin_x + 8*step, y)
    c.setStrokeAlpha(1)

    # —— 中部：节点-连线网络（7 节点，刻意非对称，2 孤立点） ——
    pts = [(PAGE_W-30*mm, 130*mm),(PAGE_W-58*mm, 148*mm),(PAGE_W-78*mm, 122*mm),
           (PAGE_W-50*mm, 105*mm),(PAGE_W-92*mm, 138*mm),(PAGE_W-110*mm, 110*mm),(PAGE_W-72*mm, 158*mm)]
    c.setStrokeColor(ACCENT); c.setStrokeAlpha(0.45); c.setLineWidth(0.5)
    for i in range(len(pts)):
        for j in range(i+1, len(pts)):
            x1,y1=pts[i]; x2,y2=pts[j]
            d = ((x1-x2)**2+(y1-y2)**2)**0.5
            if d < 52*mm:
                c.line(x1,y1,x2,y2)
    c.setStrokeAlpha(1)
    for i,(x,y) in enumerate(pts):
        c.setFillColor(ACCENT if i%2==0 else colors.HexColor("#7FE3D6"))
        c.circle(x,y, 1.5*mm, fill=1, stroke=0)

    # —— 左上切角色块（标题色块底） ——
    c.setFillColor(ACCENT); c.rect(0, PAGE_H-78*mm, 8*mm, 50*mm, fill=1, stroke=0)
    c.setFillColor(ACCENT_D); c.rect(8*mm, PAGE_H-78*mm, 2*mm, 50*mm, fill=1, stroke=0)

    # —— 文字 ——
    c.setFillColor(colors.HexColor("#AFC2CE")); c.setFont(FONT, 9)
    c.drawString(26*mm, PAGE_H-40*mm, "2026  AI 先锋未来人才大赛  |  智能自主实验室命题")

    c.setFillColor(colors.white); c.setFont(FONTB, 40)
    c.drawString(26*mm, PAGE_H-72*mm, "晶流 LabFlow")
    c.setFillColor(ACCENT); c.setFont(FONTB, 19)
    c.drawString(26*mm, PAGE_H-86*mm, "AI 实验研发加速器")

    c.setFillColor(colors.HexColor("#C9D6DE")); c.setFont(FONT, 12.5)
    c.drawString(26*mm, PAGE_H-104*mm, "让一次讨论，在 24 小时内成为下一次实验的起点。")

    # 左下方副信息
    c.setFillColor(colors.HexColor("#8093A0"))
    c.setFont(FONT, 9)
    c.drawString(26*mm, 22*mm, "队伍：知识催化剂   |   队长：王浩毅   |   中国地质大学（武汉）")
    c.drawString(26*mm, 16*mm, "作品：面向高频实验研发团队的 AI 知识加速器   |   开题报告补充材料 v3.0")

    # 底部细线
    c.setStrokeColor(ACCENT); c.setStrokeAlpha(0.5); c.setLineWidth(0.6)
    c.line(0, 12*mm, PAGE_W, 12*mm); c.setStrokeAlpha(1)
    c.restoreState()

# ---------- 内页页眉页脚 ----------
def body_page(canvas, doc):
    c = canvas
    c.saveState()
    c.setFillColor(PAPER); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # 顶部细 header
    c.setStrokeColor(LINE); c.setLineWidth(0.4)
    c.line(20*mm, PAGE_H-14*mm, PAGE_W-20*mm, PAGE_H-14*mm)
    c.setFillColor(ACCENT); c.circle(22*mm, PAGE_H-11.2*mm, 1.4*mm, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont(FONTB, 8.5)
    c.drawString(27*mm, PAGE_H-12*mm, "晶流 LabFlow")
    c.setFillColor(GREYL); c.setFont(FONT, 8)
    c.drawRightString(PAGE_W-20*mm, PAGE_H-12*mm, "开题报告补充材料  ·  AI 实验研发加速器")
    # 底部
    c.setStrokeColor(LINE); c.setLineWidth(0.4)
    c.line(20*mm, 14*mm, PAGE_W-20*mm, 14*mm)
    c.setFillColor(GREYL); c.setFont(FONT, 8)
    c.drawString(20*mm, 9*mm, "知识催化剂  |  王浩毅  |  中国地质大学（武汉）")
    c.drawRightString(PAGE_W-20*mm, 9*mm, f"— {doc.page} —")
    c.restoreState()


def section_title(num, title):
    """章节编号色块 + 标题，左对齐（非居中，降AI感）"""
    t = Table(
        [[Paragraph(f'<font name="{FONTB}" color="#0E1A2B">{num}</font>', ParagraphStyle("n", fontName=FONTB, fontSize=15, leading=15, textColor=INK)),
          Paragraph(f'<font name="{FONTB}" size="16" color="#0E1A2B">{title}</font>', ParagraphStyle("t", fontName=FONTB, fontSize=16, leading=18, textColor=INK))]],
        colWidths=[14*mm, 156*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0),ACCENT),
        ("TEXTCOLOR",(0,0),(0,0),INK),
        ("ALIGN",(0,0),(0,0),"CENTER"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(1,0),(1,0),8),("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ]))
    return t

class Brief(BaseDocTemplate):
    pass

doc = Brief(str(OUT), pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=18*mm)
frame = Frame(20*mm, 17*mm, PAGE_W-40*mm, PAGE_H-37*mm, leftPadding=0, rightPadding=0, topPadding=2, bottomPadding=0)
doc.addPageTemplates([
    PageTemplate(id="cover", frames=Frame(0,0,PAGE_W,PAGE_H), onPage=cover),
    PageTemplate(id="body", frames=frame, onPage=body_page),
])

STORY = [Spacer(1, 270*mm), NextPageTemplate("body"), PageBreak()]  # 封面占位（cover 模板只画第1页）

# ===== PAGE 2: 命题洞察 =====
STORY.append(Spacer(1, 6))
STORY.append(section_title("01", "命题洞察与核心主张"))
STORY.append(Spacer(1, 6))
STORY.append(P("高频实验研发团队每天并行推进大量实验。会议里持续产生参数、方案争议、失败原因与优化结论，但这些高价值信息散落在会议转写、文档、表格与个人经验里，形成四类研发断点。", "lead"))
STORY.append(Spacer(1, 4))

breaks = [
    ("01", "信息断点", "实验参数与决策依据混杂在转写里，难以按实验对象检索。"),
    ("02", "执行断点", "会议结论到负责人、截止时间与实验批次，依赖人工搬运。"),
    ("03", "知识断点", "失败案例缺少结构化沉淀，相似错误在不同批次反复发生。"),
    ("04", "可信断点", "普通大模型总结缺证据时间戳、置信度、版本与人审状态。"),
]
rows = [[Paragraph(f'<font name="{FONTB}" size="9" color="#10807A">{n}</font><br/><font name="{FONTB}" size="10.5" color="#0E1A2B">{k}</font>',
                   ParagraphStyle("x", fontName=FONT, fontSize=10, leading=14, textColor=INK)),
         Paragraph(d, ParagraphStyle("d", fontName=FONT, fontSize=10.5, leading=15, textColor=INKTX))]
        for n,k,d in breaks]
bt = Table(rows, colWidths=[34*mm, 136*mm], rowHeights=[16*mm]*4)
bt.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LINEBELOW",(0,0),(-1,-2),0.4,LINE),
    ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
    ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ("LINEBEFORE",(0,0),(0,-1),2,ACCENT),
]))
STORY.append(bt)
STORY.append(Spacer(1, 10))
STORY.append(P("<b>核心主张 · 24 小时知识 SLA。</b>会议结束 24 小时内，经过人审确认的关键结论，必须带实验编号、证据时间戳、适用边界与责任人，能够被有权限的团队成员检索、理解、引用与回溯。我们没有再做会议纪要工具，而是把命题重定义为<i>“研发经验的流动速度”</i>。", "body"))
STORY.append(Spacer(1, 10))
# —— 填充下半部：四指标带 ——
STORY.append(P("首阶段验证目标", "h2"))
metrics = [
    ("≥ 90%", "知识 SLA 达标率"),
    ("100%", "证据可追溯率"),
    ("≥ 60%", "复用建议采纳率"),
    ("↓ 30%", "重复讨论时长目标"),
]
mc = [Paragraph(f'<font name="{FONTB}" size="26" color="#0E1A2B">{v}</font><br/><br/><font name="{FONT}" size="9" color="#5B6B7A">{l}</font>', ParagraphStyle("mc", fontName=FONTB, fontSize=26, leading=30, textColor=INK, alignment=1)) for v,l in metrics]
mtbl = Table([mc], colWidths=[42.5*mm]*4, rowHeights=[33*mm])
mtbl.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER"),
    ("LINEABOVE",(0,0),(-1,0),2,ACCENT),
]))
STORY.append(mtbl)
STORY.append(Spacer(1, 6))
STORY.append(P("以上为首阶段验证目标，非未经验证的生产成绩；用以约束作品方向，而非承诺已取得的业务结果。", "small"))
STORY.append(Spacer(1, 12))
STORY.append(P("作品定位与热度取舍", "h2"))
STORY.append(P("本作品定位为<b>面向高频实验研发团队的 AI 知识加速器</b>，不依赖特定行业——核心是“以实验对象为主线的知识闭环”这一可迁移方法，而非绑定任一企业或赛道，便于在不同研发环境中复用。在赛事命题热度榜上，相较最热门的 TOP3 营销类命题与极冷门的孤题，我们选择<b>热度中等偏上的技术型命题</b>，竞争方式以<b>技术深度与流程严谨性</b>取胜，而非拼热度或拼曝光。", "body"))

STORY.append(PageBreak())

# ===== PAGE 3: 研发知识闭环 + 六模块 =====
STORY.append(Spacer(1, 6))
STORY.append(section_title("02", "研发知识闭环与六个产品模块"))
STORY.append(Spacer(1, 6))
STORY.append(P("晶流以<b>实验编号</b>为主实体（而非以会议文件为中心），贯穿 <b>会前 → 会中 → 会后 → 复用</b> 四阶段，并在下一轮相似实验开始前主动召回历史经验。", "body"))
STORY.append(Spacer(1, 4))

flow_hdr = [Paragraph(f'<font name="{FONTB}" color="white" size="10">{x}</font>', ParagraphStyle("fh", fontName=FONTB, fontSize=10, leading=13, textColor=colors.white, alignment=1)) for x in ["会前","会中","会后","复用"]]
flow_body = [
    Paragraph("聚合同实验参数、<br/>历史决策与未关闭风险<br/>及相似成功/失败案例", styles["cell"]),
    Paragraph("识别参数·争议·风险·<br/>决策·行动项，保留说话人<br/>与原文时间戳作证据", styles["cell"]),
    Paragraph("负责人人审后联动文档、<br/>知识库、多维表与实验<br/>状态机推进闭环", styles["cell"]),
    Paragraph("下一相似实验开始前<br/>主动召回并解释适用边界<br/>由风险守门员提示", styles["cell"]),
]
ft = Table([flow_hdr, flow_body], colWidths=[42.5*mm]*4, rowHeights=[10*mm, 30*mm])
ft.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),INK),
    ("BACKGROUND",(0,1),(-1,1),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,0),"MIDDLE"),("VALIGN",(0,1),(-1,1),"TOP"),
    ("ALIGN",(0,0),(-1,0),"CENTER"),
    ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,1),(-1,1),8),
    ("LINEABOVE",(0,1),(-1,1),2,ACCENT),
]))
STORY.append(ft)
STORY.append(Spacer(1, 10))
STORY.append(P("六个产品模块", "h2"))
mods = [
    ("研发总览","24h SLA、闭环率、实验与风险全局可见"),
    ("会议解析器","把转写变成带证据的研发可执行对象"),
    ("实验流转","状态机、负责人、行动项与风险守门"),
    ("知识湖","向量召回 + 图谱证据 + 可解释 Rerank"),
    ("失败模式库","触发参数、症状、根因与避免策略"),
    ("AI 助理","解析、相似检索、风险守门三类专用 Agent"),
]
mrows = [[Paragraph(f'<font name="{FONTB}" size="10.5" color="#0E1A2B">{mods[i][0]}</font><br/><font size="9.5" color="#5B6B7A">{mods[i][1]}</font>',
                     ParagraphStyle("m", fontName=FONT, fontSize=9.5, leading=14, textColor=INKTX)),
          Paragraph(f'<font name="{FONTB}" size="10.5" color="#0E1A2B">{mods[i+1][0]}</font><br/><font size="9.5" color="#5B6B7A">{mods[i+1][1]}</font>',
                     ParagraphStyle("m2", fontName=FONT, fontSize=9.5, leading=14, textColor=INKTX))]
         for i in range(0,6,2)]
mt = Table(mrows, colWidths=[85*mm, 85*mm], rowHeights=[17*mm]*3)
mt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.white, STRIPE]),
]))
STORY.append(mt)
STORY.append(Spacer(1, 6))
STORY.append(P("差异化不是更多功能，而是三个原则：实验对象驱动；成功与失败同等沉淀；所有 AI 结论都带证据、置信度、版本与人审状态。", "body"))
STORY.append(Spacer(1, 10))
# —— 复用场景叙事卡（填底部） ——
STORY.append(P("一次闭环，从一次参数评审会开始", "h2"))
STORY.append(P("B-17 实验刚开完参数评审会。普通纪要留下一大段文本；晶流把它拆成三条带证据的研发对象：① 方案决策——B-17-03 采用低温梯度进入小试；② 风险——高溶剂比例可能造成晶型漂移；③ 知识关联——系统命中历史方案 B-11，预计减少约 1.5 天试错。每条都带原文时间戳与置信度，行动项带负责人与截止，确认后写入知识湖并同步多维表。", "body"))
STORY.append(Spacer(1, 6))
STORY.append(Table([[Paragraph('下一次相似实验开始前，风险守门员会主动提示 B-11 的成功参数与 A-09 的失败边界——而不是等工程师再去翻历史。', ParagraphStyle("em", fontName=FONT, fontSize=10, leading=15, textColor=colors.white))]], colWidths=[170*mm]))
emph = STORY[-1]
emph.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),INK),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),("LINEBEFORE",(0,0),(-1,-1),3,ACCENT)]))

STORY.append(PageBreak())

# ===== PAGE 4: 技术架构 (嵌入架构图) =====
STORY.append(Spacer(1, 5))
STORY.append(section_title("03", "技术架构与可信 AI"))
STORY.append(Spacer(1, 4))
STORY.append(P("系统自下而上分四层：飞书协同层 → 接入编排层 → Agent 层 → 知识与数据层；亮青为主数据流、柠绿为知识回流，可信与安全贯穿全链路而非外挂。", "body"))
STORY.append(Spacer(1, 3))
if ARCH_PNG.exists():
    STORY.append(Image(str(ARCH_PNG), width=155*mm, height=155*mm*2573/1819))

STORY.append(PageBreak())

# ===== PAGE 5: 产品界面展示（截图墙） =====
STORY.append(Spacer(1, 6))
STORY.append(section_title("04", "产品界面与主链路展示"))
STORY.append(Spacer(1, 4))
STORY.append(P("作品不是静态概念图。下列为可运行验证版的真实界面截图，覆盖研发总览、会议 AI 解析、研发知识湖与移动端四条主链路。", "body"))
STORY.append(Spacer(1, 6))

SSHOTS = [
    (ROOT/"output/screenshots/01-dashboard-desktop.png", "研发总览 · 桌面端", "24h SLA、闭环率与全局实验/风险概览。"),
    (ROOT/"output/screenshots/02-analyzer-result.png", "会议 AI 解析结果", "B-17 参数评审会议被结构化为决策、风险与带时间戳证据。"),
]
SH2 = [
    (ROOT/"output/screenshots/04-knowledge-lake.png", "研发知识湖", "以实验为中心的关系网络，召回历史方案与失败案例。"),
    (ROOT/"output/screenshots/03-dashboard-mobile.png", "研发总览 · 移动端", "响应式布局，390×844 下关键工作台可触达。"),
]

def shot_cell(img_path, cap, desc, w_mm, h_mm):
    inner = []
    if img_path.exists():
        inner.append(Image(str(img_path), width=w_mm*mm, height=h_mm*mm))
    inner.append(Spacer(1, 2))
    inner.append(Paragraph(f'<font name="{FONTB}" size="9" color="#0E1A2B">{cap}</font>'
                          f'  <font name="{FONT}" size="8.5" color="#5B6B7A">— {desc}</font>',
                          ParagraphStyle("cap", fontName=FONT, fontSize=8.5, leading=12, textColor=INKTX)))
    return inner

# 第一行：两张桌面截图（宽图，横排）
r1 = Table([[shot_cell(SSHOTS[0][0], SSHOTS[0][1], SSHOTS[0][2], 82, 62),
             shot_cell(SSHOTS[1][0], SSHOTS[1][1], SSHOTS[1][2], 82, 62)]],
           colWidths=[85*mm, 85*mm])
r1.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                        ("BOX",(0,0),(-1,-1),0.4,LINE),("INNERGRID",(0,0),(-1,-1),0.4,LINE),
                        ("BACKGROUND",(0,0),(-1,-1),colors.white),
                        ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),
                        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
STORY.append(r1)
STORY.append(Spacer(1, 8))
# 第二行：知识湖（宽图）+ 移动端（窄图竖向，与知识湖并排，移动端用较小宽度留白补几何）
r2 = Table([[shot_cell(SH2[0][0], SH2[0][1], SH2[0][2], 112, 78),
            shot_cell(SH2[1][0], SH2[1][1], SH2[1][2], 48, 78)]],
           colWidths=[115*mm, 55*mm])
r2.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                        ("BOX",(0,0),(-1,-1),0.4,LINE),("INNERGRID",(0,0),(-1,-1),0.4,LINE),
                        ("BACKGROUND",(0,0),(-1,-1),colors.white),
                        ("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),
                        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
STORY.append(r2)
STORY.append(Spacer(1, 6))
STORY.append(P("演示主链路：选择参数评审会议 → 启动结构化解析 → 展示带时间戳的决策与风险证据 → 拆解行动项 → 写入知识湖并同步多维表。每张图均取自本地可运行仓库，非合成示意图。", "small"))

STORY.append(PageBreak())

# ===== PAGE 6: 已完成 Demo + 诚实边界 =====
STORY.append(Spacer(1, 6))
STORY.append(section_title("05", "已完成的可运行验证版"))
STORY.append(Spacer(1, 6))
STORY.append(P("不是只做概念图：当前仓库包含真实 Node.js API、响应式前端、脱敏种子数据、会议解析、任务创建与统一检索，可在无外部账号条件下离线运行。", "lead"))
STORY.append(Spacer(1, 4))
STORY.append(P("<b>为什么 pgvector + Neo4j：</b>向量擅文本相似，图谱表达版本、权限与证据，Rerank 结合参数重叠、阶段、时间衰减与人审等级排序，才能回答“为什么可复用、适用边界、原始证据在哪”。", "body"))
STORY.append(Spacer(1, 2))
STORY.append(P("<b>可靠性 & 安全：</b>事件幂等键与 Outbox、Agent 每阶段 Checkpoint、首字节超时与绝对 Deadline、多模型降级、Structured Output 校验失败转修复再转人审、写飞书前校验对象版本、死信可重放、trace_id 全程贯通；继承飞书权限且向量检索不得绕过 ACL，会议文本视为不可信输入、工具调用白名单、敏感操作不可变审计与可撤回。", "body"))
STORY.append(Spacer(1, 6))

facts = [
    ("六个工作台", "研发总览、实验流转、知识湖、AI 助理、连接器、偏好设置。"),
    ("主链路演示", "选 B-17 参数评审会 → 结构化提炼决策/风险/知识关联 → 显示证据时间戳 → 拆解行动项 → 写入知识闭环。"),
    ("会议解析", "POST /api/meetings/mt-2407/analyze 返回 3 条决策、2 个行动项、0.96 置信度。"),
    ("失败知识检索", "查询“湿度”跨实验命中 A-09 失败案例与避免策略。"),
    ("质量校验", "npm run check 通过；桌面端 1440×1100、移动端 390×844；浏览器控制台 0 errors / 0 warnings；12 张本地素材均可离线加载。"),
]
fr = [[Paragraph(f'<font name="{FONTB}" size="10" color="#0E1A2B">{k}</font>', ParagraphStyle("fk", fontName=FONTB, fontSize=10, leading=13, textColor=INK)),
       Paragraph(v, ParagraphStyle("fv", fontName=FONT, fontSize=9.8, leading=14, textColor=INKTX))] for k,v in facts]
ftb = Table(fr, colWidths=[34*mm, 136*mm])
ftb.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LINEBELOW",(0,0),(-1,-2),0.4,LINE),
    ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.white, STRIPE]),
]))
STORY.append(ftb)
STORY.append(Spacer(1, 8))
STORY.append(P("诚实边界", "h2"))
STORY.append(P("由于没有赛事租户与企业内部数据授权，飞书连接器按正式接口契约设计，演示环境使用确定性 AI 适配器与脱敏种子数据；不伪造已接入企业生产系统。页面效率数值属于演示数据或验证目标，不表述为任意生产环境的实际结果。生产版把 AI 适配器替换为飞书会议 AI + Spring AI/LangGraph 流程，把内存数据层替换为 PostgreSQL + pgvector、Neo4j、Redis 与对象存储。", "body"))
STORY.append(Spacer(1, 10))
# —— 填充下半部：当前实现 vs 生产版映射 + 技术栈 ——
STORY.append(P("验证版与生产版的映射", "h2"))
mapping = [
    ("当前仓库", "生产替换"),
    ("Node 原生 API", "Spring Boot 模块化后端"),
    ("data/seed.json 内存数据", "PostgreSQL + pgvector / Neo4j / Redis / 对象存储"),
    ("确定性 AI 适配器", "飞书会议 AI + Spring AI 多模型降级与 Rerank"),
    ("本地知识搜索", "混合检索 + Rerank + ACL 二次过滤"),
    ("页面连接器状态", "真实 OAuth / Webhook / 文档 / 多维表 API"),
]
_map_rows = [[Paragraph(f'<font name="{FONTB}" size="9.5" color="#0E1A2B">{a}</font>', ParagraphStyle("ma", fontName=FONTB, fontSize=9.5, leading=13, textColor=INK)),
              Paragraph(f'<font name="{FONT}" size="9.5" color="#1E2B3A">{b}</font>', ParagraphStyle("mb", fontName=FONT, fontSize=9.5, leading=13, textColor=INKTX))] for a,b in mapping]
mpt = Table(_map_rows, colWidths=[70*mm, 100*mm])
mpt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),INK),
    ("TEXTCOLOR",(0,0),(-1,0),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, STRIPE]),
]))
STORY.append(mpt)

STORY.append(PageBreak())

# ===== PAGE 7: 实施计划 + 团队 + 价值 =====
STORY.append(Spacer(1, 6))
STORY.append(section_title("06", "实施计划、团队与价值"))
STORY.append(Spacer(1, 6))
STORY.append(P("四周实施计划", "h2"))
road = [
    ("W1","企业教练访谈、流程/字段/权限确认、收集 5 场脱敏样本"),
    ("W2","会议解析、Structured Output、人审、文档与多维表黄金主链路"),
    ("W3","失败模式库、知识图谱、向量检索、Rerank 与风险守门员"),
    ("W4","双人标注评测、异常链路测试、演示视频与路演打磨"),
]
rr = [[Paragraph(f'<font name="{FONTB}" color="white" size="11">{w}</font>', ParagraphStyle("rw", fontName=FONTB, fontSize=11, leading=14, textColor=colors.white, alignment=1)),
       Paragraph(d, ParagraphStyle("rd", fontName=FONT, fontSize=10, leading=14.5, textColor=INKTX))] for w,d in road]
rt = Table(rr, colWidths=[22*mm, 148*mm], rowHeights=[16*mm]*4)
rt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(0,-1),DEEP),
    ("BACKGROUND",(1,0),(1,-1),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(1,0),(1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
    ("ROWBACKGROUNDS",(1,0),(1,-1),[colors.white, STRIPE]),
    ("LINEBEFORE",(0,0),(0,-1),2,ACCENT),
]))
STORY.append(rt)
STORY.append(Spacer(1, 8))
STORY.append(P("团队", "h2"))
team = [
    ("王浩毅 · 产品与技术负责人","中国地质大学（武汉）GIS 硕士在读，求职方向 Java 后端 / AI 应用。研究方向：大模型驱动的企业知识图谱自动构建与隐私保护。负责后端架构、Agent 编排、知识图谱、接口部署与技术答辩。"),
    ("队员 2 · 协同体验与验证","（队友信息由本人填写）负责飞书工作流、样本标注、UI/视频、业务路与可用性测试。"),
]
tr = [[Paragraph(f'<font name="{FONTB}" size="10.5" color="#0E1A2B">{k}</font>', ParagraphStyle("tk", fontName=FONTB, fontSize=10.5, leading=14, textColor=INK)),
       Paragraph(v, ParagraphStyle("tv", fontName=FONT, fontSize=9.8, leading=14, textColor=INKTX))] for k,v in team]
tt = Table(tr, colWidths=[44*mm, 126*mm])
tt.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),4),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("LINEABOVE",(0,0),(-1,0),0.4,LINE),("LINEABOVE",(0,1),(-1,1),0.4,LINE),
    ("LINEAFTER",(0,0),(0,-1),0.4,LINE),
    ("LEFTPADDING",(0,0),(0,-1),2),
]))
STORY.append(tt)
STORY.append(Spacer(1, 12))
# —— 差异化与价值（三原则卡）填底部 ——
STORY.append(P("作品差异化（三条原则而非更多功能）", "h2"))
principles = [
    ("实验对象驱动", "以实验编号为主实体，而非以会议文件为中心；每条结论绑定实验、参数、证据与责任人。"),
    ("成功与失败双沉淀", "对失败经验单独建模——触发参数、症状、根因、避免策略——并主动触发，不让相似错误重复。"),
    ("结论可回溯可信", "所有 AI 结论都带原文时间戳、置信度、版本与人审状态，满足研发严谨性，拒绝“正确废话”。"),
]
pcells = [Paragraph(f'<font name="{FONTB}" size="10" color="#0E1A2B">{k}</font><br/><br/><font name="{FONT}" size="9" color="#5B6B7A">{d}</font>',
                    ParagraphStyle("pc", fontName=FONT, fontSize=9, leading=13.5, textColor=INKTX, alignment=1)) for k,d in principles]
ptbl = Table([pcells], colWidths=[56.6*mm]*3, rowHeights=[34*mm])
ptbl.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),colors.white),
    ("BOX",(0,0),(-1,-1),0.4,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.4,LINE),
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LINEABOVE",(0,0),(-1,0),2,ACCENT),
    ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),6),
]))
STORY.append(ptbl)
STORY.append(Spacer(1, 12))
# 结尾引文（细分隔线而非色块）
STORY.append(Table([[Paragraph('让每一次判断留下证据，让每一次失败成为下一次发现的捷径。', ParagraphStyle("end", fontName=FONTB, fontSize=12, leading=18, textColor=INK, alignment=1))]], colWidths=[170*mm]))
STORY.append(Spacer(1, 6))
STORY.append(P("官方依据：activity.feishu.cn/future-talent · 赛事命题热度榜动态页 · 各企业命题详情。完整代码、文档、素材来源与验收截图均保存在参赛工作目录。", "small"))

doc.build(STORY)
print("built:", OUT)
