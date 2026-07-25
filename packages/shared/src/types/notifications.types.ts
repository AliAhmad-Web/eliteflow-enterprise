import type {
  NotificationAuditDto,
  NotificationDto,
  NotificationPreferenceDto,
  NotificationQueueDto,
  NotificationReplyDto,
  NotificationTemplateDto,
  UnreadCountDto,
} from "../schemas/notifications.schema.js";

export type Notification = NotificationDto;
export type NotificationPreference = NotificationPreferenceDto;
export type NotificationTemplate = NotificationTemplateDto;
export type NotificationQueueItem = NotificationQueueDto;
export type NotificationAudit = NotificationAuditDto;
export type UnreadCount = UnreadCountDto;
export type NotificationReply = NotificationReplyDto;

export type NotificationListResponse = {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
};

export type NotificationPreferenceListResponse = {
  items: NotificationPreference[];
};

export type NotificationTemplateListResponse = {
  items: NotificationTemplate[];
};

export type NotificationQueueListResponse = {
  items: NotificationQueueItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type NotificationHistoryResponse = {
  items: NotificationAudit[];
  total: number;
  page: number;
  pageSize: number;
};
