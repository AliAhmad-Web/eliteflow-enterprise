"""Brand-colored SVG diagrams for EliteFlow enterprise documentation."""

from __future__ import annotations

from .brand import (
    BLACK,
    BORDER,
    GOLD,
    GRAY,
    GRAY_LIGHT,
    NAVY,
    NAVY_DEEP,
    NAVY_LIGHT,
    NAVY_MID,
    PURPLE,
    PURPLE_SOFT,
    SUCCESS,
    SURFACE,
    WHITE,
)

W = 860


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _box(
    x: float,
    y: float,
    w: float,
    h: float,
    label: str,
    *,
    fill: str = WHITE,
    stroke: str = NAVY,
    sw: float = 1.5,
    rx: float = 6,
    fs: int = 12,
    fc: str = BLACK,
    sub: str | None = None,
    sub_fs: int = 10,
) -> str:
    lines = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    ]
    cy = y + h / 2
    if sub:
        lines.append(
            f'<text x="{x + w / 2}" y="{cy - 4}" text-anchor="middle" '
            f'font-family="Segoe UI,Arial,sans-serif" font-size="{fs}" '
            f'font-weight="600" fill="{fc}">{_esc(label)}</text>'
        )
        lines.append(
            f'<text x="{x + w / 2}" y="{cy + 12}" text-anchor="middle" '
            f'font-family="Segoe UI,Arial,sans-serif" font-size="{sub_fs}" '
            f'fill="{GRAY}">{_esc(sub)}</text>'
        )
    else:
        lines.append(
            f'<text x="{x + w / 2}" y="{cy + 4}" text-anchor="middle" '
            f'font-family="Segoe UI,Arial,sans-serif" font-size="{fs}" '
            f'font-weight="600" fill="{fc}">{_esc(label)}</text>'
        )
    return "\n".join(lines)


def _arrow(x1: float, y1: float, x2: float, y2: float, *, color: str = NAVY, sw: float = 1.4) -> str:
    return (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{color}" stroke-width="{sw}" marker-end="url(#arrow)"/>'
    )


def _line(x1: float, y1: float, x2: float, y2: float, *, color: str = BORDER, sw: float = 1.2) -> str:
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>'


def _label(x: float, y: float, text: str, *, fs: int = 10, fill: str = GRAY, anchor: str = "middle") -> str:
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
        f'font-family="Segoe UI,Arial,sans-serif" font-size="{fs}" fill="{fill}">{_esc(text)}</text>'
    )


def _defs() -> str:
    return f"""
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="{NAVY}"/>
    </marker>
    <marker id="arrow-p" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="{PURPLE}"/>
    </marker>
    <marker id="arrow-g" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="{GOLD}"/>
    </marker>
  </defs>"""


def _svg(height: int, body: str, title: str = "") -> str:
    t = f'<title>{_esc(title)}</title>' if title else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" '
        f'viewBox="0 0 {W} {height}" role="img">{t}{_defs()}\n{body}\n</svg>'
    )


def _header_bar(title: str, y: float = 8) -> str:
    return (
        f'<rect x="0" y="0" width="{W}" height="36" fill="{NAVY_DEEP}"/>'
        f'<text x="20" y="{y + 16}" font-family="Segoe UI,Arial,sans-serif" '
        f'font-size="14" font-weight="700" fill="{WHITE}">{_esc(title)}</text>'
        f'<rect x="{W - 28}" y="12" width="12" height="12" rx="2" fill="{GOLD}"/>'
    )


# ── Public diagram functions ───────────────────────────────────────────────


