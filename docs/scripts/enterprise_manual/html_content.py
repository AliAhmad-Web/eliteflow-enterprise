"""EliteFlow enterprise product manual — full HTML body builder.

Professional product documentation for internship submission.
Screenshots use shot_explain() with a pair buffer (max two per printed page).
"""

from __future__ import annotations

import base64
import html
import json
from typing import Any, Sequence

from . import brand, diagrams, paths

# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

with paths.CATALOG.open(encoding="utf-8") as _catalog_fp:
    CATALOG: list[dict[str, Any]] = json.load(_catalog_fp)

_CATALOG_BY_PAGE: dict[int, dict[str, Any]] = {
    int(entry["page"]): entry for entry in CATALOG
}

figure_counter = 0
table_counter = 0
_shot_buffer: list[str] = []
_shot_toggle = 0

_PLANNED_TABLES: list[str] = []


def next_fig() -> int:
    global figure_counter
    figure_counter += 1
    return figure_counter


def next_tbl() -> int:
    global table_counter
    table_counter += 1
    return table_counter


# ---------------------------------------------------------------------------
# HTML helpers
# ---------------------------------------------------------------------------


def _e(text: str | None) -> str:
    return html.escape("" if text is None else str(text), quote=True)


def _p(text: str) -> str:
    return f"<p>{_e(text)}</p>"


def _ul(items: Sequence[str]) -> str:
    lis = "".join(f"<li>{_e(item)}</li>" for item in items)
    return f"<ul>{lis}</ul>"


def _h1(title: str, slug: str, *, chapter_break: bool = False) -> str:
    cls = ' class="chapter-break"' if chapter_break else ""
    return f'<h1 id="{_e(slug)}"{cls}>{_e(title)}</h1>'


def _h2(title: str) -> str:
    return f"<h2>{_e(title)}</h2>"


def _h3(title: str) -> str:
    return f"<h3>{_e(title)}</h3>"


def _note(text: str) -> str:
    return f'<div class="note"><p>{_e(text)}</p></div>'


def _benefit(text: str) -> str:
    return f'<div class="benefit"><p>{_e(text)}</p></div>'


