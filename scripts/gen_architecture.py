from __future__ import annotations
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "晶流LabFlow-知识闭环与架构图.png"

# 单页 A4 纵向，高分辨率
W, H = 210 * mm, 297 * mm
DPI_SCALE = 3.0  # 渲染用 PDF->PNG，再提高 DPI

INK = colors.HexColor("#0E1A2B")      # 深墨蓝主底
PAPER = colors.HexColor("#F7F9FB")    # 内页浅底
DEEP = colors.HexColor("#16304A")      # 次级深
ACCENT = colors.HexColor("#2EE6D6")    # 亮青强调
ACCENT_SOFT = colors.HexColor("#9BE9E2")
LIME = colors.HexColor("#C6F432")      # 极少使用警示/亮点
GREY = colors.HexColor("#5B6B7A")
LINE = colors.HexColor("#C7D2DC")
GRID = colors.HexColor("#DCE5EC")

FONT = "NotoSansSC"
FONTB = "NotoSansBd"


def register():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    pdfmetrics.registerFont(TTFont(FONT, "C:/Windows/Fonts/NotoSansSC-VF.ttf"))
    pdfmetrics.registerFont(TTFont(FONTB, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
    registerFontFamily(FONT, normal=FONT, bold=FONTB, italic=FONT, boldItalic=FONTB)


def vpath(c, pts, stroke=True, fill=False, lw=0.6, color=ACCENT):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(lw)
    p = c.beginPath()
    p.moveTo(*pts[0])
    for pt in pts[1:]:
        p.lineTo(*pt)
    c.drawPath(p, stroke=stroke, fill=fill)


def node(c, x, y, r=2.2*mm, fill=ACCENT, ring=None, ring_w=0.6):
    if ring:
        c.setStrokeColor(ring); c.setLineWidth(ring_w); c.circle(x, y, r*1.8, fill=0, stroke=1)
    c.setFillColor(fill); c.circle(x, y, r, fill=1, stroke=0)


def text(c, s, x, y, size, font=FONT, color=INK, align=0):
    c.setFont(font, size); c.setFillColor(color)
    if align == 0: c.drawString(x, y, s)
    elif align == 1: c.drawCentredString(x, y, s)
    else: c.drawRightString(x, y, s)


def draw(pdf_path):
    register()
    c = canvas.Canvas(str(pdf_path), pagesize=(W, H))
    # 浅底
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
    # 顶部深色 header 条
    c.setFillColor(INK); c.rect(0, H-34*mm, W, 34*mm, fill=1, stroke=0)
    # header 几何点缀：右上同心环
    cx, cy = W-26*mm, H-17*mm
    for i, (rr, lw, op) in enumerate([(20*mm,0.6,0.85),(14*mm,0.5,0.55),(8*mm,0.4,0.35)]):
        c.setStrokeColor(ACCENT); c.setStrokeAlpha(op); c.setLineWidth(lw); c.circle(cx, cy, rr, fill=0, stroke=1)
    c.setStrokeAlpha(1)
    # header 文字
    text(c, "晶流 LabFlow", 20*mm, H-16*mm, 22, FONTB, colors.white)
    text(c, "知识闭环 · 技术分层架构", 20*mm, H-24*mm, 11, FONT, colors.HexColor("#AFC2CE"))
    text(c, "01", 20*mm, H-30*mm, 8.5, FONTB, ACCENT)
    text(c, "  研发知识闭环：会前 → 会中 → 会后 → 复用", 26.5*mm, H-30*mm, 8.5, FONT, colors.HexColor("#AFC2CE"))

    # ===== 第一段：闭环（横向 4 节点）=====
    y_band = H - 60*mm
    # 中线
    c.setStrokeColor(LINE); c.setLineWidth(0.4); c.setDash(1,2)
    c.line(28*mm, y_band, W-28*mm, y_band)
    c.setDash()
    nodes4 = [
        ("会前", "聚合同实验参数\n历史决策与风险", 28*mm + (W-56*mm)*0.10, y_band, DEEP),
        ("会中", "识别参数·争议·风险\n决策·行动项+证据", 28*mm + (W-56*mm)*0.42, y_band, DEEP),
        ("会后", "人审→文档/知识库\n任务同步多维表", 28*mm + (W-56*mm)*0.74, y_band, DEEP),
    ]
    # 节点圆 + 连接线
    for i in range(len(nodes4)-1):
        x1, x2 = nodes4[i][2], nodes4[i+1][2]
        c.setStrokeColor(ACCENT); c.setLineWidth(0.8)
        c.line(x1+7*mm, y_band, x2-7*mm, y_band)
        # 箭头
        c.setFillColor(ACCENT)
        p = c.beginPath(); p.moveTo(x2-7*mm, y_band); p.lineTo(x2-8.5*mm, y_band+1.4*mm); p.lineTo(x2-8.5*mm, y_band-1.4*mm); p.close(); c.drawPath(p, fill=1, stroke=0)
    # 复用回流（弧线回到会前）
    p = c.beginPath()
    sx, sy = nodes4[-1][2], y_band
    tx, ty = nodes4[0][2], y_band
    p.moveTo(sx, sy+6*mm)
    p.curveTo(sx, sy+22*mm, tx, sy+22*mm, tx, ty+6*mm)
    c.setStrokeColor(LIME); c.setLineWidth(0.7); c.setStrokeAlpha(0.9); c.drawPath(p, stroke=1, fill=0); c.setStrokeAlpha(1)
    # 箭头回流
    p = c.beginPath(); p.moveTo(tx, ty+6*mm); p.lineTo(tx+1.4*mm, ty+4.5*mm); p.lineTo(tx-1.4*mm, ty+4.5*mm); p.close(); c.setFillColor(LIME); c.drawPath(p, fill=1, stroke=0)
    text(c, "复用：相似实验开始前，经验主动出现", (sx+tx)/2, y_band+22*mm-1, 7.8, FONT, colors.HexColor("#5A7A1E"), align=1)

    for idx, (k, desc, x, y, col) in enumerate(nodes4):
        c.setFillColor(col); c.setStrokeColor(ACCENT); c.setLineWidth(0.7)
        c.circle(x, y, 6.5*mm, fill=1, stroke=1)
        text(c, k, x, y-2.0*mm, 10.5, FONTB, colors.white, align=1)
        # desc 在节点下方
        text(c, desc.split("\n")[0], x, y-13*mm, 8, FONT, colors.HexColor("#2A3A4A"), align=1)
        text(c, desc.split("\n")[1], x, y-17.5*mm, 8, FONT, colors.HexColor("#5B6B7A"), align=1)

    # ===== 第二段：技术分层（4 层堆叠）=====
    top = H - 110*mm
    layer_h = 22*mm
    gap = 5*mm
    layers = [
        ("飞书协同层", "会议AI / 文档 / 知识库 / 多维表 / 机器人", INK),
        ("接入编排层", "Spring Gateway · Workflow Orchestrator · RabbitMQ · SSE", DEEP),
        ("Agent 层", "会议解析 → 领域质检 → 知识关联 → 任务分派 → 人审", colors.HexColor("#1F3C57")),
        ("知识与数据层", "PostgreSQL+pgvector · Neo4j · Redis · 对象存储 · 审计", colors.HexColor("#2A4763")),
    ]
    for i,(name, detail, col) in enumerate(layers):
        y = top - i*(layer_h+gap)
        # 层背景
        c.setFillColor(col); c.setStrokeColor(ACCENT); c.setLineWidth(0.5)
        c.roundRect(20*mm, y-layer_h, W-40*mm, layer_h, 2*mm, fill=1, stroke=0)
        # 左侧亮青色块
        c.setFillColor(ACCENT); c.rect(20*mm, y-layer_h, 6*mm, layer_h, fill=1, stroke=0)
        text(c, f"L{4-i}", 23*mm, y-layer_h/2-2*mm, 9, FONTB, INK, align=1)
        text(c, name, 32*mm, y-9*mm, 11.5, FONTB, colors.white)
        text(c, detail, 32*mm, y-16*mm, 8.2, FONT, colors.HexColor("#AFC2CE"))
        # 右侧节点点（每层3-5个小节点，表示模块）
        for j in range(4):
            nx = W-30*mm - j*9*mm
            c.setFillColor(ACCENT_SOFT); c.setStrokeColor(ACCENT); c.setLineWidth(0.4)
            c.circle(nx, y-layer_h/2, 1.6*mm, fill=1, stroke=1)

    # 层与层之间细连线（左侧竖向，表示数据流）
    c.setStrokeColor(ACCENT); c.setLineWidth(0.5); c.setStrokeAlpha(0.5)
    for i in range(len(layers)-1):
        y = top - (i+1)*(layer_h) - i*gap - gap/2
        c.line(43*mm, top - i*(layer_h+gap) - layer_h, 43*mm, y)
        c.circle(43*mm, y, 0.8*mm, fill=1, stroke=0)
    c.setStrokeAlpha(1)

    # ===== 底部：可信保障横条 + 图例 =====
    foot_y = 30*mm
    c.setFillColor(colors.HexColor("#EEF3F7")); c.setStrokeColor(LINE); c.setLineWidth(0.4)
    c.roundRect(20*mm, foot_y, W-40*mm, 14*mm, 2*mm, fill=1, stroke=1)
    text(c, "可信与安全贯穿全链路", 25*mm, foot_y+8.5*mm, 9, FONTB, INK)
    text(c, "幂等键·Checkpoint·多模型降级·权限继承·字段级脱敏·不可变审计·Prompt Injection 防护", 25*mm, foot_y+3.2*mm, 7.6, FONT, GREY)

    # 图例
    lx = 20*mm
    ly = 19*mm
    c.setStrokeColor(ACCENT); c.setLineWidth(0.8); c.line(lx, ly, lx+8*mm, ly); c.setFillColor(ACCENT); c.circle(lx+8*mm, ly, 1.0*mm, fill=1, stroke=0)
    text(c, "主数据流", lx+11*mm, ly-2*mm, 7.5, FONT, GREY)
    c.setStrokeColor(LIME); c.setLineWidth(0.7); c.line(lx+34*mm, ly, lx+42*mm, ly); c.setFillColor(LIME); c.circle(lx+42*mm, ly, 1.0*mm, fill=1, stroke=0)
    text(c, "知识回流", lx+45*mm, ly-2*mm, 7.5, FONT, GREY)
    text(c, "晶流 LabFlow · 2026 AI 先锋未来人才大赛 · 晶泰科技命题 · 架构图 v1.1", W-20*mm, ly-2*mm, 7, FONT, colors.HexColor("#8FA0AC"), align=2)

    c.showPage(); c.save()
    print("built", pdf_path)


if __name__ == "__main__":
    import sys
    pdf_tmp = OUT.with_suffix(".pdf")
    draw(pdf_tmp)
    # PDF -> PNG 高清
    try:
        import fitz
        doc = fitz.open(str(pdf_tmp))
        pix = doc[0].get_pixmap(dpi=220)
        pix.save(str(OUT))
        print("png", OUT, pix.width, pix.height)
    except Exception as e:
        print("pymupdf fail", e)
