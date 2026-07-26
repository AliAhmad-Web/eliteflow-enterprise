import type {
  NotificationDto,
  Project,
  SafeUser,
  Task,
} from "@enterprise/shared";
import { useEffect, useState } from "react";

import { dashboardService } from "@/shared/api/services";
import { webUrl, WEB_ROUTES } from "@/shared/config";
import type { PopupView } from "@/shared/messaging";

import { SparklesIcon } from "../components/icons";

type Props = {
  user: SafeUser;
  onNavigate: (view: PopupView) => void;
};

type LeaveItem = {
  id: string;
  status: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
};

export function DashboardView({ user, onNavigate }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvals, setApprovals] = useState<LeaveItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [todaysTasks, recentProjects, pending, unreadCount] =
          await Promise.all([
            dashboardService.getTodaysTasks(user.id),
            dashboardService.getRecentProjects(),
            dashboardService.getPendingApprovals(),
            dashboardService.getUnreadCount(),
          ]);
        if (cancelled) return;
        setTasks(todaysTasks);
        setProjects(recentProjects);
        setApprovals(pending);
        setUnread(unreadCount);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Today&apos;s tasks</div>
        </div>
        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigate("notifications")}
          style={{ cursor: "pointer", textAlign: "left" }}
        >
          <div className="stat-value">{unread}</div>
          <div className="stat-label">Unread notifications</div>
        </button>
      </div>

      <section className="section">
        <div className="section-title">
          <span>Today&apos;s Tasks</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => chrome.tabs.create({ url: webUrl(WEB_ROUTES.tasks) })}
          >
            Open
          </button>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-state">No tasks due today.</div>
        ) : (
          <div className="card-list">
            {tasks.slice(0, 5).map((task) => (
              <button
                key={task.id}
                type="button"
                className="list-item"
                onClick={() =>
                  chrome.tabs.create({ url: webUrl(`${WEB_ROUTES.tasks}`) })
                }
              >
                <div className="list-item-body">
                  <div className="list-item-title">{task.title}</div>
                  <div className="list-item-meta">
                    {task.priority} · {task.status.replaceAll("_", " ")}
                  </div>
                </div>
                <span className="badge">{task.priority}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title">
          <span>Recent Projects</span>
          <button
            type="button"
            className="link-btn"
            onClick={() =>
              chrome.tabs.create({ url: webUrl(WEB_ROUTES.projects) })
            }
          >
            Open
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state">No recent projects.</div>
        ) : (
          <div className="card-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="list-item"
                onClick={() =>
                  chrome.tabs.create({ url: webUrl(WEB_ROUTES.projects) })
                }
              >
                <div className="list-item-body">
                  <div className="list-item-title">{project.name}</div>
                  <div className="list-item-meta">
                    {project.status?.replaceAll("_", " ") ?? "Project"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title">
          <span>Pending Approvals</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => chrome.tabs.create({ url: webUrl(WEB_ROUTES.team) })}
          >
            Open
          </button>
        </div>
        {approvals.length === 0 ? (
          <div className="empty-state">No pending leave approvals.</div>
        ) : (
          <div className="card-list">
            {approvals.slice(0, 5).map((item) => {
              const name = item.user
                ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() ||
                  item.user.email
                : "Team member";
              return (
                <div key={item.id} className="list-item">
                  <div className="list-item-body">
                    <div className="list-item-title">{name}</div>
                    <div className="list-item-meta">
                      {item.leaveType ?? "Leave"} · {item.startDate ?? "—"}
                    </div>
                  </div>
                  <span className="badge warning">PENDING</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title">
          <span>AI Quick Access</span>
        </div>
        <button
          type="button"
          className="list-item"
          onClick={() => onNavigate("ai")}
        >
          <div className="action-icon">
            <SparklesIcon />
          </div>
          <div className="list-item-body">
            <div className="list-item-title">Ask EliteFlow AI</div>
            <div className="list-item-meta">
              Same AI assistant as Web & Mobile
            </div>
          </div>
        </button>
      </section>
    </div>
  );
}

export function NotificationsView() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await dashboardService.getUnreadNotifications(20);
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load notifications.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Loading notifications…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <span>Unread Notifications</span>
        <button
          type="button"
          className="link-btn"
          onClick={() =>
            chrome.tabs.create({ url: webUrl(WEB_ROUTES.notifications) })
          }
        >
          Open all
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {items.length === 0 ? (
        <div className="empty-state">You&apos;re all caught up.</div>
      ) : (
        <div className="card-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="list-item"
              onClick={() => {
                const target = item.linkUrl
                  ? item.linkUrl.startsWith("http")
                    ? item.linkUrl
                    : webUrl(item.linkUrl)
                  : webUrl(`${WEB_ROUTES.notifications}/${item.id}`);
                void chrome.tabs.create({ url: target });
              }}
            >
              <div className="list-item-body">
                <div className="list-item-title">{item.title}</div>
                <div className="list-item-meta">{item.body}</div>
              </div>
              <span className="badge">{item.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