def svg_system_architecture() -> str:
    body = f"""
{_header_bar("EliteFlow — System Architecture")}
{_box(30, 55, 130, 48, "Web App", fill=NAVY_LIGHT, stroke=NAVY, sub="Next.js / React")}
{_box(180, 55, 130, 48, "Desktop", fill=NAVY_LIGHT, stroke=NAVY, sub="Electron")}
{_box(330, 55, 130, 48, "Android", fill=NAVY_LIGHT, stroke=NAVY, sub="Expo 57")}
{_box(480, 55, 130, 48, "Extension", fill=NAVY_LIGHT, stroke=NAVY, sub="Chrome MV3")}
{_box(680, 55, 150, 48, "Admins / Users", fill=SURFACE, stroke=GRAY, sub="Browsers & devices")}
{_arrow(95, 103, 280, 150)}
{_arrow(245, 103, 360, 150)}
{_arrow(395, 103, 420, 150)}
{_arrow(545, 103, 480, 150)}
{_box(200, 150, 460, 56, "API Gateway / Express Backend", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="REST · JWT · RBAC · Rate limits")}
{_arrow(320, 206, 180, 250)}
{_arrow(430, 206, 430, 250)}
{_arrow(540, 206, 680, 250)}
{_box(60, 250, 200, 70, "PostgreSQL", fill=WHITE, stroke=NAVY_MID, sub="Prisma ORM · migrations")}
{_box(320, 250, 220, 70, "Redis / Cache", fill=WHITE, stroke=NAVY_MID, sub="Sessions · queues · pub/sub")}
{_box(580, 250, 220, 70, "External Services", fill=WHITE, stroke=GOLD, sub="Stripe · SMTP · AI · Storage")}
{_label(430, 350, "Clients → API → Data & Integrations", fs=11, fill=GRAY)}
"""
    return _svg(370, body, "System Architecture")


def svg_deployment() -> str:
    body = f"""
{_header_bar("Deployment Topology")}
{_box(40, 55, 240, 90, "Vercel", fill=NAVY_LIGHT, stroke=NAVY, sub="eliteflow-web (Next.js)", fs=13)}
{_label(160, 130, "CDN · Edge · Preview deploys", fs=10)}
{_box(310, 55, 240, 90, "Railway", fill="#F3E8FF", stroke=PURPLE, sub="Express API + workers", fs=13)}
{_label(430, 130, "api-production · env secrets", fs=10)}
{_box(580, 55, 240, 90, "Managed DB", fill=SURFACE, stroke=NAVY_MID, sub="PostgreSQL + Redis", fs=13)}
{_label(700, 130, "Backups · connection pools", fs=10)}
{_arrow(280, 100, 310, 100)}
{_arrow(550, 100, 580, 100)}
{_box(120, 180, 280, 55, "CI/CD", fill=WHITE, stroke=GRAY, sub="GitHub Actions · lint · build · deploy")}
{_box(460, 180, 280, 55, "Observability", fill=WHITE, stroke=GRAY, sub="Logs · health · uptime checks")}
{_arrow(260, 145, 260, 180)}
{_arrow(430, 145, 560, 180)}
{_label(430, 265, "Production: Web (Vercel) · API (Railway) · Data (managed)", fs=11)}
"""
    return _svg(285, body, "Deployment Topology")


def svg_auth_flow() -> str:
    steps = [
        (30, "Login"),
        (170, "Validate"),
        (310, "Issue JWT"),
        (450, "Attach Claims"),
        (590, "Authorize"),
        (730, "Access"),
    ]
    boxes = []
    for i, (x, label) in enumerate(steps):
        fill = PURPLE if i in (2, 4) else (NAVY if i == 0 else WHITE)
        fc = WHITE if i in (0, 2, 4) else BLACK
        stroke = PURPLE if i in (2, 4) else NAVY
        boxes.append(_box(x, 70, 120, 44, label, fill=fill, stroke=stroke, fc=fc, fs=12))
        if i < len(steps) - 1:
            boxes.append(_arrow(x + 120, 92, steps[i + 1][0], 92))
    body = f"""
{_header_bar("Authentication & Authorization Flow")}
{"".join(boxes)}
{_box(30, 150, 250, 70, "Credentials", fill=SURFACE, stroke=BORDER, sub="Email / password · OAuth optional")}
{_box(305, 150, 250, 70, "Token Payload", fill=SURFACE, stroke=BORDER, sub="sub · role · org · exp")}
{_box(580, 150, 250, 70, "Guards", fill=SURFACE, stroke=BORDER, sub="JWT guard · Roles guard · Policies")}
{_arrow(155, 114, 155, 150)}
{_arrow(430, 114, 430, 150)}
{_arrow(650, 114, 705, 150)}
{_label(430, 250, "Fail closed: invalid/expired tokens → 401 · insufficient role → 403", fs=11)}
"""
    return _svg(270, body, "Auth Flow")


