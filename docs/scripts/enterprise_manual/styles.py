"""Print-ready A4 CSS — EliteFlow Product Documentation (not thesis).

Equal margins, header/footer safe zones via Playwright page margins,
max two screenshot blocks per printed page, magazine alternating layout.
"""

from .brand import (
    BLACK,
    BORDER,
    GOLD,
    GOLD_DARK,
    GRAY,
    GRAY_LIGHT,
    INK,
    NAVY,
    NAVY_DEEP,
    NAVY_LIGHT,
    NAVY_MID,
    PURPLE,
    SUCCESS,
    SURFACE,
    WHITE,
)


def css() -> str:
    # Playwright PDF uses margin top/bottom/left/right = 18mm.
    # Body content fills the remaining printable area with no extra edge padding.
    return f"""
@page {{
  size: A4;
  margin: 0;
}}

* {{ box-sizing: border-box; }}

html, body {{
  margin: 0;
  padding: 0;
  font-family: "Segoe UI", "Calibri", Arial, sans-serif;
  color: {BLACK};
  font-size: 10pt;
  line-height: 1.45;
  background: {WHITE};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}

img {{
  max-width: 100%;
  height: auto;
  display: block;
}}

/* ── Cover (full bleed inside Playwright margins still apply) ── */
.cover {{
  page-break-after: always;
  min-height: 260mm;
  margin: 0;
  padding: 28mm 8mm 20mm 8mm;
  background: linear-gradient(160deg, {NAVY_DEEP} 0%, {NAVY} 45%, #1A3A6E 70%, {PURPLE} 140%);
  color: {WHITE};
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}}

.cover::before {{
  content: "";
  position: absolute;
  right: -80px;
  top: -80px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.25);
}}

.cover::after {{
  content: "";
  position: absolute;
  left: -50px;
  bottom: 40px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.12);
}}

.cover-inner {{
  position: relative;
  z-index: 1;
  min-height: 240mm;
  display: flex;
  flex-direction: column;
}}

.brand-mark {{
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 36px;
}}

.brand-icon {{
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: {WHITE};
  color: {NAVY};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 0 0 2px {GOLD};
}}

.brand-name {{
  font-size: 12pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.92;
}}

.cover h1 {{
  font-size: 26pt;
  line-height: 1.15;
  margin: 0 0 12px 0;
  font-weight: 700;
  color: {WHITE};
  border: none;
  padding: 0;
  max-width: 95%;
}}

.cover .subtitle {{
  font-size: 13pt;
  opacity: 0.95;
  margin: 0 0 8px 0;
}}

.cover .pill {{
  display: inline-block;
  margin-top: 16px;
  padding: 7px 14px;
  border: 1px solid rgba(245, 158, 11, 0.55);
  border-radius: 999px;
  font-size: 9.5pt;
  letter-spacing: 0.04em;
  background: rgba(245, 158, 11, 0.12);
}}

.cover-meta {{
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.28);
}}

.cover-meta .label {{
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
  margin-bottom: 3px;
}}

.cover-meta .value {{
  font-size: 11pt;
  font-weight: 600;
}}

/* ── Front pages (TOC etc.) ── */
.front-page {{
  page-break-after: always;
  padding: 4mm 2mm 4mm 2mm;
}}

.front-page h1 {{
  color: {NAVY};
  font-size: 16pt;
  margin: 0 0 10pt 0;
  padding-bottom: 6px;
  border-bottom: 2px solid {PURPLE};
}}

.toc-list, .lof-list, .lot-list {{
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}}

.toc-list li, .lof-list li, .lot-list li {{
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 3px 0;
  font-size: 9.5pt;
  line-height: 1.35;
}}

.toc-list li.level-2 {{
  padding-left: 14px;
  font-size: 9pt;
  color: {GRAY};
}}

.toc-list a, .lof-list a, .lot-list a {{
  color: {BLACK};
  text-decoration: none;
  flex: 0 1 auto;
}}

.toc-list .dots, .lof-list .dots, .lot-list .dots {{
  flex: 1 1 auto;
  border-bottom: 1px dotted {BORDER};
  height: 0.85em;
  min-width: 12px;
}}

.toc-list .page-ref, .lof-list .page-ref, .lot-list .page-ref {{
  color: {NAVY};
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}}

/* ── Main content ── */
.content {{
  padding: 2mm 1mm 2mm 1mm;
}}

.content h1 {{
  color: {NAVY};
  font-size: 15pt;
  font-weight: 700;
  margin: 10pt 0 7pt 0;
  padding-bottom: 4px;
  border-bottom: 1.5px solid {NAVY_LIGHT};
  page-break-after: avoid;
  page-break-before: auto;
  line-height: 1.25;
}}

.content h1.chapter-break {{
  page-break-before: always;
  margin-top: 0;
}}

.content > h1:first-of-type {{
  page-break-before: auto;
  margin-top: 0;
}}

.content h2 {{
  color: {PURPLE};
  font-size: 11.5pt;
  font-weight: 700;
  margin: 9pt 0 5pt 0;
  page-break-after: avoid;
}}

.content h3 {{
  color: {NAVY_MID};
  font-size: 10.5pt;
  font-weight: 650;
  margin: 7pt 0 4pt 0;
  page-break-after: avoid;
}}

.content p {{
  margin: 0 0 6pt 0;
  orphans: 2;
  widows: 2;
  text-align: left;
}}

.content ul, .content ol {{
  margin: 0 0 7pt 0;
  padding-left: 16px;
}}

.content li {{
  margin: 2pt 0;
}}

.content strong {{ color: {INK}; }}

hr {{
  border: none;
  border-top: 1px solid {BORDER};
  margin: 8pt 0;
}}

/* ── Shot page: exactly up to 2 screenshot blocks, then page break ── */
.shot-page {{
  page-break-after: always;
  page-break-inside: avoid;
  display: flex;
  flex-direction: column;
  gap: 7mm;
  margin: 4pt 0 0 0;
  min-height: 0;
}}

.shot-page:last-of-type {{
  page-break-after: auto;
}}

.shot-block {{
  page-break-inside: avoid;
  margin: 0;
  border: 1px solid {BORDER};
  border-radius: 6px;
  padding: 3.5mm;
  background: {WHITE};
}}

.shot-block .split {{
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: 4.5mm;
  align-items: start;
  margin: 0;
}}

.shot-block.split-reverse .split,
.shot-block.is-reverse .split {{
  grid-template-columns: 1.05fr 1fr;
}}

.shot-block.is-reverse .split {{
  direction: rtl;
}}

.shot-block.is-reverse .split > * {{
  direction: ltr;
}}

.shot-meta {{
  margin: 0;
}}

.shot-meta .shot-title {{
  font-size: 10.5pt;
  font-weight: 700;
  color: {NAVY};
  margin: 0 0 4pt 0;
  line-height: 1.3;
}}

.shot-meta .shot-k {{
  font-size: 8pt;
  font-weight: 700;
  color: {PURPLE};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 5pt 0 2pt 0;
}}

.shot-meta p {{
  font-size: 9pt;
  line-height: 1.4;
  margin: 0 0 3pt 0;
  color: {INK};
}}

.shot-meta ul {{
  margin: 0 0 4pt 0;
  padding-left: 14px;
  font-size: 9pt;
}}

.shot-meta li {{
  margin: 1.5pt 0;
}}

.shot-block .img-frame {{
  width: 100%;
  height: 78mm;
  max-height: 78mm;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0B0B0E;
  border: 1px solid {BORDER};
  border-radius: 5px;
  overflow: hidden;
}}

.shot-block .fig-portrait .img-frame {{
  height: 88mm;
  max-height: 88mm;
}}

.shot-block .fig {{
  margin: 0;
  text-align: center;
}}

.shot-block .fig img {{
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  border: none;
  background: transparent;
}}

.shot-block figcaption {{
  margin: 3pt 0 0 0;
  font-size: 8pt;
  color: {GRAY};
  text-align: center;
  font-weight: 600;
  line-height: 1.25;
}}

/* Generic split (non-shot) */
.split {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  align-items: start;
  margin: 6pt 0 8pt 0;
}}

.split-reverse {{
  direction: rtl;
}}

.split-reverse > * {{
  direction: ltr;
}}

/* Tables */
table {{
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  margin: 4pt 0 6pt 0;
  line-height: 1.35;
}}

th {{
  background: {NAVY};
  color: {WHITE};
  font-weight: 600;
  text-align: left;
  padding: 5px 7px;
  border: 1px solid {NAVY};
}}

td {{
  padding: 4px 7px;
  border: 1px solid {BORDER};
  vertical-align: top;
}}

tbody tr:nth-child(even) td {{
  background: {SURFACE};
}}

.tbl-cap {{
  font-size: 8pt;
  color: {GRAY};
  margin: 1pt 0 3pt 0;
  font-weight: 600;
}}

.tbl-wrap {{
  margin: 5pt 0 8pt 0;
  page-break-inside: avoid;
}}

/* Callouts */
.note, .benefit {{
  margin: 5pt 0;
  padding: 6px 10px;
  background: {SURFACE};
  border-left: 3px solid {PURPLE};
  border-radius: 0 4px 4px 0;
  font-size: 9pt;
  page-break-inside: avoid;
}}

.benefit {{ border-left-color: {SUCCESS}; }}

.note p, .benefit p {{ margin: 0; }}

/* Diagrams */
.fig-diagram {{
  margin: 6pt 0 8pt 0;
  text-align: center;
  page-break-inside: avoid;
}}

.fig-diagram svg {{
  max-width: 100%;
  height: auto;
  max-height: 72mm;
  display: block;
  margin: 0 auto;
  border: 1px solid {BORDER};
  border-radius: 5px;
  background: {SURFACE};
}}

.fig-diagram figcaption {{
  margin-top: 3pt;
  font-size: 8pt;
  color: {GRAY};
  font-weight: 600;
}}

pre {{
  background: {SURFACE};
  border: 1px solid {BORDER};
  border-radius: 4px;
  padding: 6px 8px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 8pt;
  line-height: 1.35;
  white-space: pre-wrap;
  margin: 4pt 0 6pt 0;
}}

code {{
  font-family: Consolas, "Courier New", monospace;
  font-size: 8.5pt;
  background: {NAVY_LIGHT};
  color: {NAVY};
  padding: 0 3px;
  border-radius: 2px;
}}

.badge {{
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 7.5pt;
  font-weight: 600;
  background: {NAVY_LIGHT};
  color: {NAVY};
}}

.feature-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 5pt 0;
}}

.feature-item {{
  border: 1px solid {BORDER};
  border-radius: 5px;
  padding: 6px 8px;
}}

.feature-item h4 {{
  margin: 0 0 3px 0;
  color: {NAVY};
  font-size: 9.5pt;
}}

.feature-item p {{
  margin: 0;
  font-size: 8.5pt;
  color: {GRAY};
}}

h1, h2, h3, h4 {{
  page-break-after: avoid;
}}

.keep-together {{
  page-break-inside: avoid;
}}
"""
