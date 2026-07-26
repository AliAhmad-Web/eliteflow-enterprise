import {
  ALARM_NAMES,
  CONTEXT_MENU_IDS,
  webUrl,
  WEB_ROUTES,
} from "../shared/config";
import {
  hydrateSessionFromStorage,
  refreshAccessToken,
} from "../shared/api/api-client";
import { aiService, notificationsService } from "../shared/api/services";
import { tokenStorage } from "../shared/auth/storage";
import { MESSAGE_TYPES, type ExtensionMessage } from "../shared/messaging";

const NOTIFICATION_POLL_MINUTES = 5;

async function updateBadge(): Promise<void> {
  try {
    const session = await hydrateSessionFromStorage();
    if (!session.accessToken && !(await tokenStorage.getRefreshToken())) {
      await chrome.action.setBadgeText({ text: "" });
      return;
    }

    if (!session.accessToken) {
      await refreshAccessToken();
    }

    const count = await notificationsService.unreadCount();
    const previous = await tokenStorage.getLastUnreadCount();
    await tokenStorage.setLastUnreadCount(count);

    if (count > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: "#6d28d9" });
      await chrome.action.setBadgeText({
        text: count > 99 ? "99+" : String(count),
      });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }

    if (count > previous) {
      const latest = await notificationsService.listUnread(1);
      const item = latest.items[0];
      if (item) {
        chrome.notifications.create(`eliteflow-${item.id}`, {
          type: "basic",
          iconUrl: "icons/icon-128.png",
          title: item.title,
          message: item.body,
          priority: 1,
        });
      }
    }
  } catch {
    // Silent — badge updates are best-effort.
  }
}

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SEND_TO_AI,
      title: "Send to EliteFlow AI",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SAVE_TO_PROJECT,
      title: "Save to EliteFlow Project",
      contexts: ["page", "link"],
    });
  });
}

async function handleSendToAi(selectionText: string): Promise<void> {
  const text = selectionText.trim();
  if (!text) return;

  await tokenStorage.setPendingAiPrompt(text);

  try {
    await hydrateSessionFromStorage();
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "EliteFlow",
        message: "Sign in to send text to EliteFlow AI.",
      });
      return;
    }

    const result = await aiService.chat({
      message: text,
      mode: "ASK",
    });

    const reply =
      result.assistantMessage?.content?.slice(0, 240) ??
      "AI response ready — open the extension popup.";

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "EliteFlow AI",
      message: reply,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach EliteFlow AI.";
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "EliteFlow AI",
      message,
    });
  }
}

async function handleSaveToProject(
  pageUrl: string,
  pageTitle: string,
): Promise<void> {
  await tokenStorage.setPendingSavePage({ url: pageUrl, title: pageTitle });

  try {
    await hydrateSessionFromStorage();
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "EliteFlow",
        message: "Sign in to save pages to EliteFlow.",
      });
      return;
    }

    await aiService.createDocument({
      title: pageTitle || "Saved page",
      type: "MEETING_NOTES",
      prompt: `Save and summarize this web page for an EliteFlow project.\n\nTitle: ${pageTitle}\nURL: ${pageUrl}`,
      content: `Source URL: ${pageUrl}\nTitle: ${pageTitle}`,
      generate: true,
    });

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "EliteFlow",
      message: "Page saved to EliteFlow AI documents.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save page.";
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "EliteFlow",
      message,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
  chrome.alarms.create(ALARM_NAMES.NOTIFICATION_POLL, {
    periodInMinutes: NOTIFICATION_POLL_MINUTES,
  });
  void updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
  void updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAMES.NOTIFICATION_POLL) {
    void updateBadge();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_IDS.SEND_TO_AI) {
    void handleSendToAi(info.selectionText ?? "");
    return;
  }

  if (info.menuItemId === CONTEXT_MENU_IDS.SAVE_TO_PROJECT) {
    const url = info.linkUrl || info.pageUrl || tab?.url || "";
    const title = tab?.title || url;
    void handleSaveToProject(url, title);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  const id = notificationId.replace(/^eliteflow-/, "");
  const target = id
    ? webUrl(`${WEB_ROUTES.notifications}/${id}`)
    : webUrl(WEB_ROUTES.notifications);
  void chrome.tabs.create({ url: target });
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    const handle = async () => {
      switch (message.type) {
        case MESSAGE_TYPES.PING:
          return { ok: true, version: "1.0.0" };
        case MESSAGE_TYPES.REFRESH_BADGE:
          await updateBadge();
          return { ok: true };
        case MESSAGE_TYPES.SESSION_CHANGED:
          await updateBadge();
          return { ok: true };
        case MESSAGE_TYPES.GET_SESSION: {
          const session = await hydrateSessionFromStorage();
          return {
            authenticated: Boolean(
              session.user &&
                (session.accessToken ||
                  (await tokenStorage.getRefreshToken())),
            ),
            user: session.user,
          };
        }
        case MESSAGE_TYPES.OPEN_POPUP_VIEW:
          return { ok: true, view: message.view };
        default: {
          const _exhaustive: never = message;
          return _exhaustive;
        }
      }
    };

    void handle().then(sendResponse);
    return true;
  },
);

registerContextMenus();
void updateBadge();