def svg_rbac_hierarchy() -> str:
    body = f"""
{_header_bar("RBAC Hierarchy")}
{_box(330, 55, 200, 42, "SUPER_ADMIN", fill=NAVY_DEEP, stroke=NAVY_DEEP, fc=WHITE, fs=12)}
{_arrow(430, 97, 430, 120)}
{_box(330, 120, 200, 42, "ADMIN", fill=NAVY, stroke=NAVY, fc=WHITE, fs=12)}
{_arrow(430, 162, 280, 190)}
{_arrow(430, 162, 580, 190)}
{_box(180, 190, 200, 42, "EMPLOYEE", fill=PURPLE, stroke=PURPLE, fc=WHITE, fs=12)}
{_box(480, 190, 200, 42, "CLIENT", fill=NAVY_LIGHT, stroke=NAVY, fc=NAVY, fs=12)}
{_line(280, 232, 280, 255, color=BORDER)}
{_line(580, 232, 580, 255, color=BORDER)}
{_box(130, 255, 300, 70, "Assigned work · CRM · tasks · AI · chat", fill=WHITE, stroke=BORDER, fs=11)}
{_box(430, 255, 300, 70, "Client portal · own projects · invoices", fill=WHITE, stroke=BORDER, fs=11)}
{_label(430, 350, "EliteFlow roles: SUPER_ADMIN · ADMIN · EMPLOYEE · CLIENT", fs=11)}
"""
    return _svg(370, body, "RBAC Hierarchy")


