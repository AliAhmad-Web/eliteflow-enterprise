#!/usr/bin/env python3
"""
Generate EliteFlow Complete Product Review PDF (analysis-only report).

Two-pass Playwright render: cover → TOC → body, then fill TOC page numbers.

Run:
  python docs/scripts/generate_product_review_pdf.py
"""

from __future__ import annotations

import re
import shutil
import tempfile
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs"
OUT_PDF = OUT_DIR / "ELITEFLOW_COMPLETE_PRODUCT_REVIEW.pdf"

NAVY = "#0B3A6E"
PURPLE = "#7C3AED"
GOLD = "#F59E0B"
INK = "#0F172A"
GRAY = "#4B5563"
BORDER = "#D1D5DB"
SURFACE = "#F8FAFC"
WHITE = "#FFFFFF"

DOC_TITLE = "EliteFlow Enterprise Platform"
DOC_SUBTITLE = "Complete Product Review"
DOC_VERSION = "1.0.0"
AUTHOR = "Product Analysis"
REVIEW_DATE = "July 29, 2026"
CLASSIFICATION = "Analysis Only · No Code Changes"


def css() -> str:
    return f"""
@page {{
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}}
* {{ box-sizing: border-box; }}
html, body {{
  margin: 0; padding: 0;
  font-family: 'Segoe UI', Calibri, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: {INK};
  background: {WHITE};
}}
.cover {{
  page-break-after: always;
  min-height: 240mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20mm 10mm;
  border-top: 8px solid {NAVY};
  border-bottom: 4px solid {PURPLE};
}}
.cover-eyebrow {{
  color: {PURPLE};
  font-size: 11pt;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 12mm;
}}
.cover h1 {{
  font-size: 28pt;
  color: {NAVY};
  margin: 0 0 4mm;
  line-height: 1.2;
  font-weight: 700;
}}
.cover h2 {{
  font-size: 16pt;
  color: {PURPLE};
  font-weight: 600;
  margin: 0 0 14mm;
}}
.cover-meta {{
  border-top: 1px solid {BORDER};
  padding-top: 8mm;
  font-size: 10.5pt;
  color: {GRAY};
}}
.cover-meta dt {{
  font-weight: 700;
  color: {NAVY};
  float: left;
  width: 42mm;
  clear: left;
}}
.cover-meta dd {{
  margin: 0 0 3mm 44mm;
}}
.badge {{
  display: inline-block;
  margin-top: 12mm;
  padding: 3mm 5mm;
  background: {SURFACE};
  border: 1px solid {BORDER};
  border-left: 4px solid {GOLD};
  font-size: 9.5pt;
  color: {GRAY};
}}
.toc-page {{ page-break-after: always; }}
.toc-page h1 {{
  font-size: 18pt;
  color: {NAVY};
  border-bottom: 2px solid {PURPLE};
  padding-bottom: 3mm;
  margin-bottom: 8mm;
}}
.toc-list {{ list-style: none; padding: 0; margin: 0; }}
.toc-list li {{
  display: flex;
  align-items: baseline;
  gap: 2mm;
  margin: 2.2mm 0;
  font-size: 10pt;
}}
.toc-list li.l2 {{ padding-left: 6mm; font-size: 9.5pt; color: {GRAY}; }}
.toc-list li.l3 {{ padding-left: 12mm; font-size: 9pt; color: {GRAY}; }}
.toc-list a {{
  color: inherit;
  text-decoration: none;
  flex: 0 1 auto;
}}
.toc-dots {{
  flex: 1 1 auto;
  border-bottom: 1px dotted {BORDER};
  margin: 0 2mm;
  min-width: 8mm;
  height: 0.9em;
}}
.page-ref {{
  flex: 0 0 auto;
  color: {NAVY};
  font-weight: 600;
  min-width: 6mm;
  text-align: right;
}}
h1.sec {{
  font-size: 16pt;
  color: {NAVY};
  border-bottom: 2px solid {PURPLE};
  padding-bottom: 2.5mm;
  margin: 10mm 0 5mm;
  page-break-after: avoid;
}}
h2.sec {{
  font-size: 13pt;
  color: {NAVY};
  margin: 7mm 0 3mm;
  page-break-after: avoid;
  border-left: 3px solid {PURPLE};
  padding-left: 3mm;
}}
h3.sec {{
  font-size: 11.5pt;
  color: {PURPLE};
  margin: 5mm 0 2mm;
  page-break-after: avoid;
}}
h4.sec {{
  font-size: 10.5pt;
  color: {NAVY};
  margin: 4mm 0 2mm;
  page-break-after: avoid;
}}
p {{ margin: 0 0 3mm; }}
ul, ol {{ margin: 0 0 3.5mm; padding-left: 5.5mm; }}
li {{ margin-bottom: 1.2mm; }}
strong {{ color: {INK}; }}
.note {{
  background: {SURFACE};
  border-left: 3px solid {GOLD};
  padding: 3mm 4mm;
  margin: 4mm 0 5mm;
  font-size: 9.5pt;
  color: {GRAY};
}}
.summary-box {{
  background: {SURFACE};
  border: 1px solid {BORDER};
  border-top: 3px solid {NAVY};
  padding: 4mm 5mm;
  margin: 0 0 5mm;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 5mm;
  font-size: 9pt;
  page-break-inside: auto;
}}
thead {{ display: table-header-group; }}
tr {{ page-break-inside: avoid; }}
th {{
  background: {NAVY};
  color: {WHITE};
  text-align: left;
  padding: 2.2mm 2.5mm;
  font-weight: 600;
  vertical-align: top;
}}
td {{
  border: 1px solid {BORDER};
  padding: 2mm 2.5mm;
  vertical-align: top;
}}
tr:nth-child(even) td {{ background: {SURFACE}; }}
.priority {{
  font-weight: 700;
  color: {PURPLE};
}}
.section-break {{ page-break-before: always; }}
.footer-note {{
  margin-top: 10mm;
  padding-top: 4mm;
  border-top: 1px solid {BORDER};
  font-size: 9pt;
  color: {GRAY};
  font-style: italic;
}}
"""


def toc_item(level: int, title: str, anchor: str) -> str:
    cls = {1: "l1", 2: "l2", 3: "l3"}.get(level, "l1")
    return (
        f'<li class="{cls}">'
        f'<a href="#{anchor}">{title}</a>'
        f'<span class="toc-dots"></span>'
        f'<span class="page-ref">…</span>'
        f"</li>"
    )


def h(level: int, text: str, anchor: str, *, section_break: bool = False) -> str:
    cls = "sec section-break" if section_break else "sec"
    tag = f"h{level}"
    return f'<{tag} class="{cls}" id="{anchor}">{text}</{tag}>'


def table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{h_}</th>" for h_ in headers)
    body = []
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        body.append(f"<tr>{tds}</tr>")
    return f"<table><thead><tr>{th}</tr></thead><tbody>{''.join(body)}</tbody></table>"


