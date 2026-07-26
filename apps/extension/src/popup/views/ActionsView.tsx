import type { Client, Project, SafeUser } from "@enterprise/shared";
import { useEffect, useState, type FormEvent } from "react";

import { ApiClientError } from "@/shared/api/api-error";
import {
  aiService,
  clientsService,
  projectsService,
  tasksService,
} from "@/shared/api/services";
import { tokenStorage } from "@/shared/auth/storage";
import { webUrl, WEB_ROUTES } from "@/shared/config";
import type { PopupView } from "@/shared/messaging";

import {
  CheckIcon,
  ExternalIcon,
  NoteIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from "../components/icons";

type Props = {
  user: SafeUser;
  onNavigate: (view: PopupView) => void;
};

export function ActionsView({ onNavigate }: Props) {
  return (
    <div>
      <div className="section-title">
        <span>Quick Actions</span>
      </div>
      <div className="action-grid">
        <button
          type="button"
          className="action-tile"
          onClick={() => onNavigate("create-task")}
        >
          <div className="action-icon">
            <PlusIcon />
          </div>
          <strong>Create Task</strong>
          <span>Add a task via the API</span>
        </button>
        <button
          type="button"
          className="action-tile"
          onClick={() => onNavigate("create-note")}
        >
          <div className="action-icon">
            <NoteIcon />
          </div>
          <strong>Create Note</strong>
          <span>Save an AI document note</span>
        </button>
        <button
          type="button"
          className="action-tile"
          onClick={() => onNavigate("search")}
        >
          <div className="action-icon">
            <SearchIcon />
          </div>
          <strong>Search</strong>
          <span>Find clients & projects</span>
        </button>
        <button
          type="button"
          className="action-tile"
          onClick={() =>
            chrome.tabs.create({ url: webUrl(WEB_ROUTES.dashboard) })
          }
        >
          <div className="action-icon">
            <ExternalIcon />
          </div>
          <strong>Open Dashboard</strong>
          <span>Launch EliteFlow Web</span>
        </button>
        <button
          type="button"
          className="action-tile"
          onClick={() => onNavigate("ai")}
        >
          <div className="action-icon">
            <SparklesIcon />
          </div>
          <strong>AI Assistant</strong>
          <span>Popup AI chat</span>
        </button>
        <button
          type="button"
          className="action-tile"
          onClick={() => chrome.tabs.create({ url: webUrl(WEB_ROUTES.tasks) })}
        >
          <div className="action-icon">
            <CheckIcon />
          </div>
          <strong>Open Tasks</strong>
          <span>Full task board</span>
        </button>
      </div>
    </div>
  );
}

export function CreateTaskView({
  user,
  onDone,
}: {
  user: SafeUser;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    "MEDIUM",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await tasksService.create({
        title: title.trim(),
        description: description.trim(),
        projectId: "",
        assignedToId: user.id,
        status: "TODO",
        priority,
        labels: [],
        startDate: "",
        dueDate: "",
        progress: 0,
        estimatedHours: "",
        attachments: [],
      });
      setSuccess("Task created successfully.");
      setTitle("");
      setDescription("");
      setTimeout(onDone, 800);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to create task. You may need tasks:write permission.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="section-title">
        <span>Create Task</span>
        <button type="button" className="link-btn" onClick={onDone}>
          Back
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="field">
          <label htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="task-priority">Priority</label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as typeof priority)
            }
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create task"}
        </button>
      </form>
    </div>
  );
}

export function CreateNoteView({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const pending = await tokenStorage.consumePendingSavePage();
      if (pending) {
        setTitle(pending.title || "Saved page");
        setContent(`Source URL: ${pending.url}\nTitle: ${pending.title}`);
      }
    })();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await aiService.createDocument({
        title: title.trim() || "Note",
        type: "MEETING_NOTES",
        prompt: content.trim() || title.trim(),
        content: content.trim(),
        generate: false,
      });
      setSuccess("Note saved to EliteFlow AI documents.");
      setTimeout(onDone, 800);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to create note.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="section-title">
        <span>Create Note</span>
        <button type="button" className="link-btn" onClick={onDone}>
          Back
        </button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="note-title">Title</label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="field">
          <label htmlFor="note-content">Content</label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save note"}
        </button>
      </form>
    </div>
  );
}

export function SearchView({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const [clientResult, projectResult] = await Promise.all([
        clientsService.search(q),
        projectsService.search(q),
      ]);
      setClients(clientResult.items);
      setProjects(projectResult.items);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Search failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="section-title">
        <span>Search Client / Project</span>
        <button type="button" className="link-btn" onClick={onDone}>
          Back
        </button>
      </div>
      <form onSubmit={handleSearch}>
        <div className="field">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? <div className="error-banner">{error}</div> : null}

      {searched && !loading ? (
        <>
          <section className="section" style={{ marginTop: 14 }}>
            <div className="section-title">
              <span>Clients</span>
            </div>
            {clients.length === 0 ? (
              <div className="empty-state">No clients found.</div>
            ) : (
              <div className="card-list">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="list-item"
                    onClick={() =>
                      chrome.tabs.create({ url: webUrl(WEB_ROUTES.clients) })
                    }
                  >
                    <div className="list-item-body">
                    <div className="list-item-title">
                      {client.companyName}
                    </div>
                    <div className="list-item-meta">
                      {client.contactName} · {client.email}
                    </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-title">
              <span>Projects</span>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state">No projects found.</div>
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
                        {project.status?.replaceAll("_", " ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