def svg_module_map() -> str:
    modules = [
        ("Dashboard", 40, 55),
        ("Tasks", 180, 55),
        ("CRM", 320, 55),
        ("Meetings", 460, 55),
        ("Chat", 600, 55),
        ("AI Hub", 740, 55),
        ("Notifications", 40, 130),
        ("Analytics", 180, 130),
        ("Inventory*", 320, 130),
        ("Billing", 460, 130),
        ("Settings", 600, 130),
        ("Admin", 740, 130),
    ]
    parts = [_header_bar("Application Module Map")]
    for label, x, y in modules:
        is_road = label.endswith("*")
        fill = "#FEF3C7" if is_road else NAVY_LIGHT
        stroke = GOLD if is_road else NAVY
        parts.append(_box(x, y, 120, 48, label.replace("*", ""), fill=fill, stroke=stroke, fs=11))
    parts.append(_box(200, 210, 460, 50, "Shared Kernel", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Auth · RBAC · API client · Design system"))
    parts.append(_arrow(430, 178, 430, 210, color=PURPLE))
    parts.append(_label(430, 290, "* Inventory module on product roadmap", fs=10, fill=GRAY_LIGHT))
    return _svg(310, "\n".join(parts), "Module Map")


def svg_ai_workflow() -> str:
    body = f"""
{_header_bar("AI Assistant Workflow")}
{_box(40, 60, 150, 50, "User Prompt", fill=NAVY_LIGHT, stroke=NAVY)}
{_arrow(190, 85, 230, 85)}
{_box(230, 60, 160, 50, "Context Pack", fill=WHITE, stroke=NAVY, sub="User · org · module")}
{_arrow(390, 85, 430, 85)}
{_box(430, 60, 180, 50, "LLM Provider", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Chat / tools")}
{_arrow(610, 85, 650, 85)}
{_box(650, 60, 170, 50, "Response", fill=SUCCESS, stroke=SUCCESS, fc=WHITE, sub="Stream / store")}
{_box(120, 150, 200, 60, "Guardrails", fill=SURFACE, stroke=GOLD, sub="PII filter · rate limits")}
{_box(360, 150, 200, 60, "Tool Calls", fill=SURFACE, stroke=NAVY_MID, sub="Search · create task")}
{_box(600, 150, 200, 60, "Audit Log", fill=SURFACE, stroke=GRAY, sub="Prompt · tokens · result")}
{_arrow(520, 110, 460, 150, color=PURPLE)}
{_arrow(720, 110, 700, 150, color=PURPLE)}
{_label(430, 245, "AI Hub: contextual assistance across tasks, CRM, meetings, and chat", fs=11)}
"""
    return _svg(265, body, "AI Workflow")


def svg_notification_flow() -> str:
    body = f"""
{_header_bar("Notification Pipeline")}
{_box(40, 60, 180, 55, "Domain Event", fill=NAVY, stroke=NAVY, fc=WHITE, sub="task.assigned · mention")}
{_arrow(220, 87, 270, 87)}
{_box(270, 60, 200, 55, "Notification Service", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Fan-out · preferences")}
{_arrow(470, 87, 520, 87)}
{_box(520, 55, 150, 40, "In-App", fill=NAVY_LIGHT, stroke=NAVY, fs=11)}
{_box(520, 105, 150, 40, "Email / Push", fill=NAVY_LIGHT, stroke=NAVY, fs=11)}
{_box(700, 70, 130, 55, "User Inbox", fill=WHITE, stroke=GOLD, sub="Read · dismiss")}
{_arrow(670, 75, 700, 90)}
{_arrow(670, 125, 700, 110)}
{_label(430, 185, "Respects mute rules, quiet hours, and channel preferences", fs=11)}
"""
    return _svg(210, body, "Notification Flow")


def svg_task_lifecycle() -> str:
    states = ["Backlog", "Todo", "In Progress", "Review", "Done"]
    parts = [_header_bar("Task Lifecycle")]
    x0 = 40
    for i, s in enumerate(states):
        x = x0 + i * 160
        fill = SUCCESS if s == "Done" else (PURPLE if s == "In Progress" else WHITE)
        fc = WHITE if s in ("Done", "In Progress") else BLACK
        stroke = SUCCESS if s == "Done" else (PURPLE if s == "In Progress" else NAVY)
        parts.append(_box(x, 70, 130, 48, s, fill=fill, stroke=stroke, fc=fc, fs=12))
        if i < len(states) - 1:
            parts.append(_arrow(x + 130, 94, x + 160, 94))
    parts.append(_box(120, 160, 280, 55, "Assignees · Due dates · Priority", fill=SURFACE, stroke=BORDER, fs=11))
    parts.append(_box(460, 160, 280, 55, "Comments · Attachments · Activity", fill=SURFACE, stroke=BORDER, fs=11))
    parts.append(_label(430, 250, "Transitions enforced by RBAC and board workflow rules", fs=11))
    return _svg(270, "\n".join(parts), "Task Lifecycle")


def svg_chat_flow() -> str:
    body = f"""
{_header_bar("Real-time Chat Flow")}
{_box(40, 60, 160, 50, "Client A", fill=NAVY_LIGHT, stroke=NAVY, sub="WebSocket")}
{_arrow(200, 85, 260, 85)}
{_box(260, 55, 340, 60, "Chat Gateway", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Rooms · presence · delivery ack")}
{_arrow(600, 85, 660, 85)}
{_box(660, 60, 160, 50, "Client B", fill=NAVY_LIGHT, stroke=NAVY, sub="WebSocket")}
{_arrow(430, 115, 430, 155)}
{_box(280, 155, 300, 55, "Persistence", fill=WHITE, stroke=NAVY_MID, sub="Messages · threads · attachments")}
{_label(430, 245, "Direct messages, channels, mentions → notification fan-out", fs=11)}
"""
    return _svg(265, body, "Chat Flow")


def svg_meeting_flow() -> str:
    body = f"""
{_header_bar("Meeting Lifecycle")}
{_box(40, 65, 140, 48, "Schedule", fill=NAVY, stroke=NAVY, fc=WHITE)}
{_arrow(180, 89, 220, 89)}
{_box(220, 65, 140, 48, "Invite", fill=NAVY_LIGHT, stroke=NAVY)}
{_arrow(360, 89, 400, 89)}
{_box(400, 65, 140, 48, "Remind", fill=WHITE, stroke=PURPLE)}
{_arrow(540, 89, 580, 89)}
{_box(580, 65, 140, 48, "Conduct", fill=PURPLE, stroke=PURPLE, fc=WHITE)}
{_arrow(720, 89, 740, 89)}
{_box(720, 55, 110, 68, "Notes", fill=SUCCESS, stroke=SUCCESS, fc=WHITE, sub="Actions")}
{_box(150, 160, 240, 55, "Calendar sync", fill=SURFACE, stroke=BORDER, sub="ICS · timezone aware")}
{_box(470, 160, 240, 55, "Follow-ups", fill=SURFACE, stroke=BORDER, sub="Tasks linked to meeting")}
{_label(430, 250, "Meetings drive attendance, notes, and actionable follow-ups", fs=11)}
"""
    return _svg(270, body, "Meeting Flow")


def svg_crm_flow() -> str:
    body = f"""
{_header_bar("CRM Pipeline")}
{_box(40, 65, 130, 48, "Lead", fill=NAVY_LIGHT, stroke=NAVY)}
{_arrow(170, 89, 200, 89)}
{_box(200, 65, 130, 48, "Qualified", fill=WHITE, stroke=NAVY)}
{_arrow(330, 89, 360, 89)}
{_box(360, 65, 130, 48, "Proposal", fill=WHITE, stroke=PURPLE)}
{_arrow(490, 89, 520, 89)}
{_box(520, 65, 130, 48, "Negotiation", fill="#F3E8FF", stroke=PURPLE)}
{_arrow(650, 89, 680, 89)}
{_box(680, 65, 140, 48, "Won / Lost", fill=SUCCESS, stroke=SUCCESS, fc=WHITE)}
{_box(120, 155, 280, 55, "Contacts & Companies", fill=SURFACE, stroke=BORDER, sub="Activities · notes · owners")}
{_box(460, 155, 280, 55, "Deals & Forecasting", fill=SURFACE, stroke=BORDER, sub="Value · stage · close date")}
{_label(430, 245, "CRM stages are configurable per organization", fs=11)}
"""
    return _svg(265, body, "CRM Flow")


def svg_inventory_placeholder() -> str:
    body = f"""
{_header_bar("Inventory Module (Roadmap)")}
{_box(80, 60, 700, 70, "Planned Inventory Capability", fill="#FFFBEB", stroke=GOLD, fs=14,
     sub="SKU catalog · stock levels · warehouses · low-stock alerts · PO drafts")}
{_label(430, 150, "Not in current production release — architecture reserved", fs=11, fill=GRAY)}
{_box(120, 175, 180, 45, "Items", fill=WHITE, stroke=BORDER, fs=11)}
{_box(340, 175, 180, 45, "Stock Moves", fill=WHITE, stroke=BORDER, fs=11)}
{_box(560, 175, 180, 45, "Suppliers", fill=WHITE, stroke=BORDER, fs=11)}
{_label(430, 255, "Integrates with CRM deals and task follow-ups when shipped", fs=11)}
"""
    return _svg(275, body, "Inventory Roadmap")


def svg_desktop_arch() -> str:
    body = f"""
{_header_bar("Desktop Client Architecture (Electron)")}
{_box(60, 60, 220, 70, "Renderer", fill=NAVY_LIGHT, stroke=NAVY, sub="React UI · shared web views")}
{_box(320, 60, 220, 70, "Preload Bridge", fill=WHITE, stroke=PURPLE, sub="Context-isolated IPC")}
{_box(580, 60, 220, 70, "Main Process", fill=NAVY, stroke=NAVY, fc=WHITE, sub="Window · tray · updates")}
{_arrow(280, 95, 320, 95)}
{_arrow(540, 95, 580, 95)}
{_arrow(690, 130, 690, 170)}
{_box(520, 170, 280, 55, "EliteFlow API", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Same JWT auth as web")}
{_box(60, 170, 280, 55, "Local Preferences", fill=SURFACE, stroke=BORDER, sub="Secure storage · shortcuts")}
{_label(430, 260, "Desktop reuses web feature modules behind a native shell", fs=11)}
"""
    return _svg(280, body, "Desktop Architecture")


def svg_android_arch() -> str:
    body = f"""
{_header_bar("Android Client Architecture (Expo)")}
{_box(50, 60, 180, 55, "Screens", fill=NAVY_LIGHT, stroke=NAVY, sub="Expo Router", fs=11)}
{_box(250, 60, 180, 55, "Features", fill=WHITE, stroke=NAVY, sub="RN modules", fs=11)}
{_box(450, 60, 180, 55, "TanStack Query", fill=WHITE, stroke=PURPLE, sub="Zustand", fs=11)}
{_box(650, 60, 170, 55, "API Client", fill=PURPLE, stroke=PURPLE, fc=WHITE, fs=11)}
{_arrow(230, 87, 250, 87)}
{_arrow(430, 87, 450, 87)}
{_arrow(630, 87, 650, 87)}
{_arrow(735, 115, 735, 155)}
{_box(560, 155, 260, 55, "Railway REST /api/v1", fill=NAVY, stroke=NAVY, fc=WHITE, sub="JWT · Expo push")}
{_box(50, 155, 280, 55, "SecureStore + Offline Queue", fill=SURFACE, stroke=BORDER, sub="Biometrics · cache")}
{_label(430, 245, "Expo SDK 57 · React Native mirrors core modules: clients, projects, tasks, AI, chat", fs=11)}
"""
    return _svg(265, body, "Android Architecture")


def svg_extension_arch() -> str:
    body = f"""
{_header_bar("Browser Extension Architecture (MV3)")}
{_box(40, 60, 200, 60, "Popup UI", fill=NAVY_LIGHT, stroke=NAVY, sub="Quick actions")}
{_box(280, 60, 200, 60, "Service Worker", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="Background events")}
{_box(520, 60, 300, 60, "Content Scripts", fill=WHITE, stroke=NAVY, sub="Page context helpers")}
{_arrow(240, 90, 280, 90)}
{_arrow(480, 90, 520, 90)}
{_arrow(380, 120, 380, 165)}
{_box(230, 165, 400, 55, "EliteFlow API", fill=NAVY, stroke=NAVY, fc=WHITE, sub="Auth token · capture lead / task")}
{_label(430, 255, "Extension for capture workflows without leaving the browser tab", fs=11)}
"""
    return _svg(275, body, "Extension Architecture")


def svg_db_erd_overview() -> str:
    entities = [
        ("User", 40, 55),
        ("Organization", 200, 55),
        ("Role", 360, 55),
        ("Task", 520, 55),
        ("Project", 680, 55),
        ("Contact", 40, 145),
        ("Deal", 200, 145),
        ("Meeting", 360, 145),
        ("Message", 520, 145),
        ("Notification", 680, 145),
    ]
    parts = [_header_bar("Database ERD Overview (logical)")]
    for label, x, y in entities:
        parts.append(_box(x, y, 140, 50, label, fill=WHITE, stroke=NAVY, fs=12))
    # relationship hints
    parts.append(_line(180, 80, 200, 80, color=NAVY_MID, sw=1.3))
    parts.append(_line(340, 80, 360, 80, color=NAVY_MID, sw=1.3))
    parts.append(_line(500, 80, 520, 80, color=NAVY_MID, sw=1.3))
    parts.append(_line(660, 80, 680, 80, color=NAVY_MID, sw=1.3))
    parts.append(_line(110, 105, 110, 145, color=PURPLE, sw=1.3))
    parts.append(_line(270, 105, 270, 145, color=PURPLE, sw=1.3))
    parts.append(_line(430, 105, 430, 145, color=PURPLE, sw=1.3))
    parts.append(_line(590, 105, 590, 145, color=PURPLE, sw=1.3))
    parts.append(_line(750, 105, 750, 145, color=PURPLE, sw=1.3))
    parts.append(_box(180, 230, 500, 45, "Prisma schema · PostgreSQL · relational integrity & indexes", fill=SURFACE, stroke=BORDER, fs=11))
    parts.append(_label(430, 305, "Logical overview — see schema files for full relations and enums", fs=11))
    return _svg(325, "\n".join(parts), "Database ERD Overview")


def svg_api_flow() -> str:
    body = f"""
{_header_bar("API Request Flow")}
{_box(30, 60, 140, 50, "Client", fill=NAVY_LIGHT, stroke=NAVY, sub="HTTPS")}
{_arrow(170, 85, 210, 85)}
{_box(210, 60, 150, 50, "Middleware", fill=WHITE, stroke=NAVY, sub="CORS · rate")}
{_arrow(360, 85, 400, 85)}
{_box(400, 60, 150, 50, "Auth Guard", fill=PURPLE, stroke=PURPLE, fc=WHITE, sub="JWT · RBAC")}
{_arrow(550, 85, 590, 85)}
{_box(590, 60, 140, 50, "Controller", fill=WHITE, stroke=NAVY_MID, sub="DTO validate")}
{_arrow(660, 110, 660, 145)}
{_box(520, 145, 280, 50, "Service / Domain", fill=NAVY, stroke=NAVY, fc=WHITE, sub="Business rules")}
{_arrow(520, 170, 360, 170)}
{_box(180, 145, 180, 50, "Prisma / DB", fill=SURFACE, stroke=NAVY_MID, sub="Transactions")}
{_arrow(270, 195, 270, 230)}
{_box(160, 230, 520, 45, "JSON Response · status codes · error envelope", fill=SUCCESS, stroke=SUCCESS, fc=WHITE, fs=12)}
{_label(430, 305, "Consistent REST patterns across all EliteFlow modules", fs=11)}
"""
    return _svg(325, body, "API Request Flow")