def build_body() -> str:
    """Full product review content — preserved from the analysis report."""
    parts: list[str] = []

    # ----- Cover -----
    parts.append(
        f"""
<div class="cover">
  <div class="cover-eyebrow">Enterprise Technical Report</div>
  <h1>{DOC_TITLE}</h1>
  <h2>{DOC_SUBTITLE}</h2>
  <dl class="cover-meta">
    <dt>Document Type</dt><dd>Complete Product Review · Analysis Only</dd>
    <dt>Review Date</dt><dd>{REVIEW_DATE}</dd>
    <dt>Version Assessed</dt><dd>Phase 1 foundation (v{DOC_VERSION} across client surfaces)</dd>
    <dt>Scope</dt><dd>Full monorepo — Web, API, Mobile, Desktop, Chrome Extension, Shared packages</dd>
    <dt>Classification</dt><dd>{CLASSIFICATION}</dd>
    <dt>Author Role</dt><dd>{AUTHOR}</dd>
  </dl>
  <div class="badge">
    This review was conducted through static codebase analysis only.
    No code was written, modified, or executed as part of this assessment.
  </div>
</div>
"""
    )

    # ----- TOC -----
    toc_entries = [
        (1, "Executive Summary", "exec-summary"),
        (1, "1. Platform Architecture Overview", "sec-1"),
        (1, "2. Complete Module & Page Inventory", "sec-2"),
        (2, "2.1 Web Application Pages (40 routes)", "sec-2-1"),
        (2, "2.2 Backend API Modules (16 domains)", "sec-2-2"),
        (2, "2.3 Mobile Application Screens", "sec-2-3"),
        (2, "2.4 Desktop Application", "sec-2-4"),
        (2, "2.5 Chrome Extension Views", "sec-2-5"),
        (1, "3. Module-by-Module Analysis & Recommendations", "sec-3"),
        (2, "3.1 Authentication & Onboarding", "sec-3-1"),
        (2, "3.2 Admin Console", "sec-3-2"),
        (2, "3.3 Operations Dashboard", "sec-3-3"),
        (2, "3.4 Employee Workspace", "sec-3-4"),
        (2, "3.5 Client Portal", "sec-3-5"),
        (2, "3.6 Clients (CRM)", "sec-3-6"),
        (2, "3.7 Projects", "sec-3-7"),
        (2, "3.8 Tasks", "sec-3-8"),
        (2, "3.9 Invoices & Billing", "sec-3-9"),
        (2, "3.10 AI Assistant", "sec-3-10"),
        (2, "3.11 AI Documents", "sec-3-11"),
        (2, "3.12 Messages", "sec-3-12"),
        (2, "3.13 Channels", "sec-3-13"),
        (2, "3.14 Announcements", "sec-3-14"),
        (2, "3.15 Threads", "sec-3-15"),
        (2, "3.16 Meetings", "sec-3-16"),
        (2, "3.17 Activity Feed", "sec-3-17"),
        (2, "3.18 Calendar", "sec-3-18"),
        (2, "3.19 Whiteboard", "sec-3-19"),
        (2, "3.20 File Manager", "sec-3-20"),
        (2, "3.21 Reports & Analytics", "sec-3-21"),
        (2, "3.22 Team / HR", "sec-3-22"),
        (2, "3.23 Notifications", "sec-3-23"),
        (2, "3.24 Integrations", "sec-3-24"),
        (2, "3.25 Security Center", "sec-3-25"),
        (2, "3.26 Settings", "sec-3-26"),
        (2, "3.27 Downloads", "sec-3-27"),
        (1, "4. Missing Enterprise-Level Features", "sec-4"),
        (2, "4.1 Critical Gaps", "sec-4-1"),
        (2, "4.2 Partial Implementations Needing Completion", "sec-4-2"),
        (1, "5. Recommended New Modules & Pages", "sec-5"),
        (1, "6. Advanced AI Capabilities Roadmap", "sec-6"),
        (2, "6.1 AI Agents", "sec-6-1"),
        (2, "6.2 Workflow Automation", "sec-6-2"),
        (2, "6.3 Smart Analytics", "sec-6-3"),
        (2, "6.4 AI Assistant Improvements", "sec-6-4"),
        (2, "6.5 Predictive Reports", "sec-6-5"),
        (2, "6.6 Intelligent Notifications", "sec-6-6"),
        (1, "7. Platform-Specific Recommendations", "sec-7"),
        (2, "7.1 Web Application", "sec-7-1"),
        (2, "7.2 Desktop Application (Electron)", "sec-7-2"),
        (2, "7.3 Android Application (Mobile)", "sec-7-3"),
        (2, "7.4 Chrome Extension", "sec-7-4"),
        (1, "8. Priority Matrix — All Recommendations", "sec-8"),
        (2, "High Priority", "sec-8-high"),
        (2, "Medium Priority", "sec-8-medium"),
        (2, "Future Enhancements", "sec-8-future"),
        (1, "9. Competitive Positioning Assessment", "sec-9"),
        (1, "10. Conclusion", "sec-10"),
    ]
    toc_html = "".join(toc_item(lv, t, a) for lv, t, a in toc_entries)
    parts.append(
        f"""
<div class="toc-page">
  <h1>Table of Contents</h1>
  <ul class="toc-list">{toc_html}</ul>
</div>
"""
    )

    # ----- Executive Summary -----
    parts.append(h(1, "Executive Summary", "exec-summary"))
    parts.append(
        """
<div class="summary-box">
<p>EliteFlow is a well-architected <strong>multi-surface Enterprise Business Management Platform</strong> built as an npm workspaces monorepo. Phase 1 delivers a credible foundation: authentication with RBAC, CRM (clients), project/task management, invoicing, HR/team module, communication hub (6 sub-modules), AI assistant, file management, calendar, whiteboard, reports, integrations center, security center, and settings — all backed by a production Express API on Railway with PostgreSQL/Prisma.</p>
<p><strong>Strengths:</strong> Unified data model, permission engine, multi-client architecture (web loads in desktop shell), mature API surface (~16 domain modules), and a clear long-term SaaS roadmap documented in the project proposal.</p>
<p><strong>Gaps:</strong> The platform is a strong <strong>operational workspace</strong>, not yet a complete <strong>enterprise ERP/CRM suite</strong>. Multi-tenancy, SSO, advanced finance, inventory, support ticketing, marketing automation, workflow engine, and deep AI automation are largely roadmap items. Mobile and extension are thin clients with partial parity. Several UX polish items remain from internal audits (global search shortcut, chart loading states).</p>
<p><strong>Overall maturity:</strong> ~65–70% of a Phase 1 enterprise foundation; ~25–30% of a full commercial SaaS product as described in the long-term proposal.</p>
</div>
"""
    )

    # ----- Section 1 -----
    parts.append(h(1, "1. Platform Architecture Overview", "sec-1", section_break=True))
    parts.append(
        table(
            ["Surface", "Technology", "Role"],
            [
                ["Web", "Next.js App Router", "Primary enterprise workspace (~40 routes)"],
                ["API", "Express + TypeScript", "REST API at /api/v1 (16 domain modules)"],
                ["Database", "PostgreSQL + Prisma", "60+ models across 19 schema files"],
                ["Mobile", "Expo SDK 57 / React Native", "Android-first (iOS configured, not shipped)"],
                ["Desktop", "Electron 37", "Windows shell loading web app"],
                ["Extension", "Chrome MV3", "Popup productivity companion"],
                ["Shared", "@enterprise/shared", "Permissions, roles, types, Zod schemas"],
            ],
        )
    )
    parts.append(
        "<p><strong>Roles:</strong> SUPER_ADMIN, ADMIN, EMPLOYEE, CLIENT — each with role-specific home dashboards and permission-filtered navigation.</p>"
    )

    # ----- Section 2 -----
    parts.append(h(1, "2. Complete Module & Page Inventory", "sec-2", section_break=True))
    parts.append(h(2, "2.1 Web Application Pages (40 routes)", "sec-2-1"))

    parts.append(h(3, "Public & Authentication", "sec-2-1-auth"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/", "Auth", "Role-based redirect to home dashboard"],
                ["/login", "Auth", "Email/password, OAuth, OTP/2FA, reCAPTCHA"],
                ["/signup", "Auth", "Account registration"],
                ["/forgot-password", "Auth", "Password reset request"],
                ["/reset-password", "Auth", "Token-based password reset"],
                ["/verify-email", "Auth", "Email verification"],
                ["/auth/callback", "Auth", "OAuth completion handler"],
                ["/downloads", "Downloads", "Product distribution hub (Desktop, Extension, Android)"],
                ["/downloads/desktop", "Downloads", "Desktop install guide"],
                ["/downloads/extension", "Downloads", "Chrome extension install guide"],
            ],
        )
    )

    parts.append(h(3, "Role Home Dashboards", "sec-2-1-home"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/admin", "Dashboard", "Super Admin console — system KPIs, priority actions, health"],
                ["/dashboard", "Dashboard", "Admin operations — revenue, projects, invoices, KPIs"],
                ["/workspace", "Dashboard", "Employee home — today's tasks, calendar, assigned work"],
                ["/portal", "Dashboard", "Client portal — projects, invoices, updates feed"],
            ],
        )
    )

    parts.append(h(3, "Business Operations", "sec-2-1-biz"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/clients", "Clients", "CRM — client records, search, stats, CRUD"],
                ["/projects", "Projects", "Project management — status, priority, milestones, team"],
                ["/tasks", "Tasks", "Task management — assignments, comments, activity"],
                ["/invoices", "Invoices", "Billing — invoice CRUD, PDF export, payment stats"],
            ],
        )
    )

    parts.append(h(3, "Intelligence", "sec-2-1-intel"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/ai-assistant", "AI", "Conversational AI — chat, history, assist modes"],
                ["/ai-documents", "AI", "AI Document Studio — generate/edit/export documents"],
            ],
        )
    )

    parts.append(h(3, "Communication Hub (6 sub-modules)", "sec-2-1-comm"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/messages", "Communication", "Direct messages and group conversations"],
                ["/channels", "Communication", "Team channels (list + /channels/[id] chat)"],
                ["/announcements", "Communication", "Org-wide announcements with attachments"],
                ["/threads", "Communication", "Discussion threads with replies and resolution"],
                ["/meetings", "Communication", "Meeting rooms, participants, recordings"],
                ["/activity", "Communication", "Cross-module activity feed with deep links"],
            ],
        )
    )

    parts.append(h(3, "Workspace Tools", "sec-2-1-ws"))
    parts.append(
        table(
            ["Route", "Module", "Purpose"],
            [
                ["/calendar", "Calendar", "Month/week/day views, events, holidays, RSVP"],
                ["/whiteboard", "Whiteboard", "Collaborative canvas — pen, shapes, AI assist"],
                ["/file-manager", "Files", "Folders, upload, share, versions, trash"],
                ["/reports", "Reports", "Analytics dashboard, saved reports, export"],
                ["/team", "Team/HR", "Employees, departments, teams, attendance, leave, goals, reviews"],
                ["/notifications", "Notifications", "Inbox, preferences, bulk actions, permalinks"],
                ["/integrations", "Integrations", "Integration catalog, connect/disconnect, monitoring"],
                ["/integrations/[slug]", "Integrations", "Per-integration config, webhooks, sync, alerts"],
                ["/security", "Security", "Security score, sessions, audit logs, password"],
                ["/settings", "Settings", "11-section settings center"],
                ["/settings/security", "Settings", "Security shortcuts"],
                ["/settings/security/sessions", "Settings", "Active session management"],
            ],
        )
    )

    parts.append(h(2, "2.2 Backend API Modules (16 domains)", "sec-2-2"))
    parts.append(
        table(
            ["Module", "Base Path", "Purpose"],
            [
                ["Health", "/health", "Liveness check"],
                ["Auth", "/auth", "Signup, login, JWT, OAuth, OTP/2FA, sessions"],
                ["Clients", "/clients", "CRM CRUD + stats"],
                ["Projects", "/projects", "Project lifecycle + milestones"],
                ["Tasks", "/tasks", "Task CRUD + comments + activity"],
                ["Invoices", "/invoices", "Billing + PDF generation"],
                ["AI", "/ai", "Chat (stream/non-stream), conversations, documents"],
                ["Files", "/files", "Folders, upload, share, versions, trash"],
                ["Calendar", "/calendar", "Events, holidays, RSVP"],
                ["Team", "/team", "HR — departments, employees, attendance, leave, goals, reviews"],
                ["Reports", "/reports", "Analytics, insights, saved reports, export"],
                ["Notifications", "/notifications", "Inbox, preferences, triggers, email queue"],
                ["Communication", "/communication", "Messages, channels, announcements, threads, meetings, presence"],
                ["Security", "/security", "Audit logs, sessions, password, alerts, reCAPTCHA contact"],
                ["Settings", "/settings", "Profile, company, preferences, API keys, backup, billing"],
                ["Integrations", "/integrations", "OAuth/API-key providers, sync engine, webhooks, monitoring"],
                ["Whiteboards", "/whiteboards", "Canvas CRUD, versions, comments, AI assist"],
            ],
        )
    )

    parts.append(h(2, "2.3 Mobile Application Screens", "sec-2-3"))
    parts.append(
        """
<p><strong>Auth:</strong> Login, Forgot Password</p>
<p><strong>Tabs:</strong> Home, Search, Alerts (Notifications), Profile</p>
<p><strong>Drawer modules:</strong> Dashboard, Clients, Projects, Tasks, Calendar, Messages, Files, Search, Notifications, AI Assistant, AI Documents, Sync Queue, Settings</p>
<p><strong>Stack screens:</strong> Client list/detail/create/edit, Project list/detail, Task list/detail/create/edit, Calendar, Communication hub/thread, File manager/preview/downloads, AI chat/history/documents, Offline queue inspector, Settings (theme, biometrics, app lock, push)</p>
"""
    )

    parts.append(h(2, "2.4 Desktop Application", "sec-2-4"))
    parts.append(
        "<p>Not a separate UI — Electron shell loading the full web app with native IPC: notifications, downloads, file picker, clipboard, window controls, tray, deep links (eliteflow://), auto-update (architecture ready, disabled).</p>"
    )

    parts.append(h(2, "2.5 Chrome Extension Views", "sec-2-5"))
    parts.append(
        """
<p>Login, Dashboard (tasks/notifications/projects summary), AI chat, Notifications, Actions hub, Create Task, Create Note (AI document), Search. Background: badge polling, context menus ("Send to EliteFlow AI", "Save to EliteFlow Project").</p>
"""
    )

    # ----- Section 3 -----
    parts.append(
        h(1, "3. Module-by-Module Analysis & Recommendations", "sec-3", section_break=True)
    )

    # 3.1
    parts.append(h(2, "3.1 Authentication & Onboarding", "sec-3-1"))
    parts.append(
        "<p><strong>Purpose:</strong> Secure identity — signup, login, OAuth (Google/GitHub), email verification, OTP/2FA, password reset, session management.</p>"
    )
    parts.append(
        table(
            ["Category", "Current State", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Functional forms with reCAPTCHA",
                    "Add progressive onboarding wizard post-signup; social proof on login; clearer 2FA setup flow in settings",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "JWT + refresh rotation, device sessions",
                    "Add invitation-only signup for enterprise; domain-restricted registration (@company.com)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Security",
                    "OTP/2FA via email, CSRF, rate limits",
                    "Add TOTP authenticator app (Google Authenticator); WebAuthn/passkeys; SSO/SAML for enterprise IdP",
                    '<span class="priority">High (SSO), Medium (TOTP)</span>',
                ],
                [
                    "AI",
                    "None",
                    "AI-powered suspicious login alerts; risk-based step-up auth",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Automation",
                    "Session cleanup job (hourly)",
                    "Auto-revoke sessions on password change; geo-anomaly alerts",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.2
    parts.append(h(2, "3.2 Admin Console (/admin)", "sec-3-2"))
    parts.append(
        "<p><strong>Purpose:</strong> Super Admin system overview — platform health, priority actions, cross-org metrics.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Add real-time system status indicators; drill-down to failed jobs/integrations",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Connect to live tenant/user counts when multi-tenancy ships",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Missing",
                    "User management UI, role editor, permission matrix, org provisioning",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI anomaly detection on audit logs; predictive capacity alerts",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Security",
                    "Break-glass admin actions with MFA + approval workflow",
                    '<span class="priority">High</span>',
                ],
            ],
        )
    )

    # 3.3
    parts.append(h(2, "3.3 Operations Dashboard (/dashboard)", "sec-3-3"))
    parts.append(
        "<p><strong>Purpose:</strong> Admin home — revenue chart, project status, KPIs, recent projects/invoices.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Fix Ctrl+K search (displayed but not wired per UI audit); add chart loading skeletons; KPI count-up animations",
                    '<span class="priority">High (search), Medium (charts)</span>',
                ],
                [
                    "Business Logic",
                    "Customizable widget layout per admin; date-range filters on all KPIs",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    '"Ask about this dashboard" — natural language drill-down into metrics',
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Scheduled dashboard email digests to leadership",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Pin favorite widgets; save dashboard views",
                    '<span class="priority">Low</span>',
                ],
            ],
        )
    )

    # 3.4
    parts.append(h(2, "3.4 Employee Workspace (/workspace)", "sec-3-4"))
    parts.append(
        "<p><strong>Purpose:</strong> Employee home — today's tasks, calendar preview, assigned projects, focus lists.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    'Time-blocking view integrating calendar + tasks; "Start my day" summary',
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Smart task prioritization based on due date, dependencies, workload",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    'Daily AI briefing: "Here are your 3 priorities today"',
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Auto-reschedule overdue tasks; snooze with smart reminders",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.5
    parts.append(h(2, "3.5 Client Portal (/portal)", "sec-3-5"))
    parts.append(
        "<p><strong>Purpose:</strong> External client view — project progress, invoices, announcements, limited visibility.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Branded white-label portal per client; mobile-responsive project timeline",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Client approval workflows (milestones, deliverables); e-signature on documents",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Client self-service ticket submission; document request portal",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI project status summaries for clients in plain language",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "Scoped data isolation per client; audit trail of client access",
                    '<span class="priority">High</span>',
                ],
            ],
        )
    )

    # 3.6
    parts.append(h(2, "3.6 Clients (CRM)", "sec-3-6"))
    parts.append(
        "<p><strong>Purpose:</strong> Customer relationship management — company/contact records, stats, search, CRUD.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Client 360° view — timeline of all interactions (emails, tasks, invoices, meetings)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Lead pipeline stages (Lead → Prospect → Active → Churned); deal value tracking",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Contact persons per client; custom fields; tags/segments; import/export CSV",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Lead scoring; churn risk prediction; AI email draft from client context",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Auto-create project on client onboarding; follow-up reminders",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Duplicate detection; merge clients",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.7
    parts.append(h(2, "3.7 Projects", "sec-3-7"))
    parts.append(
        "<p><strong>Purpose:</strong> Project lifecycle — status, priority, team, milestones, attachments, progress.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Gantt/timeline view; Kanban board; project templates",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Budget tracking (hours vs. estimate); dependency between projects",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Missing",
                    "Resource allocation view; project profitability report",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI project risk assessment; auto-generate status reports",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Status change triggers (notify client, create invoice milestone)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Productivity",
                    "Clone project from template; bulk milestone creation",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.8
    parts.append(h(2, "3.8 Tasks", "sec-3-8"))
    parts.append(
        "<p><strong>Purpose:</strong> Task management — assignments, priority, status, comments, activity log.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Kanban/list/calendar views; subtasks; drag-and-drop reorder",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Task dependencies; recurring tasks; time tracking per task",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI task breakdown from project description; smart assignee suggestions",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Auto-escalate overdue tasks; SLA timers",
                    '<span class="priority">High</span>',
                ],
                [
                    "Productivity",
                    "Bulk edit; keyboard shortcuts; quick-add from anywhere",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.9
    parts.append(h(2, "3.9 Invoices & Billing", "sec-3-9"))
    parts.append(
        "<p><strong>Purpose:</strong> Invoice CRUD, line items, PDF export, payment history, billing stats.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Invoice preview before send; payment status timeline",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Recurring invoices; partial payments; credit notes; tax rules",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Online payment collection (Stripe checkout); dunning for overdue",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI invoice description generation from project data",
                    '<span class="priority">Low</span>',
                ],
                [
                    "Automation",
                    "Auto-send reminders at 7/14/30 days overdue; auto-generate from milestones",
                    '<span class="priority">High</span>',
                ],
                [
                    "Security",
                    "PCI compliance if handling payments; invoice access audit",
                    '<span class="priority">High</span>',
                ],
            ],
        )
    )

    # 3.10
    parts.append(h(2, "3.10 AI Assistant", "sec-3-10"))
    parts.append(
        "<p><strong>Purpose:</strong> Conversational AI with history, assist modes (ASK, EMAIL, PROPOSAL, SUMMARIZE), streaming.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Context panel showing what data AI is using; citation links to records",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Tool-use / function calling to create tasks, query reports, draft invoices",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Multi-provider failover; RAG over org documents and files",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Scheduled AI reports; AI-triggered workflows",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Voice input; slash commands (/task, /invoice, /summarize)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "AI data boundary per role; PII redaction in prompts",
                    '<span class="priority">High</span>',
                ],
            ],
        )
    )

    # 3.11
    parts.append(h(2, "3.11 AI Documents", "sec-3-11"))
    parts.append(
        "<p><strong>Purpose:</strong> Generate, edit, and export AI-created documents (proposals, meeting notes, emails).</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Rich text editor with templates; version history; collaborative editing",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Link documents to clients/projects; approval workflow before send",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    "OCR import (scan → structured document); multi-language generation",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Auto-generate meeting notes from calendar events; post-meeting summaries",
                    '<span class="priority">High</span>',
                ],
                [
                    "Productivity",
                    "Template library; bulk export",
                    '<span class="priority">Low</span>',
                ],
            ],
        )
    )

    # 3.12
    parts.append(h(2, "3.12 Messages", "sec-3-12"))
    parts.append(
        "<p><strong>Purpose:</strong> Direct and group messaging with attachments, reactions, typing, read receipts.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Threaded replies; message search within conversation; emoji picker",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Link messages to tasks/projects/clients; @mentions with notifications",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Real-time WebSocket delivery (currently polling/heartbeat)",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Smart reply suggestions; message summarization for long threads",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "End-to-end encryption option for sensitive channels",
                    '<span class="priority">Future</span>',
                ],
            ],
        )
    )

    # 3.13
    parts.append(h(2, "3.13 Channels", "sec-3-13"))
    parts.append(
        "<p><strong>Purpose:</strong> Team channels for topic-based async communication.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Channel categories; pinned messages; member roles (admin/member)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Public vs. private channels; archive with search",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Channel auto-creation per project; bot integrations",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.14
    parts.append(h(2, "3.14 Announcements", "sec-3-14"))
    parts.append(
        "<p><strong>Purpose:</strong> Org-wide broadcasts with priority, pinning, attachments, read tracking.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Scheduled publish; audience targeting (department/role)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Require acknowledgment for critical announcements",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Auto-announce on major events (new client, project completion)",
                    '<span class="priority">Low</span>',
                ],
            ],
        )
    )

    # 3.15
    parts.append(h(2, "3.15 Threads", "sec-3-15"))
    parts.append(
        "<p><strong>Purpose:</strong> Structured discussions with replies, tags, resolution status.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Link threads to specific records (task, project, client)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Convert thread to task; SLA on unresolved threads",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    "AI-suggested resolution from knowledge base",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.16
    parts.append(h(2, "3.16 Meetings", "sec-3-16"))
    parts.append(
        "<p><strong>Purpose:</strong> Meeting rooms, participants, recordings, screen shares, AI assist.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Calendar integration for scheduling; join link generation",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Actual video conferencing integration (Zoom/Meet/Teams)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Live transcription; meeting notes auto-generation",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Post-meeting action item extraction",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Auto-create calendar event; send invites",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.17
    parts.append(h(2, "3.17 Activity Feed", "sec-3-17"))
    parts.append(
        "<p><strong>Purpose:</strong> Cross-module activity stream with entity filters and deep links.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Filter by user, module, date; export activity log",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Activity subscriptions (follow a project/client)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    'AI digest: "What happened this week on Project X"',
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.18
    parts.append(h(2, "3.18 Calendar", "sec-3-18"))
    parts.append(
        "<p><strong>Purpose:</strong> Month/week/day views, events, holidays, RSVP, drag-drop.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Multi-calendar overlay (personal + team + project); color coding",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Two-way sync with Google Calendar (integration exists, deepen sync)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Smart scheduling — find mutual availability",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Quick event creation from task due dates",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.19
    parts.append(h(2, "3.19 Whiteboard", "sec-3-19"))
    parts.append(
        "<p><strong>Purpose:</strong> Collaborative visual workspace — drawing, shapes, text, sticky notes, AI assist.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Real-time multiplayer cursors (collaboration layer exists, verify production readiness)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Link whiteboards to projects; export to PDF/PNG",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    "AI diagram generation from text; mind-map from meeting notes",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Templates (SWOT, flowchart, org chart)",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.20
    parts.append(h(2, "3.20 File Manager", "sec-3-20"))
    parts.append(
        "<p><strong>Purpose:</strong> Folders, upload, share, versions, favorites, trash, activity log.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Preview panel for more file types; bulk operations",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Folder-level permissions; link files to clients/projects",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Full-text search within documents; OCR indexing",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "AI document Q&A; auto-tagging and classification",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "Virus scanning on upload; DLP policies",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Auto-organize uploads by client/project rules",
                    '<span class="priority">Future</span>',
                ],
            ],
        )
    )

    # 3.21
    parts.append(h(2, "3.21 Reports & Analytics", "sec-3-21"))
    parts.append(
        "<p><strong>Purpose:</strong> KPI dashboard, charts, saved reports, export (PDF/CSV/Excel), AI insights.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Custom report builder (drag-drop fields); scheduled report delivery",
                    '<span class="priority">High</span>',
                ],
                [
                    "Business Logic",
                    "Cross-module reports (revenue by client, utilization by employee)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Report scheduling (model exists: ReportSchedule, verify UI)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "AI",
                    "Natural language report queries; anomaly detection in metrics",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Auto-email weekly/monthly reports to stakeholders",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.22
    parts.append(h(2, "3.22 Team / HR", "sec-3-22"))
    parts.append(
        "<p><strong>Purpose:</strong> Employees, departments, teams, attendance, leave, goals, performance reviews.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Org chart visualization; employee profile cards",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Payroll integration; benefits tracking; onboarding checklists",
                    '<span class="priority">High (payroll = new module)</span>',
                ],
                [
                    "Missing",
                    "Recruitment/applicant tracking; training records; asset assignment",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Performance review draft assistance; attrition risk scoring",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Automation",
                    "Leave approval routing; attendance anomaly alerts",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Productivity",
                    "Bulk import employees; org restructuring wizard",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.23
    parts.append(h(2, "3.23 Notifications", "sec-3-23"))
    parts.append(
        "<p><strong>Purpose:</strong> Inbox, preferences, bulk actions, category filters, deep links, email queue.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Notification grouping; snooze; priority inbox",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Custom notification rules (if X then notify Y)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Push device registration API (mobile client-ready, backend gap)",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Intelligent notification prioritization; digest mode",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Automation",
                    "Expand trigger scanner (currently tasks/invoices/leaves)",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.24
    parts.append(h(2, "3.24 Integrations", "sec-3-24"))
    parts.append(
        "<p><strong>Purpose:</strong> Connect Gmail, Google Calendar, GitHub, OpenAI, Gemini, Stripe, Cloudinary, Supabase, Resend; monitoring, sync, webhooks, alerts.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Integration marketplace with categories; setup wizards",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "Bi-directional sync for calendar/email; Stripe payment webhooks",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "Slack, Microsoft 365, QuickBooks, Zapier/Make connectors",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Visual integration flow builder",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Security",
                    "Credential rotation alerts; integration access audit",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.25
    parts.append(h(2, "3.25 Security Center", "sec-3-25"))
    parts.append(
        "<p><strong>Purpose:</strong> Security score, password change, sessions, login history, audit logs, alerts.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Security posture dashboard with remediation steps",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "IP allowlisting; session policies (max concurrent, idle timeout)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "SIEM export; compliance reports (SOC 2, GDPR)",
                    '<span class="priority">High</span>',
                ],
                [
                    "AI",
                    "Threat detection on login patterns",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "Mandatory 2FA for admin roles; password policy enforcement UI",
                    '<span class="priority">High</span>',
                ],
            ],
        )
    )

    # 3.26
    parts.append(h(2, "3.26 Settings (11 sections)", "sec-3-26"))
    parts.append(
        "<p><strong>Sections:</strong> Profile, Company, Appearance, Language &amp; Locale, Notifications, AI Preferences, Security, API Keys, Backup, Storage, Billing.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Search within settings; settings change history",
                    '<span class="priority">Low</span>',
                ],
                [
                    "Business Logic",
                    "Billing: connect to Stripe subscriptions (model exists, deepen)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Missing",
                    "User management section; role/permission editor; data export (GDPR)",
                    '<span class="priority">High</span>',
                ],
                [
                    "Automation",
                    "Scheduled backups with restore testing",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "API key scoping and expiration; audit of settings changes",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # 3.27
    parts.append(h(2, "3.27 Downloads", "sec-3-27"))
    parts.append(
        "<p><strong>Purpose:</strong> Distribute Desktop (Windows), Chrome Extension, and Android APK builds.</p>"
    )
    parts.append(
        table(
            ["Category", "Recommendations", "Priority"],
            [
                [
                    "UI/UX",
                    "Version changelog; auto-detect platform; install progress",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Business Logic",
                    "MDM deployment packages for enterprise",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Missing",
                    "macOS/Linux desktop builds; iOS App Store link",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # ----- Section 4 -----
    parts.append(h(1, "4. Missing Enterprise-Level Features", "sec-4", section_break=True))
    parts.append(h(2, "4.1 Critical Gaps (Expected in Full Enterprise Suite)", "sec-4-1"))
    parts.append(
        table(
            ["Feature", "Status", "Impact"],
            [
                [
                    "Multi-tenancy / SaaS",
                    "Schema has companyId placeholder; not implemented",
                    "Cannot sell as multi-org SaaS",
                ],
                [
                    "SSO / SAML / OIDC",
                    "Documented as future",
                    "Enterprise procurement blocker",
                ],
                [
                    "User & Role Management UI",
                    "API permissions exist; no admin UI for roles",
                    "Admins cannot self-serve",
                ],
                [
                    "Online Payments",
                    "Stripe integration scaffolded; no checkout flow",
                    "Revenue collection manual",
                ],
                [
                    "Support / Ticketing",
                    "Not implemented",
                    "No customer support module",
                ],
                [
                    "Inventory / Warehouse",
                    "Not implemented",
                    "No ERP completeness",
                ],
                [
                    "Accounting / General Ledger",
                    "Not implemented",
                    "Finance teams need external tool",
                ],
                ["Payroll", "Not implemented", "HR module incomplete"],
                [
                    "Marketing Automation",
                    "Not implemented",
                    "No email campaigns, SMS, WhatsApp",
                ],
                [
                    "Workflow / BPM Engine",
                    "Not implemented",
                    "No visual automation builder",
                ],
                [
                    "E-Signature",
                    "Not implemented",
                    "Contract workflows manual",
                ],
                [
                    "Real-time (WebSockets)",
                    "Polling/heartbeat for chat",
                    "Latency in communication",
                ],
                [
                    "Public API / Developer Portal",
                    "API keys in settings; no docs portal",
                    "No partner ecosystem",
                ],
                [
                    "Data Residency / Compliance",
                    "Not implemented",
                    "EU/GCC enterprise requirement",
                ],
                [
                    "Advanced Audit & Compliance",
                    "Basic audit logs exist",
                    "SOC 2 / ISO 27001 gap",
                ],
            ],
        )
    )

    parts.append(h(2, "4.2 Partial Implementations Needing Completion", "sec-4-2"))
    parts.append(
        table(
            ["Feature", "Gap"],
            [
                ["2FA", "Email OTP works; no TOTP app or WebAuthn"],
                [
                    "Push Notifications",
                    "Mobile client ready; POST /notifications/devices missing",
                ],
                [
                    "Report Scheduling",
                    "ReportSchedule model exists; UI/scheduling unclear",
                ],
                [
                    "Billing",
                    "OrganizationBilling model exists; subscription flow incomplete",
                ],
                [
                    "Desktop Auto-Update",
                    "Architecture ready; disabled until release feed",
                ],
                ["iOS Mobile", "Configured in EAS; not shipped to App Store"],
                [
                    "Global Search (Ctrl+K)",
                    "Displayed in header; not fully wired",
                ],
                [
                    "Meeting Video",
                    "Meeting rooms exist; no actual video SDK integration",
                ],
            ],
        )
    )

    # ----- Section 5 -----
    parts.append(h(1, "5. Recommended New Modules & Pages", "sec-5", section_break=True))
    parts.append(
        "<p>For a complete Enterprise Business Management System, these modules should be added:</p>"
    )
    parts.append(
        table(
            ["Module", "Purpose", "Priority"],
            [
                [
                    "User Management",
                    "Invite users, assign roles, deactivate accounts",
                    '<span class="priority">High</span>',
                ],
                [
                    "Role & Permission Editor",
                    "Visual permission matrix per role",
                    '<span class="priority">High</span>',
                ],
                [
                    "Organization / Tenant Admin",
                    "Multi-org provisioning, seat management",
                    '<span class="priority">High</span>',
                ],
                [
                    "Sales Pipeline (CRM+)",
                    "Leads, deals, quotes, forecasting",
                    '<span class="priority">High</span>',
                ],
                [
                    "Support / Help Desk",
                    "Tickets, SLAs, knowledge base, client portal integration",
                    '<span class="priority">High</span>',
                ],
                [
                    "Accounting",
                    "Chart of accounts, journal entries, P&amp;L, balance sheet",
                    '<span class="priority">High</span>',
                ],
                [
                    "Payroll",
                    "Salary, deductions, payslips, tax",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Inventory",
                    "Products, stock levels, purchase orders",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "POS",
                    "Point of sale for retail operations",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Marketing Hub",
                    "Email campaigns, segments, analytics",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Workflow Builder",
                    "Visual if-this-then-that automation",
                    '<span class="priority">High</span>',
                ],
                [
                    "E-Signature",
                    "Document signing with audit trail",
                    '<span class="priority">High</span>',
                ],
                [
                    "Knowledge Base",
                    "Internal wiki / help center",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Asset Management",
                    "Company equipment, licenses, assignments",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Recruitment (ATS)",
                    "Job posts, applicants, interview pipeline",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Time Tracking",
                    "Timesheets, billable hours, approvals",
                    '<span class="priority">High</span>',
                ],
                [
                    "Expense Management",
                    "Submit, approve, reimburse expenses",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Contracts",
                    "Contract lifecycle, renewals, compliance",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Vendor Management",
                    "Supplier records, purchase orders",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Compliance Center",
                    "GDPR tools, data retention, consent",
                    '<span class="priority">High</span>',
                ],
                [
                    "API Developer Portal",
                    "Public docs, sandbox, API keys",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Marketplace",
                    "Third-party app integrations",
                    '<span class="priority">Future</span>',
                ],
            ],
        )
    )

    # ----- Section 6 -----
    parts.append(h(1, "6. Advanced AI Capabilities Roadmap", "sec-6", section_break=True))
    parts.append(h(2, "6.1 AI Agents (Autonomous Task Execution)", "sec-6-1"))
    parts.append(
        table(
            ["Agent", "Capability", "Priority"],
            [
                [
                    "Project Agent",
                    "Monitor project health, suggest reassignments, draft status updates",
                    '<span class="priority">High</span>',
                ],
                [
                    "Finance Agent",
                    "Chase overdue invoices, draft payment reminders, flag anomalies",
                    '<span class="priority">High</span>',
                ],
                [
                    "HR Agent",
                    "Onboarding checklists, leave balance answers, review drafts",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Support Agent",
                    "Triage tickets, suggest resolutions, escalate",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Research Agent",
                    "Summarize client history before meetings",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    parts.append(h(2, "6.2 Workflow Automation", "sec-6-2"))
    parts.append(
        """
<ul>
  <li>Natural language workflow creation: "When invoice is 7 days overdue, email client and notify admin"</li>
  <li>Cross-module triggers: task completion → update project % → notify client portal</li>
  <li>Integration with external tools via webhooks and Zapier-like connectors</li>
</ul>
<p><strong>Priority:</strong> <span class="priority">High</span></p>
"""
    )

    parts.append(h(2, "6.3 Smart Analytics", "sec-6-3"))
    parts.append(
        """
<ul>
  <li>Predictive revenue forecasting from pipeline + historical data</li>
  <li>Churn risk scoring for clients</li>
  <li>Resource utilization heatmaps</li>
  <li>Anomaly detection in financial metrics</li>
</ul>
<p><strong>Priority:</strong> <span class="priority">High</span></p>
"""
    )

    parts.append(h(2, "6.4 AI Assistant Improvements", "sec-6-4"))
    parts.append(
        """
<ul>
  <li><strong>RAG (Retrieval-Augmented Generation):</strong> Index files, messages, and records for context-aware answers</li>
  <li><strong>Tool use:</strong> AI can create tasks, query reports, draft invoices via function calling</li>
  <li><strong>Multi-modal:</strong> Image/document upload for analysis</li>
  <li><strong>Role-aware responses:</strong> CLIENT role gets filtered context</li>
</ul>
<p><strong>Priority:</strong> <span class="priority">High</span></p>
"""
    )

    parts.append(h(2, "6.5 Predictive Reports", "sec-6-5"))
    parts.append(
        """
<ul>
  <li>Auto-generated weekly executive summaries</li>
  <li>"What changed since last week" diffs</li>
  <li>Forecast vs. actual variance analysis</li>
</ul>
<p><strong>Priority:</strong> <span class="priority">Medium</span></p>
"""
    )

    parts.append(h(2, "6.6 Intelligent Notifications", "sec-6-6"))
    parts.append(
        """
<ul>
  <li>Priority scoring (urgent vs. informational)</li>
  <li>Digest mode: batch low-priority into daily summary</li>
  <li>Smart routing: right person, right channel, right time</li>
  <li>AI-generated notification text with action buttons</li>
</ul>
<p><strong>Priority:</strong> <span class="priority">Medium</span></p>
"""
    )

    # ----- Section 7 -----
    parts.append(
        h(1, "7. Platform-Specific Recommendations", "sec-7", section_break=True)
    )

    parts.append(h(2, "7.1 Web Application", "sec-7-1"))
    parts.append(
        table(
            ["Area", "Recommendation", "Priority"],
            [
                [
                    "Performance",
                    "Route-level code splitting audit; optimize keep-alive registry memory",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Accessibility",
                    "WCAG 2.1 AA audit; keyboard navigation for all modals",
                    '<span class="priority">High</span>',
                ],
                [
                    "Responsive",
                    "Tablet layout optimization (sidebar behavior at 1024px)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Offline",
                    "Service worker for read-only cache of recent data",
                    '<span class="priority">Future</span>',
                ],
                [
                    "PWA",
                    "Installable web app with push notifications",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Global Search",
                    "Wire Ctrl+K to GlobalSearchDialog with fan-out",
                    '<span class="priority">High</span>',
                ],
                [
                    "Real-time",
                    "WebSocket layer for chat, notifications, whiteboard",
                    '<span class="priority">High</span>',
                ],
                [
                    "Customization",
                    "User-configurable dashboard layouts",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "i18n",
                    "Full RTL support for Arabic (labels exist, verify completeness)",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    parts.append(h(2, "7.2 Desktop Application (Electron)", "sec-7-2"))
    parts.append(
        table(
            ["Area", "Recommendation", "Priority"],
            [
                [
                    "Platforms",
                    "macOS and Linux builds (currently Windows-only)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Auto-Update",
                    "Enable release feed; seamless background updates",
                    '<span class="priority">High</span>',
                ],
                [
                    "Native Features",
                    "System notifications for task due dates; calendar integration",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Offline",
                    "Local SQLite cache for critical data when API unreachable",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Performance",
                    "Hardware acceleration toggle; memory management for long sessions",
                    '<span class="priority">Low</span>',
                ],
                [
                    "Security",
                    "Code signing for Windows/macOS; notarization for macOS",
                    '<span class="priority">High</span>',
                ],
                [
                    "Tray",
                    "Enable system tray by default with quick actions",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Deep Links",
                    "Expand eliteflow:// protocol for all entity types",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Multi-Window",
                    "Open projects/tasks in separate windows",
                    '<span class="priority">Low</span>',
                ],
            ],
        )
    )

    parts.append(h(2, "7.3 Android Application (Mobile)", "sec-7-3"))
    parts.append(
        table(
            ["Area", "Recommendation", "Priority"],
            [
                [
                    "Push Notifications",
                    "Implement backend device registration endpoint",
                    '<span class="priority">High</span>',
                ],
                [
                    "Play Store",
                    "Complete store listing, privacy policy, production release",
                    '<span class="priority">High</span>',
                ],
                [
                    "iOS Parity",
                    "Ship iOS build via EAS; App Store Connect setup",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Offline",
                    "Expand mutation queue to cover more entity types",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Widgets",
                    "Home screen widgets for tasks and calendar",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Biometrics",
                    "Already implemented; add credential autofill",
                    '<span class="priority">Low</span>',
                ],
                [
                    "Voice",
                    "Voice notes exist; add voice-to-task creation",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "NFC/QR",
                    "Scan asset tags or check-in via QR",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Parity Gaps",
                    "Add: Reports, Team/HR, Integrations, Whiteboard, full Meetings",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Performance",
                    "Image caching; list virtualization audit",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    parts.append(h(2, "7.4 Chrome Extension", "sec-7-4"))
    parts.append(
        table(
            ["Area", "Recommendation", "Priority"],
            [
                [
                    "Content Scripts",
                    "Add page context extraction (highlight → AI, form fill)",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Gmail Integration",
                    "Compose sidebar for EliteFlow CRM context",
                    '<span class="priority">High</span>',
                ],
                [
                    "LinkedIn/Sales",
                    "Save contact to CRM from profile pages",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Calendar",
                    "Quick-add events from Google Calendar page",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Side Panel",
                    "Use Chrome Side Panel API for persistent assistant",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Offline",
                    "Cache recent tasks/notifications for offline view",
                    '<span class="priority">Low</span>',
                ],
                [
                    "Firefox/Edge",
                    "Cross-browser manifest compatibility",
                    '<span class="priority">Future</span>',
                ],
                [
                    "Parity",
                    "Add communication, file upload, calendar views",
                    '<span class="priority">Medium</span>',
                ],
                [
                    "Security",
                    "Minimize host permissions; optional permission requests",
                    '<span class="priority">Medium</span>',
                ],
            ],
        )
    )

    # ----- Section 8 -----
    parts.append(
        h(1, "8. Priority Matrix — All Recommendations", "sec-8", section_break=True)
    )

    parts.append(h(2, "High Priority (Next 1–2 Quarters)", "sec-8-high"))
    parts.append(
        """
<ol>
  <li>Multi-tenant organization model and tenant admin UI</li>
  <li>User &amp; role management UI with permission editor</li>
  <li>SSO/SAML for enterprise authentication</li>
  <li>Wire global search (Ctrl+K) end-to-end</li>
  <li>Real-time WebSocket layer for communication</li>
  <li>Push notification device registration (mobile)</li>
  <li>Client portal: approval workflows and e-signature</li>
  <li>CRM 360° view and lead pipeline</li>
  <li>Project Gantt/Kanban views and templates</li>
  <li>Task dependencies, recurring tasks, time tracking</li>
  <li>Invoice online payments (Stripe checkout) and dunning automation</li>
  <li>AI tool-use (create tasks, query data from chat)</li>
  <li>AI RAG over organization documents</li>
  <li>Report builder and cross-module analytics</li>
  <li>File manager: folder permissions and full-text search</li>
  <li>Meeting video integration and AI action items</li>
  <li>Support/ticketing module (new)</li>
  <li>Sales pipeline module (new)</li>
  <li>Workflow automation builder (new)</li>
  <li>Time tracking module (new)</li>
  <li>Desktop: enable auto-update and code signing</li>
  <li>Android: Play Store release + push backend</li>
  <li>Extension: Gmail/CRM sidebar integration</li>
  <li>Security: mandatory 2FA for admins, IP allowlisting</li>
  <li>Compliance: GDPR data export and retention policies</li>
</ol>
"""
    )

    parts.append(h(2, "Medium Priority (Quarters 3–4)", "sec-8-medium"))
    parts.append(
        """
<ol>
  <li>TOTP authenticator app for 2FA</li>
  <li>Customizable dashboard widgets</li>
  <li>Employee workspace AI daily briefing</li>
  <li>Calendar two-way Google sync deepening</li>
  <li>Whiteboard real-time multiplayer production hardening</li>
  <li>Notification custom rules engine</li>
  <li>Integration marketplace (Slack, Microsoft 365, QuickBooks)</li>
  <li>AI predictive analytics and churn scoring</li>
  <li>Intelligent notification prioritization and digests</li>
  <li>HR: recruitment module, org chart</li>
  <li>Marketing hub (email campaigns)</li>
  <li>Knowledge base / internal wiki</li>
  <li>Expense management module</li>
  <li>Desktop macOS/Linux builds</li>
  <li>Mobile iOS App Store release</li>
  <li>Extension content scripts and side panel</li>
  <li>PWA with web push</li>
  <li>Report scheduling UI</li>
  <li>Billing subscription flow completion</li>
  <li>Accessibility WCAG 2.1 AA compliance</li>
</ol>
"""
    )

    parts.append(h(2, "Future Enhancements (Year 2+)", "sec-8-future"))
    parts.append(
        """
<ol>
  <li>Payroll and full accounting (GL, P&amp;L)</li>
  <li>Inventory and warehouse management</li>
  <li>POS module</li>
  <li>Marketing automation (SMS, WhatsApp)</li>
  <li>AI agents (autonomous project/finance/HR agents)</li>
  <li>Visual integration flow builder</li>
  <li>API developer portal and marketplace</li>
  <li>Multi-region data residency</li>
  <li>End-to-end encrypted messaging</li>
  <li>AI threat detection and risk-based auth</li>
  <li>MDM enterprise deployment packages</li>
  <li>NFC/QR mobile features</li>
  <li>Firefox/Edge extension support</li>
  <li>Offline-first desktop with local SQLite</li>
  <li>White-label multi-tenant branding</li>
  <li>SOC 2 / ISO 27001 compliance automation</li>
  <li>Asset management module</li>
  <li>Contract lifecycle management</li>
  <li>Vendor management and procurement</li>
  <li>AI OCR and document classification at scale</li>
</ol>
"""
    )

    # ----- Section 9 -----
    parts.append(
        h(1, "9. Competitive Positioning Assessment", "sec-9", section_break=True)
    )
    parts.append(
        table(
            [
                "Dimension",
                "EliteFlow Today",
                "Enterprise Leaders (Salesforce, Monday, Zoho)",
            ],
            [
                [
                    "Unified workspace",
                    "Strong — one app for ops, comms, AI",
                    "Fragmented or expensive suites",
                ],
                [
                    "Multi-surface",
                    "Strong — web, desktop, mobile, extension",
                    "Often web + mobile only",
                ],
                [
                    "AI integration",
                    "Good foundation — chat, documents, insights",
                    "Adding AI rapidly",
                ],
                [
                    "CRM depth",
                    "Basic — clients list, no pipeline",
                    "Deep pipeline, automation",
                ],
                [
                    "ERP/Finance",
                    "Invoicing only",
                    "Full accounting, payroll, inventory",
                ],
                [
                    "Enterprise auth",
                    "JWT + OTP; no SSO",
                    "SSO, SAML, SCIM standard",
                ],
                [
                    "Multi-tenancy",
                    "Not yet",
                    "Core to SaaS model",
                ],
                [
                    "Ecosystem",
                    "Internal integrations",
                    "Marketplaces, thousands of apps",
                ],
                [
                    "Real-time collab",
                    "Partial (whiteboard, chat polling)",
                    "Native real-time everywhere",
                ],
            ],
        )
    )
    parts.append(
        """
<p><strong>Strategic recommendation:</strong> EliteFlow's differentiation is the <strong>unified multi-surface workspace with embedded AI</strong>. Competing head-on with Salesforce on CRM depth or QuickBooks on accounting is costly. The winning path is: (1) complete the operational core (projects, tasks, comms, files), (2) add workflow automation + AI agents, (3) launch multi-tenant SaaS with billing, (4) expand into vertical modules (support, sales pipeline, time tracking) before broad ERP.</p>
"""
    )

    # ----- Section 10 -----
    parts.append(h(1, "10. Conclusion", "sec-10", section_break=True))
    parts.append(
        """
<p>EliteFlow Phase 1 is an impressive, architecturally sound foundation for an enterprise platform. The monorepo structure, shared permission engine, 16 API modules, and four client surfaces demonstrate production-grade engineering discipline rare at this project scale.</p>
<p>The platform successfully unifies <strong>identity, CRM basics, project management, communication, AI assistance, file management, HR fundamentals, and security</strong> into one coherent experience. Role-based dashboards (Super Admin, Admin, Employee, Client) provide appropriate views for each stakeholder.</p>
<p>To evolve from foundation to commercial enterprise product, the critical path is:</p>
<ol>
  <li><strong>Commercial readiness</strong> — multi-tenancy, billing, SSO, user management</li>
  <li><strong>Operational depth</strong> — pipeline CRM, workflow automation, time tracking, real-time collab</li>
  <li><strong>AI differentiation</strong> — RAG, tool-use, agents, predictive analytics</li>
  <li><strong>Platform parity</strong> — mobile push, desktop auto-update, extension depth</li>
  <li><strong>Enterprise trust</strong> — compliance, audit, security hardening</li>
</ol>
<p>The long-term proposal (FINAL_PROJECT_PROPOSAL_ELITEFLOW.md) correctly frames EliteFlow as a foundation, not a finished product. This review confirms that assessment and provides a prioritized roadmap to close the gap between today's capabilities and a complete Enterprise Business Management System.</p>
<div class="footer-note">
  This review was conducted through static codebase analysis only. No code was written, modified, or executed as part of this assessment.
</div>
"""
    )

    return "\n".join(parts)


def build_html() -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>{DOC_TITLE} — {DOC_SUBTITLE}</title>
  <style>{css()}</style>
</head>
<body>
{build_body()}
</body>
</html>
"""


def header_template() -> str:
    return f"""
    <div style="width:100%;box-sizing:border-box;padding:0 2mm;font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#4B5563;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #D1D5DB;padding-bottom:3px;margin:0 8mm;">
      <div>
        <span style="color:{NAVY};font-weight:700;">EliteFlow</span>
        <span style="color:{PURPLE};"> · Complete Product Review</span>
      </div>
      <div style="color:#6B7280;">Analysis Only · {REVIEW_DATE}</div>
    </div>
    """


def footer_template() -> str:
    return f"""
    <div style="width:100%;box-sizing:border-box;padding:0 2mm;font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#4B5563;display:flex;justify-content:space-between;align-items:flex-start;border-top:1px solid #D1D5DB;padding-top:3px;margin:0 8mm;">
      <div>Confidential · EliteFlow Enterprise</div>
      <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      <div>v{DOC_VERSION}</div>
    </div>
    """


def extract_heading_pages(pdf_path: Path) -> dict[str, int]:
    import fitz

    doc = fitz.open(str(pdf_path))
    mapping: dict[str, int] = {}
    for i, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                size = max(s.get("size", 0) for s in spans)
                text = "".join(s.get("text", "") for s in spans).strip()
                if size >= 12 and text:
                    mapping.setdefault(text, i + 1)
    doc.close()
    return mapping


def apply_toc_pages(html_doc: str, heading_pages: dict[str, int]) -> str:
    soup = BeautifulSoup(html_doc, "lxml")
    for li in soup.select(".toc-list li"):
        a = li.find("a")
        ref = li.find(class_="page-ref")
        if ref is None or a is None:
            continue
        title = a.get_text(strip=True)
        # Try exact, then strip trailing route hints like (/admin)
        page_no = heading_pages.get(title)
        if page_no is None:
            clean = re.sub(r"\s*\([^)]*\)\s*$", "", title).strip()
            page_no = heading_pages.get(clean)
        if page_no is None:
            # Fuzzy: match if heading starts with TOC title or vice versa
            for key, val in heading_pages.items():
                if key.startswith(title) or title.startswith(key):
                    page_no = val
                    break
        if page_no:
            ref.string = str(page_no)
    return str(soup)


def render_pdf(html_doc: str, dest: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / "review.html"
        html_path.write_text(html_doc, encoding="utf-8")
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(html_path.as_uri(), wait_until="networkidle")
            page.pdf(
                path=str(dest),
                format="A4",
                print_background=True,
                display_header_footer=True,
                header_template=header_template(),
                footer_template=footer_template(),
                margin={
                    "top": "16mm",
                    "bottom": "16mm",
                    "left": "16mm",
                    "right": "16mm",
                },
                prefer_css_page_size=True,
            )
            browser.close()


def write_pdf_final(src: Path, dest: Path) -> Path:
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(str(src))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.add_metadata(
        {
            "/Title": f"{DOC_TITLE} — {DOC_SUBTITLE}",
            "/Author": AUTHOR,
            "/Subject": "EliteFlow Complete Product Review — Analysis Only",
            "/Creator": "EliteFlow Product Review Generator",
            "/CreationDate": date.today().strftime("D:%Y%m%d"),
        }
    )

    try:
        if dest.exists():
            dest.unlink()
        with dest.open("wb") as f:
            writer.write(f)
        print(f"PDF written: {dest}")
        return dest
    except PermissionError:
        alt = dest.with_name(dest.stem + "_NEW.pdf")
        with alt.open("wb") as f:
            writer.write(f)
        print(f"WARNING: {dest.name} locked — wrote {alt.name}")
        return alt


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = OUT_DIR / "_product_review_raw.pdf"

    print("Building HTML…")
    html = build_html()

    print("Rendering PDF (pass 1)…")
    render_pdf(html, raw)

    print("Extracting heading page numbers for TOC…")
    pages = extract_heading_pages(raw)
    html2 = apply_toc_pages(html, pages)

    print("Rendering PDF (pass 2 with TOC pages)…")
    render_pdf(html2, raw)

    final = write_pdf_final(raw, OUT_PDF)
    try:
        raw.unlink(missing_ok=True)
    except OSError:
        pass

    print(f"Done. Open: {final}")


if __name__ == "__main__":
    main()
