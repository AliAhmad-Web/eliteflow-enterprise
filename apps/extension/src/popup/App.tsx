import type { SafeUser } from "@enterprise/shared";
import { useEffect, useState, type ReactNode } from "react";

import { authService } from "@/shared/api/auth.service";
import { EXTENSION_VERSION, webUrl, WEB_ROUTES } from "@/shared/config";
import { MESSAGE_TYPES, sendMessage, type PopupView } from "@/shared/messaging";
import { STORAGE_KEYS } from "@/shared/config";

import {
  BellIcon,
  CrownIcon,
  ExternalIcon,
  HomeIcon,
  LogOutIcon,
  SparklesIcon,
  ZapIcon,
} from "./components/icons";
import { AiView } from "./views/AiView";
import {
  ActionsView,
  CreateNoteView,
  CreateTaskView,
  SearchView,
} from "./views/ActionsView";
import { DashboardView, NotificationsView } from "./views/DashboardView";
import { LoginView, useBootstrapAuth } from "./views/LoginView";

function initials(user: SafeUser): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || user.email[0]?.toUpperCase() || "E";
}

export function App() {
  const { user, setUser, loading } = useBootstrapAuth();
  const [view, setView] = useState<PopupView>("dashboard");

  useEffect(() => {
    void (async () => {
      const pending = await chrome.storage.session.get([
        STORAGE_KEYS.PENDING_AI_PROMPT,
        STORAGE_KEYS.PENDING_SAVE_PAGE,
      ]);
      if (pending[STORAGE_KEYS.PENDING_AI_PROMPT]) {
        setView("ai");
        return;
      }
      if (pending[STORAGE_KEYS.PENDING_SAVE_PAGE]) {
        setView("create-note");
      }
    })();
  }, []);

  async function handleLogout() {
    await authService.logout();
    await sendMessage({ type: MESSAGE_TYPES.SESSION_CHANGED });
    setUser(null);
    setView("dashboard");
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-center">
          <div className="spinner" />
          <span>Restoring EliteFlow session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <div className="app-content">
          <LoginView onAuthenticated={setUser} />
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: PopupView; label: string; icon: ReactNode }> = [
    { id: "dashboard", label: "Home", icon: <HomeIcon /> },
    { id: "ai", label: "AI", icon: <SparklesIcon /> },
    { id: "notifications", label: "Alerts", icon: <BellIcon /> },
    { id: "actions", label: "Actions", icon: <ZapIcon /> },
  ];

  const actionsActive = ["actions", "create-task", "create-note", "search"].includes(
    view,
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <CrownIcon />
          </div>
          <div className="brand-text">
            <div className="brand-name">EliteFlow</div>
            <div className="brand-tag">v{EXTENSION_VERSION} · Extension</div>
          </div>
        </div>
        <div className="header-actions">
          <div className="user-chip" title={user.email}>
            <div className="avatar">{initials(user)}</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Open EliteFlow Web"
            onClick={() =>
              chrome.tabs.create({ url: webUrl(WEB_ROUTES.dashboard) })
            }
          >
            <ExternalIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Sign out"
            onClick={() => void handleLogout()}
          >
            <LogOutIcon />
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {navItems.map((item) => {
          const active =
            item.id === "actions" ? actionsActive : view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-btn${active ? " active" : ""}`}
              onClick={() => setView(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <main className="app-content">
        {view === "dashboard" ? (
          <DashboardView user={user} onNavigate={setView} />
        ) : null}
        {view === "ai" ? <AiView /> : null}
        {view === "notifications" ? <NotificationsView /> : null}
        {view === "actions" ? (
          <ActionsView user={user} onNavigate={setView} />
        ) : null}
        {view === "create-task" ? (
          <CreateTaskView user={user} onDone={() => setView("actions")} />
        ) : null}
        {view === "create-note" ? (
          <CreateNoteView onDone={() => setView("actions")} />
        ) : null}
        {view === "search" ? (
          <SearchView onDone={() => setView("actions")} />
        ) : null}
      </main>
    </div>
  );
}