def _img_src(filename: str) -> str:
    """Return a data-URI so Playwright PDF can embed local screenshots reliably."""
    abs_path = paths.SCREENSHOTS / filename
    if abs_path.is_file():
        payload = base64.b64encode(abs_path.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{payload}"
    return f"screenshots/{filename}"


def shots_for(chapter: str) -> list[dict[str, Any]]:
    """Return catalog entries for a chapter key, sorted by page number."""
    return sorted(
        [e for e in CATALOG if e.get("chapter") == chapter],
        key=lambda e: int(e["page"]),
    )


def fig_html(
    page_num: int,
    explanation: str = "",
    *,
    fig_num: int | None = None,
) -> str:
    """Emit a numbered figure for a catalog screenshot page (single figcaption)."""
    entry = _CATALOG_BY_PAGE.get(int(page_num))
    n = fig_num if fig_num is not None else next_fig()
    if entry is None:
        return (
            f'<figure class="fig fig-missing" id="fig-shot-{int(page_num)}">'
            f"<figcaption>Figure {n} — Screenshot page {int(page_num)} "
            f"(not in catalog)</figcaption></figure>"
        )

    filename = str(entry.get("file") or f"page-{int(page_num):02d}.png")
    caption = str(entry.get("caption") or entry.get("module") or filename)
    orientation = str(entry.get("orientation") or "landscape").lower()
    orient_cls = "fig-portrait" if orientation == "portrait" else "fig-landscape"
    img_cls = "portrait" if orientation == "portrait" else "landscape"
    src = _img_src(filename)
    _ = explanation
    return (
        f'<figure class="fig {orient_cls}" id="fig-shot-{int(page_num)}">'
        f'<div class="img-frame">'
        f'<img class="{img_cls}" src="{src}" alt="{_e(caption)}" '
        f'data-file="{_e(filename)}" />'
        f"</div>"
        f"<figcaption>Figure {n} — {_e(caption)}</figcaption>"
        f"</figure>"
    )


def table_html(
    title: str,
    headers: Sequence[str],
    rows: Sequence[Sequence[str]],
) -> str:
    """Emit a compact numbered documentation table."""
    n = next_tbl()
    _PLANNED_TABLES.append(title)
    thead = "".join(f"<th>{_e(h)}</th>" for h in headers)
    body_rows = []
    for row in rows:
        cells = "".join(f"<td>{_e(c)}</td>" for c in row)
        body_rows.append(f"<tr>{cells}</tr>")
    tbody = "".join(body_rows)
    return (
        f'<div class="tbl-wrap">'
        f'<p class="tbl-cap">Table {n} — {_e(title)}</p>'
        f"<table><thead><tr>{thead}</tr></thead>"
        f"<tbody>{tbody}</tbody></table></div>"
    )


def _diag(svg: str, caption: str) -> str:
    n = next_fig()
    return (
        f'<figure class="fig fig-diagram">'
        f"{svg}"
        f"<figcaption>Figure {n} — {_e(caption)}</figcaption>"
        f"</figure>"
    )


def shot_explain(
    page_num: int,
    *,
    title: str,
    purpose: str,
    seeing: str,
    buttons: list[str],
    workflow: str,
    business: str,
) -> str:
    """Build one magazine shot-block; buffer into pairs of 2 then emit .shot-page."""
    global _shot_toggle
    reverse = _shot_toggle % 2 == 1
    _shot_toggle += 1

    n = next_fig()
    reverse_cls = " is-reverse" if reverse else ""
    btn_lis = "".join(f"<li>{_e(b)}</li>" for b in buttons)
    block = (
        f'<div class="shot-block{reverse_cls}">'
        f'<div class="split">'
        f'<div class="shot-meta">'
        f'<p class="shot-title">Figure {n} — {_e(title)}</p>'
        f'<p class="shot-k">Purpose</p><p>{_e(purpose)}</p>'
        f'<p class="shot-k">What you see</p><p>{_e(seeing)}</p>'
        f'<p class="shot-k">Key controls</p><ul>{btn_lis}</ul>'
        f'<p class="shot-k">Workflow</p><p>{_e(workflow)}</p>'
        f'<p class="shot-k">Business value</p><p>{_e(business)}</p>'
        f"</div>"
        f'<div class="split-media">{fig_html(page_num, fig_num=n)}</div>'
        f"</div></div>"
    )
    _shot_buffer.append(block)
    if len(_shot_buffer) >= 2:
        return flush_shots()
    return ""


def flush_shots() -> str:
    """Emit any buffered shot-blocks inside a .shot-page wrapper."""
    if not _shot_buffer:
        return ""
    page = f'<div class="shot-page">{"".join(_shot_buffer)}</div>'
    _shot_buffer.clear()
    return page


def _tech_stack_diagram() -> str:
    svg_fn = getattr(diagrams, "svg_tech_stack", None)
    if callable(svg_fn):
        return _diag(svg_fn(), "EliteFlow technology stack layers")
    return _diag(
        diagrams.svg_system_architecture(),
        "EliteFlow system architecture (technology layers across clients, API, and data)",
    )


# ---------------------------------------------------------------------------
# TOC
# ---------------------------------------------------------------------------


def toc_entries() -> list[tuple[str, str, int]]:
    """Static TOC: (title, slug, heading level). Product chapters only."""
    return [
        ("Cover", "cover", 0),
        ("Document Overview", "document-overview", 0),
        ("Table of Contents", "toc", 0),
        ("List of Figures", "list-of-figures", 0),
        ("List of Tables", "list-of-tables", 0),
        ("Introduction", "introduction", 1),
        ("Problem Statement", "problem-statement", 1),
        ("Objectives", "objectives", 1),
        ("Scope", "scope", 1),
        ("Vision", "vision", 1),
        ("Mission", "mission", 1),
        ("Technology Stack", "technology-stack", 1),
        ("System Architecture", "system-architecture", 1),
        ("Database Architecture", "database-architecture", 1),
        ("Authentication", "authentication", 1),
        ("Security", "security", 1),
        ("AI Integration", "ai-integration", 1),
        ("Deployment", "deployment", 1),
        ("Web Application", "web-application", 1),
        ("Desktop Application", "desktop-application", 1),
        ("Android Application", "android-application", 1),
        ("Chrome Extension", "chrome-extension", 1),
        ("Testing", "testing", 1),
        ("Future Roadmap", "future-roadmap", 1),
        ("Conclusion", "conclusion", 1),
    ]


# ---------------------------------------------------------------------------
# Front matter (product manual only)
# ---------------------------------------------------------------------------


def _front_cover() -> str:
    return f"""
<section class="front-page cover" id="cover">
  <div class="cover-brand">
    <div class="brand-mark">EF</div>
    <p class="brand-name">{_e(brand.PRODUCT)}</p>
  </div>
  <h1 class="cover-title">{_e(brand.DOC_TITLE)}</h1>
  <p class="cover-subtitle">{_e(brand.DOC_SUBTITLE)}</p>
  <p class="pill">Product Documentation</p>
  <div class="cover-meta">
    <p><strong>Product</strong> {_e(brand.PRODUCT)}</p>
    <p><strong>Prepared by</strong> {_e(brand.AUTHOR)}</p>
    <p><strong>Organization</strong> {_e(brand.ORG)}</p>
    <p><strong>Date</strong> {_e(brand.today_str())}</p>
    <p><strong>Version</strong> {_e(brand.DOC_VERSION)}</p>
    <p><strong>Web</strong> {_e(brand.WEB_URL)}</p>
  </div>
  <p class="cover-copy">{_e(brand.COPYRIGHT)}</p>
</section>
"""


def _front_overview() -> str:
    return f"""
<section class="front-page" id="document-overview">
  <h1>Document Overview</h1>
  <p>EliteFlow is a multi-platform Enterprise Business Management product that unifies CRM,
  project delivery, workforce coordination, finance, communication, and AI-assisted productivity
  in one authenticated workspace. This manual documents the shipped system — architecture,
  platforms, security, and operational workflows — for operators, integrators, and reviewers.</p>
  <p>The product is delivered as a TypeScript monorepo: a Next.js 16 web application, an
  Express 5 REST API under <code>/api/v1</code>, an Electron desktop client, an Expo 57 Android
  app, and a Chrome Manifest V3 extension. Shared contracts live in Zod-validated packages;
  persistence uses Prisma 6 against Supabase PostgreSQL.</p>
  <p>Identity combines email/password (verification, forgot/reset) with Google OAuth via
  Supabase Auth. Authorization uses SUPER_ADMIN, ADMIN, EMPLOYEE, and CLIENT roles with
  fine-grained permission keys. Production hosting places the web client on Vercel, the API
  on Railway, and data/auth/storage on Supabase.</p>
  <div class="kpi-row">
    <div class="kpi"><strong>5</strong><span>Client apps</span></div>
    <div class="kpi"><strong>4</strong><span>RBAC roles</span></div>
    <div class="kpi"><strong>~70</strong><span>Prisma models</span></div>
    <div class="kpi"><strong>/api/v1</strong><span>REST surface</span></div>
  </div>
  <p>Audience: product owners, engineering reviewers, internship evaluators, and operators
  onboarding to EliteFlow. Scope covers the {brand.DOC_VERSION} baseline prepared by
  {brand.AUTHOR} at {brand.ORG}.</p>
</section>
"""


def _front_toc() -> str:
    items = []
    skip = {"cover", "document-overview", "toc", "list-of-figures", "list-of-tables"}
    for title, slug, level in toc_entries():
        if level == 0 and slug in skip:
            continue
        pad = "toc-l1" if level <= 1 else f"toc-l{level}"
        items.append(
            f'<li class="{pad}"><a href="#{_e(slug)}">{_e(title)}</a>'
            f'<span class="dots"></span>'
            f'<span class="page-ref" data-ref="{_e(slug)}"></span></li>'
        )
    return f"""
<section class="front-page" id="toc">
  <h1>Table of Contents</h1>
  <ol class="toc-list">
    {''.join(items)}
  </ol>
</section>
"""


def _front_lof() -> str:
    items = []
    for entry in sorted(CATALOG, key=lambda e: int(e["page"])):
        page = int(entry["page"])
        caption = str(entry.get("caption") or entry.get("module") or f"Page {page}")
        items.append(
            f'<li><a href="#fig-shot-{page}">Figure — {_e(caption)}</a>'
            f'<span class="dots"></span>'
            f'<span class="page-ref" data-fig-page="{page}"></span></li>'
        )
    return f"""
<section class="front-page" id="list-of-figures">
  <h1>List of Figures</h1>
  <p>Production screenshots from the capture catalog. Architecture and workflow diagrams
  receive sequential figure numbers when rendered in chapter content.</p>
  <ol class="lof-list">
    {''.join(items)}
  </ol>
</section>
"""


_STATIC_TABLE_TITLES: list[str] = [
    "Technology stack components",
    "Database models by domain",
    "Core permission keys",
    "API route groups (/api/v1)",
    "Deployment and packaging matrix",
    "Unit testing focus areas",
    "Integration testing focus areas",
    "Authentication test matrix",
    "Email and password-recovery tests",
    "API authorization test matrix",
    "Desktop client test matrix",
    "Android client test matrix",
    "Chrome extension test matrix",
    "Cross-browser verification",
    "Future roadmap phases",
]


def _front_lot() -> str:
    items = "".join(
        f'<li>{_e(t)} <span class="dots"></span><span class="page-ref"></span></li>'
        for t in _STATIC_TABLE_TITLES
    )
    return f"""
<section class="front-page" id="list-of-tables">
  <h1>List of Tables</h1>
  <p>Tables are numbered sequentially as they appear in the document body.</p>
  <ol class="lot-list">{items}</ol>
</section>
"""


# ---------------------------------------------------------------------------
# Platform chapter scaffold
# ---------------------------------------------------------------------------


def _platform_scaffold(
    *,
    title: str,
    slug: str,
    overview: str,
    features: Sequence[str],
    workflow: str,
    architecture: str,
    user_benefits: Sequence[str],
    technical_benefits: Sequence[str],
    business_benefits: Sequence[str],
    technologies: Sequence[str],
    api_rows: Sequence[Sequence[str]] | None,
    security: str,
    future: str,
    diagram_html: str = "",
) -> str:
    parts: list[str] = [_h1(title, slug), _h2("Overview"), _p(overview)]
    if diagram_html:
        parts.append(diagram_html)
    parts.extend([_h2("Features"), _ul(features)])
    parts.extend([_h2("Workflow"), _p(workflow)])
    parts.extend([_h2("Architecture"), _p(architecture)])
    parts.append(_h2("Benefits"))
    parts.append(_h3("User"))
    parts.append(_ul(user_benefits))
    parts.append(_h3("Technical"))
    parts.append(_ul(technical_benefits))
    parts.append(_h3("Business"))
    parts.append(_ul(business_benefits))
    parts.extend([_h2("Security"), _p(security)])
    parts.extend([_h2("Technologies"), _ul(technologies)])
    parts.append(_h2("APIs"))
    if api_rows:
        parts.append(
            table_html(
                f"{title} — /api/v1 summary",
                ["Method", "Path", "Description"],
                list(api_rows),
            )
        )
    else:
        parts.append(
            _p(
                "This client consumes the shared Express REST surface under /api/v1; "
                "it does not expose a separate public API of its own."
            )
        )
    parts.extend([_h2("Future Scope"), _p(future)])
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Core chapters
# ---------------------------------------------------------------------------


def _core_chapters() -> str:
    parts: list[str] = []
    parts.append('<div class="content">')

    parts.append(_h1("Introduction", "introduction"))
    parts.append(
        _p(
            f"EliteFlow consolidates CRM, projects, tasks, HR team operations, invoicing, files, "
            f"calendar, real-time communication, meetings, announcements, discussion threads, "
            f"whiteboards, notifications, reports, settings, integrations, and AI assistance into "
            f"one secured product family. Version {brand.DOC_VERSION} is the documented baseline."
        )
    )
    parts.append(
        _p(
            "The platform ships as a TypeScript monorepo with five runnable applications and shared "
            "packages. Web users work in a Next.js 16 App Router client; server logic is exposed "
            "through an Express 5 API; desktop operators use Electron; field users use an Expo 57 "
            "Android app; quick actions are available from a Chrome MV3 extension. All clients speak "
            "the same /api/v1 contract validated with Zod schemas from packages/shared."
        )
    )
    parts.append(
        _p(
            f"Production web is published at {brand.WEB_URL}; the API runs on Railway; identity, "
            f"Postgres, and object storage are provided by Supabase. This manual describes the "
            f"shipped system prepared by {brand.AUTHOR}."
        )
    )

    parts.append(_h1("Problem Statement", "problem-statement"))
    parts.append(
        _p(
            "Service organizations often stitch together separate tools for clients, projects, "
            "billing, HR leave, chat, and reporting. That patchwork creates duplicate data entry, "
            "inconsistent access control, weak auditability, and slow onboarding for employees and "
            "external clients."
        )
    )
    parts.append(
        _p(
            "Without a unified RBAC model, administrators cannot grant least-privilege access across "
            "modules. Without shared APIs and schemas, mobile and desktop clients drift from the web "
            "experience. Without integrated AI and communication, teams lose context switching "
            "between documents, meetings, and task systems."
        )
    )
    parts.append(
        _p(
            "EliteFlow solves these problems with a single authenticated enterprise workspace, "
            "consistent permissions, multi-platform clients, and an extensible module architecture "
            "backed by a relational schema designed for operational workloads."
        )
    )

    parts.append(_h1("Objectives", "objectives"))
    parts.append(
        _ul(
            [
                "Deliver a production-deployable multi-platform EBM system with shared TypeScript contracts.",
                "Implement secure authentication (email verification, password reset, Google OAuth) and RBAC across SUPER_ADMIN, ADMIN, EMPLOYEE, and CLIENT.",
                "Provide operational modules for CRM, projects, tasks, finance, HR/team, calendar, files, communication, meetings, AI, reports, and settings.",
                "Expose a versioned REST API under /api/v1 with Prisma-backed persistence on Supabase Postgres.",
                "Package desktop (Electron), Android (Expo 57), and Chrome extension clients that reuse the same API.",
                "Document architecture, security, testing, and deployment at product-manual quality.",
            ]
        )
    )

    parts.append(_h1("Scope", "scope"))
    parts.append(_h2("In Scope"))
    parts.append(
        _ul(
            [
                "Web application (Next.js 16) with role-aware dashboards and module routes.",
                "Express 5 API modules: auth, clients, projects, tasks, invoices, AI, files, calendar, team, reports, notifications, communication, security, settings, integrations, whiteboards.",
                "Desktop, Android, and Chrome extension clients for core productivity workflows.",
                "Supabase Auth, Postgres, and Storage integration; Vercel and Railway deployment.",
                "AI assistant and AI documents with Gemini (default), OpenAI, and mock providers.",
            ]
        )
    )
    parts.append(_h2("Out of Scope"))
    parts.append(
        _ul(
            [
                "Full inventory / warehouse / SKU management (documented as roadmap only).",
                "Native iOS App Store release (Expo supports iOS builds; Android is the documented mobile target).",
                "Multi-region active-active database replication.",
            ]
        )
    )

    parts.append(_h1("Vision", "vision"))
    parts.append(
        _p(
            "To become the unified operating system for service-driven organizations—where every "
            "client, project, invoice, conversation, and decision shares one secure source of truth "
            "across devices."
        )
    )
    parts.append(
        _p(
            "EliteFlow aspires to make enterprise coordination continuous rather than fragmented: "
            "the same identity, permissions, and data model whether the user is on the web console, "
            "a desktop tray session, an Android device, or a browser extension popup."
        )
    )

    parts.append(_h1("Mission", "mission"))
    parts.append(
        _p(
            "Build EliteFlow as a practical, polished, and secure enterprise platform that teams "
            "can deploy, extend, and operate with confidence."
        )
    )
    parts.append(
        _p(
            "The mission prioritizes honest engineering: production hosting, real authentication "
            "journeys, enforceable RBAC, and multi-platform packaging—not slideware prototypes. "
            "Every module in this manual maps to shipped code and captured screenshots."
        )
    )

    parts.append(_h1("Technology Stack", "technology-stack"))
    parts.append(
        _p(
            "The stack favors TypeScript end-to-end for safer refactors across apps and packages. "
            "UI uses React with Next.js 16; API uses Express 5; data access uses Prisma 6; "
            "validation uses Zod in packages/shared. Passwords are hashed with Argon2; API sessions "
            "use JWT with refresh-token rotation."
        )
    )
    parts.append(
        table_html(
            "Technology stack components",
            ["Layer", "Technology", "Role"],
            [
                ["Web", "Next.js 16 / React", "App Router UI, hybrid rendering, Vercel deploy"],
                ["API", "Express 5", "REST /api/v1, auth, business modules"],
                ["Data", "Prisma 6 + PostgreSQL", "ORM models, migrations, type-safe queries"],
                ["Auth/Storage", "Supabase", "Auth providers, Postgres hosting, file storage"],
                ["Security", "JWT + Argon2", "Session tokens and password hashing"],
                ["Shared", "Zod + TS packages", "Schemas, enums, permission engine, API prefixes"],
                ["Desktop", "Electron", "Packaged Windows/macOS desktop shell"],
                ["Mobile", "Expo 57", "Android-focused React Native client"],
                ["Extension", "Chrome MV3", "Popup workflows for tasks/projects"],
                ["AI", "Gemini / OpenAI / mock", "Assistant chat and document generation"],
                ["Hosting", "Vercel + Railway", "Web and API production runtimes"],
            ],
        )
    )
    parts.append(_tech_stack_diagram())

    parts.append(_h1("System Architecture", "system-architecture"))
    parts.append(
        _p(
            "EliteFlow follows a modular monorepo architecture. Browser, desktop, mobile, and "
            "extension clients authenticate and then call the Express API. The API validates input "
            "with shared Zod schemas, enforces JWT/session authenticity, evaluates permission keys, "
            "and performs Prisma queries against Supabase PostgreSQL. File binaries and some auth "
            "concerns are delegated to Supabase Storage and Auth."
        )
    )
    parts.append(
        _diag(
            diagrams.svg_system_architecture(),
            "EliteFlow system architecture — clients, API, data, and cloud services",
        )
    )
    parts.append(
        _diag(
            diagrams.svg_deployment(),
            "Deployment topology — GitHub, Vercel, Railway, Supabase, and packaged clients",
        )
    )
    parts.append(
        _p(
            "Cross-cutting concerns include Helmet/CORS hardening on the API, Argon2 password "
            "hashing, refresh-token rotation, notification queuing, and AI provider abstraction. "
            "Collaboration features (chat presence, meetings) are modeled in the communication "
            "domain under /api/v1/communication."
        )
    )

    parts.append(_h1("Database Architecture", "database-architecture"))
    parts.append(
        _p(
            "Persistence is modeled in Prisma multi-file schemas under packages/database/prisma/schema. "
            "Domains cover users/RBAC, auth tokens, clients, projects, tasks, invoices, team/HR, "
            "calendar, files, communication, whiteboards, AI, notifications, reports, integrations, "
            "settings, security, and audit—approximately seventy models in total."
        )
    )
    parts.append(
        _diag(diagrams.svg_db_erd_overview(), "Database ER overview — major EliteFlow domains")
    )
    parts.append(
        table_html(
            "Database models by domain",
            ["Domain", "Representative models", "Count (approx.)"],
            [
                ["Identity & RBAC", "User, Role, Permission, RolePermission", "4"],
                [
                    "Auth",
                    "Session, RefreshToken, OAuthAccount, EmailVerificationToken, PasswordResetToken, OtpVerification",
                    "6",
                ],
                ["CRM", "Client", "1"],
                [
                    "Delivery",
                    "Project, ProjectMember, ProjectMilestone, ProjectAttachment, Task, TaskComment, TaskAttachment, TaskActivityLog",
                    "8",
                ],
                ["Finance", "Invoice, InvoiceItem, InvoicePaymentHistory", "3"],
                [
                    "HR / Team",
                    "Department, EmployeeProfile, Team, TeamMember, Attendance, LeaveRequest, PerformanceReview, EmployeeGoal",
                    "8",
                ],
                ["Calendar", "CalendarEvent, EventAttendee, EventReminder, Holiday", "4"],
                ["Files", "Folder, ManagedFile, FileVersion, FileShare, FileActivity", "5"],
                [
                    "Communication",
                    "Conversation, Message*, Announcement*, Discussion*, Meeting*, Activity*, UserPresence",
                    "~20",
                ],
                ["Whiteboard", "Whiteboard, WhiteboardVersion, WhiteboardComment", "3"],
                ["AI", "AiConversation, AiMessage, AiDocument", "3"],
                [
                    "Notifications",
                    "Notification, NotificationReply, NotificationPreference, NotificationTemplate, NotificationQueue, NotificationAudit",
                    "6",
                ],
                ["Reports", "SavedReport, ReportTemplate, ReportSchedule, ReportAudit", "4"],
                [
                    "Integrations",
                    "Integration, Credential, IntegrationLog, WebhookEndpoint, SyncHistory",
                    "5",
                ],
                [
                    "Settings",
                    "OrganizationSettings, UserPreference, IntegrationCredential, BackupRecord, OrganizationBilling, AccountDeletionRequest",
                    "6",
                ],
                ["Security & Audit", "PasswordHistory, SecurityEvent, AuditLog, LoginAttempt", "4"],
            ],
        )
    )
    parts.append(
        _p(
            "Relational integrity is enforced with foreign keys and cascading rules appropriate to "
            "each aggregate. Soft operational metadata such as read receipts and presence support "
            "collaboration UX without duplicating core business entities."
        )
    )

    # --- Authentication ---
    parts.append(_h1("Authentication", "authentication"))
    parts.append(
        _p(
            "EliteFlow authentication supports email/password registration and sign-in, email "
            "verification codes, forgot/reset password, and Google OAuth through Supabase. Sessions "
            "and refresh tokens are persisted server-side for revocation and device hygiene. "
            "Password credentials are hashed with Argon2."
        )
    )
    parts.append(
        _diag(
            diagrams.svg_auth_flow(),
            "Authentication flow — credentials, OAuth, verification, and session issuance",
        )
    )
    parts.append(
        _p(
            "API routes live under /api/v1/auth and include sign-up, sign-in, sign-out, refresh, "
            "verify-email, forgot-password, and reset-password endpoints. The web app stores session "
            "material according to auth feature constants and redirects unauthenticated users to "
            "the login experience."
        )
    )
    parts.append(
        shot_explain(
            2,
            title="Web Login",
            purpose="Primary entry point for email/password and social sign-in to EliteFlow.",
            seeing="Branded login shell with email and password fields, Sign In CTA, and Google continue option.",
            buttons=["Sign In", "Continue with Google", "Forgot password", "Create account"],
            workflow="User enters credentials → client validates locally → POST /api/v1/auth/sign-in → JWT + refresh issued → role dashboard.",
            business="Single branded gate reduces support tickets and keeps all personas on one identity path.",
        )
    )
    parts.append(
        shot_explain(
            1,
            title="Google OAuth Picker",
            purpose="Allow users to authenticate via Google without creating a separate password.",
            seeing="Google account picker mediated by Supabase Auth after Continue with Google.",
            buttons=["Account selection", "Allow / Continue", "Cancel"],
            workflow="OAuth redirect → Supabase tokens → API resolves/creates User → application JWTs issued for /api/v1.",
            business="Faster onboarding for Google Workspace organizations and lower password-reset load.",
        )
    )
    parts.append(
        shot_explain(
            35,
            title="Email Verification Message",
            purpose="Prove mailbox ownership before unlocking full account access.",
            seeing="Branded EliteFlow verification email in Gmail with one-time code.",
            buttons=["Copy code", "Open EliteFlow", "Mark as spam (client mail UI)"],
            workflow="Sign-up creates EmailVerificationToken → email delivered → user enters code → account marked verified.",
            business="Reduces fake accounts and ensures invoice/notification delivery reaches a real inbox.",
        )
    )
    parts.append(
        shot_explain(
            36,
            title="Forgot Password",
            purpose="Start a safe password-recovery flow without revealing account existence.",
            seeing="Forgot-password form requesting only the account email address.",
            buttons=["Send reset link", "Back to sign in"],
            workflow="Submit email → /api/v1/auth/forgot-password → PasswordResetToken created → reset email queued.",
            business="Self-service recovery cuts helpdesk effort while limiting account enumeration risk.",
        )
    )
    parts.append(
        shot_explain(
            39,
            title="Forgot Password Confirmation",
            purpose="Confirm that a reset request was accepted without exposing token material.",
            seeing="Success state stating that a reset link has been sent to the inbox.",
            buttons=["Back to sign in", "Resend (if available)"],
            workflow="UI shows confirmation only; user must open email to continue — secrets stay out of the browser session.",
            business="Clear UX reduces duplicate submissions and support confusion after recovery requests.",
        )
    )
    parts.append(
        shot_explain(
            38,
            title="Password Reset Email",
            purpose="Deliver a single-use secure link for credential replacement.",
            seeing="Gmail view of the EliteFlow password-reset message with action link.",
            buttons=["Reset password link", "Ignore / delete"],
            workflow="User opens link → reset route loads with token → API validates expiry and prior use.",
            business="Secure channel for recovery protects accounts without requiring admin intervention.",
        )
    )
    parts.append(
        shot_explain(
            37,
            title="Reset Password Form",
            purpose="Accept a new password and complete recovery under Argon2 hashing.",
            seeing="Reset form with new password and confirm fields plus submit action.",
            buttons=["Save new password", "Cancel"],
            workflow="Submit → Argon2 hash stored → reset token invalidated → sessions rotated/invalidated as designed.",
            business="Closes the recovery loop and prevents stolen refresh tokens from lingering after a reset.",
        )
    )
    parts.append(flush_shots())

    # --- Security ---
    parts.append(_h1("Security", "security"))
    parts.append(
        _p(
            "EliteFlow applies defense in depth: TLS at the edge (Vercel/Railway), Helmet headers "
            "and CORS allowlists on the API, Argon2 password hashing, JWT access tokens with refresh "
            "rotation, password history checks, login attempt logging, and a Security Center UI for "
            "session review. AuditLog and SecurityEvent models retain investigative trails."
        )
    )
    parts.append(
        shot_explain(
            28,
            title="Security Center",
            purpose="Give users and admins visibility into sessions, logins, and security score.",
            seeing="Security score, active sessions list, and recent login activity panels.",
            buttons=["Revoke session", "Review device", "Refresh score"],
            workflow="Open Security Center → inspect sessions → revoke suspicious devices → actions audited.",
            business="Faster incident response and demonstrable access hygiene for enterprise reviewers.",
        )
    )
    parts.append(flush_shots())
    parts.append(
        _diag(
            diagrams.svg_rbac_hierarchy(),
            "RBAC role hierarchy — SUPER_ADMIN, ADMIN, EMPLOYEE, CLIENT",
        )
    )
    parts.append(
        _p(
            "Authorization is role-based with four primary roles—SUPER_ADMIN, ADMIN, EMPLOYEE, "
            "CLIENT—backed by Permission and RolePermission records. The shared permission engine "
            "evaluates keys on both API handlers and web route guards so unauthorized navigation "
            "never becomes an actionable API call."
        )
    )
    parts.append(
        table_html(
            "Core permission keys",
            ["Key", "Module"],
            [
                ["admin:access / system:manage", "Administration"],
                ["users:manage / team:manage|read", "People"],
                ["clients:* / projects:* / tasks:*", "Delivery"],
                ["invoices:* / reports:*", "Finance & analytics"],
                [
                    "communication:* / chat:* / announcement:manage / meeting:manage / thread:manage",
                    "Communication hub",
                ],
                ["ai:use / files:* / calendar:* / whiteboards:*", "Productivity"],
                ["settings:manage / integrations:* / security:manage / audit:read", "Governance"],
            ],
        )
    )

    # --- AI ---
    parts.append(_h1("AI Integration", "ai-integration"))
    parts.append(
        _p(
            "AI features are abstracted behind provider adapters. Gemini is the default production "
            "provider; OpenAI is supported; a mock provider enables deterministic local and demo "
            "behavior. Access is gated with the ai:use permission. Conversations, messages, and "
            "generated documents persist in AiConversation, AiMessage, and AiDocument."
        )
    )
    parts.append(
        _diag(diagrams.svg_ai_workflow(), "AI assistant and document generation workflow")
    )
    parts.append(
        shot_explain(
            10,
            title="Generate AI Document",
            purpose="Create structured documents from a type selection and free-form prompt.",
            seeing="Modal with document type selector, prompt textarea, and generate action.",
            buttons=["Document type", "Prompt", "Generate", "Cancel"],
            workflow="Submit → POST /api/v1/ai/documents → provider runs server-side → AiDocument stored; keys never leave the API.",
            business="Keeps drafting inside the authenticated workspace instead of external chat tools.",
        )
    )
    parts.append(
        shot_explain(
            11,
            title="AI Documents Library",
            purpose="Browse and manage previously generated AI artefacts.",
            seeing="Portrait library of AI documents with create and open affordances.",
            buttons=["New document", "Open", "Filter / search", "Delete (if permitted)"],
            workflow="User opens library → selects artefact → edits or regenerates under the same JWT and ai:use gate.",
            business="Reusable institutional knowledge without scattering drafts across personal accounts.",
        )
    )
    parts.append(
        shot_explain(
            12,
            title="AI Assistant Chat",
            purpose="Draft emails, summaries, and operational copy via conversational prompts.",
            seeing="Chat pane with message history and composer for assistant turns.",
            buttons=["Send prompt", "New conversation", "Copy response"],
            workflow="Messages persist as AiConversation/AiMessage → user returns to prior threads with full context.",
            business="Faster communication cycles for status updates, client emails, and meeting follow-ups.",
        )
    )
    parts.append(flush_shots())

    # --- Deployment ---
    parts.append(_h1("Deployment", "deployment"))
    parts.append(
        _p(
            f"Source control is GitHub. The web app deploys to Vercel ({brand.WEB_URL}). The API "
            f"deploys to Railway. Supabase hosts PostgreSQL, Auth, and Storage. Electron desktop "
            f"installers, Expo/EAS Android artefacts, and the Chrome MV3 extension package are "
            f"published through the Downloads Center for end-user installation."
        )
    )
    parts.append(
        _diag(diagrams.svg_deployment(), "Production deployment topology for EliteFlow platforms")
    )
    parts.append(
        table_html(
            "Deployment and packaging matrix",
            ["Component", "Platform", "Notes"],
            [
                ["apps/web", "Vercel", brand.WEB_URL],
                ["apps/api", "Railway", "Express /api/v1"],
                ["Database / Auth / Storage", "Supabase", "Postgres + Auth + Storage"],
                ["Desktop", "Electron builds", "Distributed via Downloads Center"],
                ["Android", "Expo 57 / EAS", "Distributed via Downloads Center"],
                ["Extension", "Chrome MV3 package", "Distributed via Downloads Center"],
            ],
        )
    )
    parts.append(
        _p(
            "Environment variables configure Supabase URL/keys, AI provider secrets, CORS origins, "
            "and mail transport. Prisma migrations apply to the Supabase Postgres instance before "
            "API rollout. Health endpoint /api/v1/health supports uptime probes."
        )
    )

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Web application chapter
# ---------------------------------------------------------------------------

_WEB_API_SUMMARY: list[list[str]] = [
    ["*", "/api/v1/auth/*", "Sign-in, OAuth, verify, reset, refresh"],
    ["*", "/api/v1/clients", "CRM client registry"],
    ["*", "/api/v1/projects", "Projects and membership"],
    ["*", "/api/v1/tasks", "Tasks, comments, activity"],
    ["*", "/api/v1/invoices", "Invoices and payments"],
    ["*", "/api/v1/ai", "Assistant chat and AI documents"],
    ["*", "/api/v1/files", "File manager and versions"],
    ["*", "/api/v1/calendar", "Events and reminders"],
    ["*", "/api/v1/team", "HR / workforce"],
    ["*", "/api/v1/reports", "Analytics and saved reports"],
    ["*", "/api/v1/notifications", "Notification center"],
    ["*", "/api/v1/communication", "Chat, channels, meetings, threads, announcements"],
    ["*", "/api/v1/security", "Sessions and security score"],
    ["*", "/api/v1/settings", "Profile and organization settings"],
    ["*", "/api/v1/integrations", "Third-party OAuth connectors"],
    ["*", "/api/v1/whiteboards", "Collaborative whiteboards"],
    ["GET", "/api/v1/health", "Health probe"],
]


def _web_application() -> str:
    parts: list[str] = []
    parts.append(
        _platform_scaffold(
            title="Web Application",
            slug="web-application",
            overview=(
                "The EliteFlow web application is the primary enterprise console. Built with "
                "Next.js 16 App Router and React, it delivers role-aware dashboards, full module "
                "coverage, and the richest administration surfaces. It is the reference UI that "
                "desktop loads inside Electron and that mobile and extension clients complement "
                "with thinner workflows."
            ),
            features=[
                "Role-aware dashboards (client portal, admin console, operations overview)",
                "CRM / Clients registry with status badges and contacts",
                "Projects and Tasks with priority, assignees, and due dates",
                "Finance invoices with amounts, statuses, and payment history",
                "Calendar month view for meetings, deadlines, and events",
                "Meetings scheduling with waiting room and AI summaries",
                "Messages, Channels, Announcements, and Discussion Threads",
                "Activity feed across collaboration events",
                "Team/HRM workforce stats and leave approvals",
                "File Manager, Reports, Notifications, Integrations, Settings",
                "Security Center, Downloads Center, AI Assistant and AI Documents",
                "Whiteboard collaboration (schema and API in product)",
            ],
            workflow=(
                "Users authenticate via the branded login or Google OAuth, land on a "
                "role-appropriate dashboard, and navigate the sidebar into CRM, delivery, "
                "finance, communication, or governance modules. Mutations post to /api/v1 "
                "through React Query; route guards mirror server permission checks so "
                "unauthorized screens never become writable."
            ),
            architecture=(
                "The web app is a Next.js 16 client that authenticates against Express /api/v1, "
                "stores session material per auth feature constants, and renders module pages "
                "with the EliteFlow design system. Server components and client islands are "
                "combined where appropriate; privileged data always re-validates on the API."
            ),
            user_benefits=[
                "One browser workspace for clients, staff, and administrators",
                "Clear navigation with permission-filtered menus",
                "Immediate KPIs after login without tool switching",
            ],
            technical_benefits=[
                "Shared Zod contracts with the API eliminate schema drift",
                "App Router structure maps cleanly to enterprise modules",
                "Vercel deployment enables continuous web delivery",
            ],
            business_benefits=[
                "Reduced SaaS sprawl and training cost",
                "Governed access for client portal versus internal ops",
                "Faster cycle time from lead to invoice and meeting",
            ],
            technologies=[
                "Next.js 16 / React",
                "TypeScript",
                "TanStack Query (React Query)",
                "Zod schemas from packages/shared",
                "Vercel hosting",
            ],
            api_rows=_WEB_API_SUMMARY,
            security=(
                "All module routes require a valid JWT session. Permission keys gate navigation "
                "and mutations. Security Center exposes session revocation. File and AI routes "
                "never expose storage or provider secrets to the browser."
            ),
            future=(
                "Configurable dashboard widgets per role, deeper client portal self-service, "
                "and progressive offline caching for selected read views."
            ),
            diagram_html=_diag(
                diagrams.svg_module_map(),
                "Web module map across the EliteFlow enterprise workspace",
            ),
        )
    )

    parts.append(_h2("Dashboard"))
    parts.append(
        _p(
            "Dashboards are persona-aware. Clients see portal KPIs for their projects and "
            "invoices; super administrators open a tenant and health console; operators use "
            "revenue and delivery charts to prioritize work."
        )
    )
    parts.append(
        shot_explain(
            3,
            title="Client Portal Dashboard",
            purpose="Give external clients a read-oriented home for projects, invoices, and updates.",
            seeing="Portal overview cards for projects, outstanding invoices, and recent activity.",
            buttons=["Open project", "View invoice", "Recent updates"],
            workflow="CLIENT signs in → portal dashboard → drill into allowed project/invoice detail.",
            business="Transparent client self-service without exposing internal admin controls.",
        )
    )
    parts.append(
        shot_explain(
            4,
            title="Admin Console",
            purpose="Provide SUPER_ADMIN operators with tenant health and privileged shortcuts.",
            seeing="Dense console with tenants, health indicators, and administrative actions.",
            buttons=["Tenant actions", "Health checks", "Privileged shortcuts"],
            workflow="SUPER_ADMIN lands on console → monitors health → jumps into governance modules.",
            business="Central control plane for multi-tenant operations and platform oversight.",
        )
    )
    parts.append(
        shot_explain(
            5,
            title="Operations Overview",
            purpose="Surface revenue, client, and project charts for internal staff prioritization.",
            seeing="Portrait KPI stack with trend charts across revenue, clients, and projects.",
            buttons=["Drill-down charts", "Module shortcuts"],
            workflow="Operator reviews KPIs → opens CRM, projects, or finance for follow-up work.",
            business="Faster daily triage of delivery and commercial health.",
        )
    )

    parts.append(_h2("CRM / Clients"))
    parts.append(
        _p(
            "The Clients module is the commercial registry linking accounts to projects and "
            "invoices. Status badges communicate lifecycle state across the organization."
        )
    )
    parts.append(
        shot_explain(
            6,
            title="Clients List",
            purpose="Maintain the commercial client registry with contacts and lifecycle status.",
            seeing="Searchable table of contacts, emails, and status badges.",
            buttons=["Search", "Create client", "Edit", "Status filter"],
            workflow="Authorized user creates/edits via Zod-validated forms → POST/PATCH /api/v1/clients.",
            business="Single source of truth for accounts feeding projects and invoices.",
        )
    )
    parts.append(_diag(diagrams.svg_crm_flow(), "CRM client lifecycle flow"))

    parts.append(_h2("Projects"))
    parts.append(
        shot_explain(
            7,
            title="Projects List",
            purpose="Track delivery work with status, priority, and due dates.",
            seeing="Project rows with status chips, priority, and due-date columns.",
            buttons=["Create project", "Open detail", "Filter status"],
            workflow="Open row → members, milestones, attachments; writes require projects:write.",
            business="Shared delivery board keeps staff and clients aligned on commitments.",
        )
    )

    parts.append(_h2("Tasks"))
    parts.append(
        shot_explain(
            8,
            title="Tasks List",
            purpose="Manage assignee-level work items under projects.",
            seeing="Task table with statuses, priorities, and assignees.",
            buttons=["New task", "Filter", "Update status", "Open comments"],
            workflow="Create/update via /api/v1/tasks; comments and activity logs stay in context.",
            business="Clear ownership and progress visibility for delivery managers.",
        )
    )
    parts.append(_diag(diagrams.svg_task_lifecycle(), "Task lifecycle from creation to completion"))

    parts.append(_h2("Finance / Invoices"))
    parts.append(
        shot_explain(
            9,
            title="Invoice & Billing",
            purpose="Issue and track invoices with amounts and payment statuses.",
            seeing="Metric cards above an invoice list with amounts and status badges.",
            buttons=["Create invoice", "Record payment", "Filter status"],
            workflow="Staff manage Invoice/InvoiceItem/PaymentHistory; clients view their own bills.",
            business="Faster cash collection with transparent billing status.",
        )
    )

    parts.append(_h2("Calendar"))
    parts.append(
        shot_explain(
            22,
            title="Calendar Month View",
            purpose="Overlay meetings, deadlines, and events on a shared month grid.",
            seeing="Month calendar with meeting and deadline markers.",
            buttons=["Prev/next month", "Select day", "Create event"],
            workflow="Day select → create/edit CalendarEvent with attendees and reminders.",
            business="One scheduling surface synchronized with Meetings and delivery dates.",
        )
    )

    parts.append(_h2("Meetings"))
    parts.append(
        shot_explain(
            19,
            title="Schedule Meeting",
            purpose="Capture meeting metadata including waiting-room options.",
            seeing="Schedule modal with times, participants, and waiting-room toggle.",
            buttons=["Save meeting", "Add participants", "Waiting room", "Cancel"],
            workflow="Submit → Meeting via communication APIs → optional calendar entry for attendees.",
            business="Structured meetings reduce ad-hoc scheduling chaos.",
        )
    )
    parts.append(
        shot_explain(
            20,
            title="Meetings List",
            purpose="Review scheduled sessions and AI summary affordances.",
            seeing="List of upcoming and past meetings with summary actions where enabled.",
            buttons=["Join", "Edit", "AI summary", "Cancel meeting"],
            workflow="Organizers manage sessions; participants join via deep links under permissions.",
            business="Accountable meeting history and optional AI follow-up summaries.",
        )
    )
    parts.append(_diag(diagrams.svg_meeting_flow(), "Meeting scheduling and summary flow"))

    parts.append(_h2("Chat / Messages / Channels"))
    parts.append(
        shot_explain(
            13,
            title="Team Messages",
            purpose="Real-time team conversation with threaded history.",
            seeing="Conversation pane (e.g. Engineering) with history and composer.",
            buttons=["Send message", "Attach", "Open channel list"],
            workflow="Messages persist in communication domain; presence/read state sync across clients.",
            business="Keeps operational chat inside EliteFlow instead of scattered messengers.",
        )
    )
    parts.append(
        shot_explain(
            14,
            title="Channels",
            purpose="Browse team, department, and group chat rooms.",
            seeing="Channel list for team/department/group chats.",
            buttons=["Join channel", "Create channel", "Open thread"],
            workflow="Select channel → enter message thread; create/join is permission-gated.",
            business="Structured rooms reduce noise versus one flat inbox.",
        )
    )
    parts.append(_diag(diagrams.svg_chat_flow(), "Chat and channel messaging flow"))

    parts.append(_h2("Announcements"))
    parts.append(
        shot_explain(
            15,
            title="New Announcement",
            purpose="Publish prioritized org-wide notices with optional expiration.",
            seeing="Form for title, body, priority, and expiration.",
            buttons=["Publish", "Set priority", "Set expiration", "Cancel"],
            workflow="Create via communication announcement endpoints → appears in feed.",
            business="Official broadcasts that outrank informal chat noise.",
        )
    )
    parts.append(
        shot_explain(
            16,
            title="Announcements Feed",
            purpose="Consume pinned system and hub updates in one place.",
            seeing="Feed of pinned and chronological announcements.",
            buttons=["Open announcement", "Pin/unpin (managers)", "Dismiss"],
            workflow="Employees/clients see role-appropriate posts; managers use announcement:manage.",
            business="Consistent org communication with clear authority and retention.",
        )
    )

    parts.append(_h2("Discussion Threads"))
    parts.append(
        shot_explain(
            17,
            title="New Thread",
            purpose="Start longer-form discussion topics distinct from ephemeral chat.",
            seeing="Modal with title and initial body for a new thread.",
            buttons=["Create thread", "Cancel"],
            workflow="Submit → discussion topic created for product/deployment conversations.",
            business="Preserves decision context that would be lost in chat history.",
        )
    )
    parts.append(
        shot_explain(
            18,
            title="Threads List",
            purpose="Browse open discussions such as deployment and product topics.",
            seeing="List of threads with titles and activity indicators.",
            buttons=["Open thread", "Reply", "Moderate (thread:manage)"],
            workflow="Select thread → read/reply; moderation when permitted.",
            business="Searchable institutional memory for cross-team decisions.",
        )
    )

    parts.append(_h2("Activity"))
    parts.append(
        shot_explain(
            21,
            title="Activity Feed",
            purpose="Aggregate meetings, threads, and announcements into one timeline.",
            seeing="Cross-module pulse of collaboration events.",
            buttons=["Open source item", "Filter activity"],
            workflow="Operator scans feed → deep-links into originating modules.",
            business="Situational awareness without opening every collaboration surface.",
        )
    )

    parts.append(_h2("Team / HRM"))
    parts.append(
        shot_explain(
            25,
            title="Team / HR Overview",
            purpose="Workforce stats and leave approval queues for managers.",
            seeing="Team metrics with leave approval list.",
            buttons=["Approve leave", "Reject leave", "Open employee"],
            workflow="Managers act on LeaveRequest; departments feed assignment pickers.",
            business="HR actions stay connected to delivery staffing context.",
        )
    )

    parts.append(_h2("File Manager"))
    parts.append(
        shot_explain(
            23,
            title="File Manager",
            purpose="Upload and organize files with folder hierarchy.",
            seeing="Library with upload and folder actions (empty or populated).",
            buttons=["Upload", "New folder", "Open file", "Share"],
            workflow="Binaries → Supabase Storage; metadata in Folder/ManagedFile/FileVersion.",
            business="Governed document storage with share and version trails.",
        )
    )

    parts.append(_h2("Reports"))
    parts.append(
        shot_explain(
            24,
            title="Reports & Analytics",
            purpose="KPI cards and charts over delivery and finance data.",
            seeing="Portrait analytics overview with KPIs and charts.",
            buttons=["Export", "Saved reports", "Date range"],
            workflow="Views behind reports:read/export; schedules institutionalize recurring visibility.",
            business="Management-ready insight without exporting to external BI for basics.",
        )
    )

    parts.append(_h2("Notifications"))
    parts.append(
        shot_explain(
            26,
            title="Notification Center",
            purpose="Central inbox for tasks, announcements, and alerts.",
            seeing="Notification list with read/unread state.",
            buttons=["Mark read", "Open deep link", "Preferences"],
            workflow="Click → source module; preferences control delivery channels.",
            business="Fewer missed deadlines and announcements across roles.",
        )
    )
    parts.append(_diag(diagrams.svg_notification_flow(), "Notification creation and delivery flow"))

    parts.append(_h2("Integrations"))
    parts.append(
        shot_explain(
            27,
            title="Integration Center",
            purpose="Connect third-party OAuth services from one grid.",
            seeing="Grid of third-party OAuth service cards.",
            buttons=["Connect", "Disconnect", "View status"],
            workflow="OAuth handshake → credentials stored server-side as secrets.",
            business="Extends EliteFlow without leaking tokens to the browser.",
        )
    )

    parts.append(_h2("Settings"))
    parts.append(
        shot_explain(
            29,
            title="Settings Center",
            purpose="Manage profile, account fields, and 2FA entry points.",
            seeing="Profile form with account fields and security options.",
            buttons=["Save profile", "Enable 2FA", "Org settings (admins)"],
            workflow="User updates preferences; admins with settings:manage reach org billing artefacts.",
            business="Self-service account hygiene with governed org configuration.",
        )
    )

    parts.append(_h2("Downloads Center"))
    parts.append(
        shot_explain(
            30,
            title="Downloads Hub",
            purpose="Distribute desktop, extension, and Android packages from the web app.",
            seeing="Portrait downloads hub listing platform installers.",
            buttons=["Download desktop", "Download extension", "Download Android"],
            workflow="User selects artefact → installs → signs in with the same EliteFlow account.",
            business="Version-aligned packaging keeps all clients on the live API contract.",
        )
    )

    parts.append(_h2("Whiteboard"))
    parts.append(
        _p(
            "Whiteboards support collaborative canvases with version history and comments. "
            "Persistence uses Whiteboard, WhiteboardVersion, and WhiteboardComment models under "
            "/api/v1/whiteboards. No production screenshot is embedded for this module in the "
            "current capture set; schema and API coverage remain in scope."
        )
    )
    parts.append(
        _note(
            "Whiteboard UI is available in product navigation; a dedicated capture will be added "
            "in a future documentation revision."
        )
    )
    parts.append(
        _diag(diagrams.svg_api_flow(), "API request flow used by whiteboard and other modules")
    )

    parts.append(
        table_html(
            "API route groups (/api/v1)",
            ["Prefix", "Domain"],
            [
                ["/api/v1/auth", "Authentication & tokens"],
                ["/api/v1/clients", "CRM clients"],
                ["/api/v1/projects", "Projects"],
                ["/api/v1/tasks", "Tasks"],
                ["/api/v1/invoices", "Finance invoices"],
                ["/api/v1/ai", "AI assistant & documents"],
                ["/api/v1/files", "File manager"],
                ["/api/v1/calendar", "Calendar events"],
                ["/api/v1/team", "HR / team"],
                ["/api/v1/reports", "Reports"],
                ["/api/v1/notifications", "Notifications"],
                ["/api/v1/communication", "Chat, announcements, threads, meetings"],
                ["/api/v1/security", "Security center"],
                ["/api/v1/settings", "Organization & user settings"],
                ["/api/v1/integrations", "Third-party integrations"],
                ["/api/v1/whiteboards", "Whiteboards"],
                ["/api/v1/health", "Health check"],
            ],
        )
    )
    parts.append(flush_shots())
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Desktop / Android / Extension
# ---------------------------------------------------------------------------


def _desktop_application() -> str:
    parts: list[str] = []
    parts.append(
        _platform_scaffold(
            title="Desktop Application",
            slug="desktop-application",
            overview=(
                "The EliteFlow desktop client is an Electron shell that loads the same web "
                "application experience inside a native window. It targets operators who prefer "
                "a dedicated OS application with tray presence, auto-update, deep links, and "
                "persisted sessions across restarts."
            ),
            features=[
                "Electron shell hosting the EliteFlow web app",
                "System tray icon for quick show/hide",
                "Auto-update channel for installer refreshes",
                "Deep-link handling into module routes",
                "Session persistence across desktop restarts",
                "Downloads Center distribution for Windows/macOS builds",
            ],
            workflow=(
                "Users download the installer from Downloads Center, authenticate once, and "
                "continue using the familiar web modules. Tray actions restore the window; deep "
                "links from email or chat open the corresponding route inside the shell."
            ),
            architecture=(
                "apps/desktop wraps Chromium with Electron main/preload processes. The renderer "
                "loads the hosted or bundled web origin; IPC bridges tray, update, and deep-link "
                "events. API traffic still terminates on Railway /api/v1 with the same JWT model."
            ),
            user_benefits=[
                "Native window and tray without learning a new UI",
                "Faster return to work via persisted session",
                "Offline launch of the shell while API calls remain online-required",
            ],
            technical_benefits=[
                "Single web codebase reduces dual-maintenance cost",
                "Electron packaging fits existing CI release scripts",
                "Deep links reuse Next.js routes",
            ],
            business_benefits=[
                "Professional desktop footprint for client demos",
                "Higher stickiness for power users",
                "Controlled distribution via Downloads Center",
            ],
            technologies=[
                "Electron",
                "Shared Next.js web UI",
                "Auto-updater integration",
                "OS tray and protocol handlers",
            ],
            api_rows=None,
            security=(
                "Desktop sessions use the same Argon2-backed credentials and JWT refresh rules. "
                "Tokens should remain in secure storage where platform APIs allow; tray windows "
                "must not weaken CSP inherited from the web origin."
            ),
            future=(
                "Richer offline queues for selected mutations, native notifications bridging "
                "Notification Center, and signed update manifests per OS channel."
            ),
            diagram_html=_diag(
                diagrams.svg_desktop_arch(),
                "Desktop architecture — Electron shell over the EliteFlow web app",
            ),
        )
    )
    parts.append(_h2("Distribution"))
    parts.append(
        shot_explain(
            30,
            title="Desktop Distribution (Downloads)",
            purpose="Publish Electron installers alongside other packaged clients.",
            seeing="Downloads hub listing desktop, extension, and Android packages.",
            buttons=["Download desktop installer"],
            workflow="Download → install → sign in with EliteFlow account → tray, auto-update, deep links activate.",
            business="Controlled release channel keeps desktop builds aligned with the live API.",
        )
    )
    parts.append(flush_shots())
    return "\n".join(parts)


def _android_application() -> str:
    parts: list[str] = []
    parts.append(
        _platform_scaffold(
            title="Android Application",
            slug="android-application",
            overview=(
                "The EliteFlow Android client is built with Expo 57 (React Native). It provides "
                "mobile login, a navigation drawer into core modules, and a command-center "
                "dashboard with KPIs and quick actions for field and on-the-go staff."
            ),
            features=[
                "Expo 57 mobile runtime targeting Android",
                "Email/password mobile sign-in aligned with web auth",
                "Navigation drawer listing core EliteFlow modules",
                "Mobile command center with KPIs and quick actions",
                "Shared /api/v1 consumption with JWT sessions",
                "EAS build artefacts published via Downloads Center",
            ],
            workflow=(
                "Users install the Android build, sign in on the mobile login screen, open the "
                "drawer to navigate modules, and use the command center for daily KPIs. API calls "
                "mirror web permissions so CLIENT and EMPLOYEE scopes remain enforced."
            ),
            architecture=(
                "apps/mobile uses Expo Router-style navigation against the Express API. Secure "
                "storage holds tokens; screens are thinner than web but call the same "
                "Zod-validated endpoints."
            ),
            user_benefits=[
                "Access EliteFlow away from the desktop",
                "Fast KPI glance on the command center",
                "Familiar module names matching the web IA",
            ],
            technical_benefits=[
                "Expo 57 accelerates Android delivery",
                "Shared TypeScript contracts with the monorepo",
                "EAS packaging integrates with Downloads Center",
            ],
            business_benefits=[
                "Field visibility without VPN desktop sessions",
                "Broader daily active usage",
                "Consistent brand on mobile",
            ],
            technologies=[
                "Expo 57 / React Native",
                "TypeScript",
                "EAS Build",
                "Shared packages/shared schemas",
            ],
            api_rows=None,
            security=(
                "Mobile auth uses the same Argon2 password verification and JWT issuance as web. "
                "Tokens reside in platform secure storage; biometric unlock can wrap the local "
                "vault in future iterations without changing API contracts."
            ),
            future=(
                "Push notifications for Notification Center events, offline read caches, and "
                "optional iOS distribution once Android channel maturity is proven."
            ),
            diagram_html=_diag(
                diagrams.svg_android_arch(),
                "Android architecture — Expo 57 client over /api/v1",
            ),
        )
    )
    parts.append(_h2("Mobile Screens"))
    parts.append(
        _p(
            "Mobile login shares the EliteFlow identity model with web. After sign-in, the "
            "drawer and command center provide the primary Android navigation pattern."
        )
    )
    parts.append(
        shot_explain(
            31,
            title="Mobile Login",
            purpose="Authenticate field users with email and password on Android.",
            seeing="Touch-sized sign-in screen with email and password fields.",
            buttons=["Sign In", "Forgot password"],
            workflow="Sign in → JWTs stored securely → route into mobile shell; OAuth parity where configured.",
            business="Same identity on mobile as web — no parallel account system.",
        )
    )
    parts.append(
        shot_explain(
            33,
            title="Mobile Navigation Drawer",
            purpose="Reach core EliteFlow modules from a vertical drawer menu.",
            seeing="Drawer listing core modules with role-filtered visibility.",
            buttons=["Open module", "Close drawer", "Sign out"],
            workflow="Select item → navigate to mobile screen while session remains active.",
            business="Familiar IA on a small screen reduces mobile training cost.",
        )
    )
    parts.append(
        shot_explain(
            34,
            title="Mobile Command Center",
            purpose="Glanceable KPIs and quick actions for on-the-go operators.",
            seeing="Mobile dashboard cards with metrics and shortcuts.",
            buttons=["Quick action", "Open KPI detail"],
            workflow="Review KPIs → tap shortcut into high-frequency workflows.",
            business="Field decisions without waiting for a desktop session.",
        )
    )
    parts.append(flush_shots())
    return "\n".join(parts)


def _chrome_extension() -> str:
    parts: list[str] = []
    parts.append(
        _platform_scaffold(
            title="Chrome Extension",
            slug="chrome-extension",
            overview=(
                "The EliteFlow Chrome extension is a Manifest V3 add-on that surfaces tasks and "
                "recent projects in a compact popup. A service worker handles background events; "
                "context menus can launch quick actions without opening the full web console."
            ),
            features=[
                "Chrome Manifest V3 package",
                "Popup UI for tasks and recent projects",
                "Service worker for background auth refresh and events",
                "Context menu hooks for quick actions",
                "Shared API session with /api/v1",
                "Distribution via Downloads Center zip/store package",
            ],
            workflow=(
                "Users install the extension, authenticate against EliteFlow, and open the popup "
                "to review tasks or jump into projects. Context menus invoke lightweight commands; "
                "deeper work deep-links into the web application."
            ),
            architecture=(
                "apps/extension declares MV3 permissions, a popup HTML/React bundle, and a "
                "service worker. API calls use stored tokens; context menus message the worker "
                "to open routes or create lightweight records when permitted."
            ),
            user_benefits=[
                "Stay in-browser without losing EliteFlow context",
                "Faster task glance than full page navigation",
                "One-click open into the web app for detail work",
            ],
            technical_benefits=[
                "MV3 service worker model aligns with Chrome requirements",
                "Reuses shared API and auth contracts",
                "Small surface area simplifies review and packaging",
            ],
            business_benefits=[
                "Increases engagement during everyday browsing",
                "Low-friction adoption for staff already in Chrome",
                "Complements—not replaces—the full web console",
            ],
            technologies=[
                "Chrome Manifest V3",
                "Service worker",
                "Popup UI",
                "Context menus",
                "Shared /api/v1 client",
            ],
            api_rows=None,
            security=(
                "Extension storage of tokens must follow Chrome MV3 guidance; host permissions "
                "are minimized to EliteFlow API and web origins. Popup UI inherits the same "
                "permission failures (401/403) as other clients."
            ),
            future=(
                "Additional context-menu create flows, badge counts for unread notifications, "
                "and optional side panel for richer chat previews."
            ),
            diagram_html=_diag(
                diagrams.svg_extension_arch(),
                "Chrome extension architecture — MV3 popup and service worker",
            ),
        )
    )
    parts.append(_h2("Extension Popup"))
    parts.append(
        shot_explain(
            32,
            title="Chrome Extension Home",
            purpose="Surface tasks and recent projects in a compact browser popup.",
            seeing="Portrait popup listing tasks and recent projects.",
            buttons=["Open task", "Open project", "Refresh"],
            workflow="Popup loads via service worker → open item in full web app for detail work.",
            business="Lightweight engagement while users remain on other tabs.",
        )
    )
    parts.append(flush_shots())
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Closing chapters
# ---------------------------------------------------------------------------


def _closing_chapters() -> str:
    parts: list[str] = []

    parts.append(_h1("Testing", "testing"))
    parts.append(
        _p(
            "EliteFlow testing spans unit checks on shared utilities, integration tests against "
            "API modules, authentication journeys, email verification and password reset mail, "
            "platform clients, and cross-browser UI validation. Production smoke checks hit Vercel "
            "and Railway health endpoints."
        )
    )
    parts.append(
        table_html(
            "Unit testing focus areas",
            ["Area", "Checks"],
            [
                ["Permission engine", "Key evaluation for SUPER_ADMIN, ADMIN, EMPLOYEE, CLIENT"],
                ["Zod schemas", "Request/response contract validation"],
                ["Pure helpers", "Formatting, date, and enum utilities in packages/shared"],
            ],
        )
    )
    parts.append(
        table_html(
            "Integration testing focus areas",
            ["Area", "Checks"],
            [
                ["Module routers", "CRUD happy paths with test DB or transactional fixtures"],
                ["Auth middleware", "Missing token → 401; missing permission → 403"],
                ["Prisma writes", "Foreign-key and cascade expectations per domain"],
            ],
        )
    )
    parts.append(
        table_html(
            "Authentication test matrix",
            ["Scenario", "Expected result"],
            [
                ["Email/password sign-in", "Session issued; redirect to role dashboard"],
                ["Google OAuth", "Supabase account linked; local User resolved"],
                ["Email verification code", "Account marked verified; login allowed"],
                ["Invalid refresh token", "401; client forced to re-authenticate"],
            ],
        )
    )
    parts.append(
        table_html(
            "Email and password-recovery tests",
            ["Scenario", "Expected result"],
            [
                ["Forgot password", "Reset email delivered; token single-use"],
                [
                    "Reset password",
                    "Password updated with Argon2; old sessions invalidated as designed",
                ],
                ["Verification email render", "Branded template delivers readable code/link"],
            ],
        )
    )
    parts.append(
        table_html(
            "API authorization test matrix",
            ["Area", "Checks"],
            [
                [
                    "Production smoke",
                    "GET /api/v1/health, auth login, one write path per critical module",
                ],
                ["API authz", "Missing permission returns 403; missing auth returns 401"],
                ["CORS / Helmet", "Disallowed origins rejected; security headers present"],
            ],
        )
    )
    parts.append(
        table_html(
            "Desktop client test matrix",
            ["Focus", "Checks"],
            [
                ["Launch", "Electron shell opens and loads web origin"],
                ["Auth persistence", "Restart retains valid session"],
                ["API connectivity", "Module fetches succeed against Railway"],
                ["Tray / deep links", "Show-hide and protocol open behave as configured"],
            ],
        )
    )
    parts.append(
        table_html(
            "Android client test matrix",
            ["Focus", "Checks"],
            [
                ["Login", "Mobile sign-in issues tokens"],
                ["Drawer navigation", "Module list routes correctly"],
                ["Dashboard KPIs", "Command center renders metrics"],
                ["EAS artefact", "Install from Downloads Center succeeds"],
            ],
        )
    )
    parts.append(
        table_html(
            "Chrome extension test matrix",
            ["Focus", "Checks"],
            [
                ["Popup render", "Tasks and recent projects display"],
                ["Service worker", "Background refresh and messaging"],
                ["Context menus", "Registered actions appear and invoke handlers"],
                ["Auth", "Popup respects 401 and prompts re-login"],
            ],
        )
    )
    parts.append(
        table_html(
            "Cross-browser verification",
            ["Browser", "Status target"],
            [
                ["Chromium (Chrome/Edge)", "Primary supported"],
                ["Firefox", "Core flows verified"],
                ["Safari", "Core flows verified on macOS/iOS Safari where applicable"],
            ],
        )
    )

    parts.append(_h1("Future Roadmap", "future-roadmap"))
    parts.append(
        _p(
            "EliteFlow’s documented baseline is production-deployable. The roadmap below sequences "
            "inventory depth, mobile reach, analytics hardening, and enterprise directory features "
            "without overstating current scope."
        )
    )
    parts.append(
        table_html(
            "Future roadmap phases",
            ["Phase", "Focus", "Outcomes"],
            [
                [
                    "Phase 2",
                    "Inventory & payments",
                    "SKU/warehouse module, deeper payment gateways, iOS distribution",
                ],
                [
                    "Phase 3",
                    "Advanced analytics",
                    "Warehouse exports, anomaly detection, customer-facing SLA portals",
                ],
                [
                    "Continuous",
                    "Integrations & AI governance",
                    "More OAuth connectors, stronger DLP for AI, SCIM directory sync",
                ],
            ],
        )
    )
    parts.append(
        _diag(
            diagrams.svg_inventory_placeholder(),
            "Inventory module placeholder — Phase 2 roadmap capability",
        )
    )

    parts.append(_h1("Conclusion", "conclusion"))
    parts.append(
        _p(
            "EliteFlow is a complete multi-platform enterprise product: Next.js 16 web, Express 5 "
            "API under /api/v1, Prisma 6 on Supabase PostgreSQL, JWT+Argon2 authentication, RBAC "
            "across SUPER_ADMIN, ADMIN, EMPLOYEE, and CLIENT, AI assistance via Gemini/OpenAI, "
            "Electron desktop, Expo 57 Android, Chrome MV3 extension, and production deployment on "
            "Vercel and Railway."
        )
    )
    parts.append(
        _p(
            f"Platform chapters—supported by magazine-style screenshot explanations and "
            f"architecture diagrams—show that {brand.AUTHOR} delivered an operable business "
            f"platform with clear boundaries and a forward roadmap. {brand.COPYRIGHT}"
        )
    )

    parts.append("</div>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Public builder
# ---------------------------------------------------------------------------


def build_body_html() -> str:
    """Concatenate front matter and all continuous content sections."""
    global figure_counter, table_counter, _shot_toggle
    figure_counter = 0
    table_counter = 0
    _shot_toggle = 0
    _shot_buffer.clear()
    _PLANNED_TABLES.clear()

    sections = [
        _front_cover(),
        _front_overview(),
        _front_toc(),
        _front_lof(),
        _front_lot(),
        _core_chapters(),
        _web_application(),
        _desktop_application(),
        _android_application(),
        _chrome_extension(),
        _closing_chapters(),
        flush_shots(),
    ]
    return "\n".join(sections)
