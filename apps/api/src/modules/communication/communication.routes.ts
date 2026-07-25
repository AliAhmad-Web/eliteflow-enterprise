import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT } from "@enterprise/shared";

import {
  authenticate,
  authorizeAnyPermission,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { communicationController } from "./communication.controller.js";
import { communicationHubController } from "./hub.controller.js";
import {
  addConversationMembersSchema,
  announcementIdParamsSchema,
  commentIdParamsSchema,
  communicationAiRequestSchema,
  communicationSearchQuerySchema,
  conversationIdParamsSchema,
  conversationMemberParamsSchema,
  createAnnouncementSchema,
  createCommentSchema,
  createConversationSchema,
  createDiscussionReplySchema,
  createDiscussionThreadSchema,
  createMeetingRecordingSchema,
  createMeetingRoomSchema,
  createMeetingScreenShareSchema,
  createMessageSchema,
  forwardMessageSchema,
  listActivitiesQuerySchema,
  listAnnouncementsQuerySchema,
  listCommentsQuerySchema,
  listConversationsQuerySchema,
  listDiscussionThreadsQuerySchema,
  listMeetingsQuerySchema,
  listMessagesQuerySchema,
  markMessagesReadSchema,
  meetingIdParamsSchema,
  meetingParticipantParamsSchema,
  messageIdParamsSchema,
  reactToMessageSchema,
  threadIdParamsSchema,
  typingSchema,
  updateAnnouncementSchema,
  updateCommentSchema,
  updateConversationMemberSchema,
  updateConversationSchema,
  updateDiscussionThreadSchema,
  updateMeetingParticipantSchema,
  updateMeetingRoomSchema,
  updateMessageSchema,
} from "./communication.validation.js";

const communicationRouter = Router();
communicationRouter.use(authenticate);

const readLimit = rateLimit({
  name: "communication.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "communication.write",
  max: 120,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

const presenceLimit = rateLimit({
  name: "communication.presence",
  max: 600,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

// ---- Conversations ---------------------------------------------------------

communicationRouter.get(
  "/conversations",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listConversationsQuerySchema, "query"),
  asyncHandler((req, res) => communicationController.listConversations(req, res)),
);

communicationRouter.post(
  "/conversations",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(createConversationSchema),
  asyncHandler((req, res) => communicationController.createConversation(req, res)),
);

communicationRouter.get(
  "/conversations/:id",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(conversationIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.getConversation(req, res)),
);

communicationRouter.patch(
  "/conversations/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(updateConversationSchema),
  asyncHandler((req, res) => communicationController.updateConversation(req, res)),
);

communicationRouter.delete(
  "/conversations/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.deleteConversation(req, res)),
);

communicationRouter.post(
  "/conversations/:id/members",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(addConversationMembersSchema),
  asyncHandler((req, res) => communicationController.addMembers(req, res)),
);

communicationRouter.patch(
  "/conversations/:id/members/:userId",
  authorizeAnyPermission(
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.COMMUNICATION_WRITE,
    PERMISSIONS.COMMUNICATION_MANAGE,
  ),
  writeLimit,
  validate(conversationMemberParamsSchema, "params"),
  validate(updateConversationMemberSchema),
  asyncHandler((req, res) =>
    communicationController.updateMemberRole(req, res),
  ),
);

communicationRouter.delete(
  "/conversations/:id/members/:userId",
  authorizeAnyPermission(
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.COMMUNICATION_WRITE,
    PERMISSIONS.COMMUNICATION_MANAGE,
  ),
  writeLimit,
  validate(conversationMemberParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.removeMember(req, res)),
);

communicationRouter.post(
  "/conversations/:id/archive",
  authorizeAnyPermission(
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.COMMUNICATION_WRITE,
    PERMISSIONS.COMMUNICATION_MANAGE,
  ),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  asyncHandler((req, res) =>
    communicationController.archiveConversation(req, res),
  ),
);

communicationRouter.post(
  "/conversations/:id/unarchive",
  authorizeAnyPermission(
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.COMMUNICATION_WRITE,
    PERMISSIONS.COMMUNICATION_MANAGE,
  ),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  asyncHandler((req, res) =>
    communicationController.unarchiveConversation(req, res),
  ),
);

// ---- Messages --------------------------------------------------------------

communicationRouter.get(
  "/conversations/:id/messages",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(listMessagesQuerySchema, "query"),
  asyncHandler((req, res) => communicationController.listMessages(req, res)),
);

communicationRouter.post(
  "/conversations/:id/messages",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(createMessageSchema),
  asyncHandler((req, res) => communicationController.sendMessage(req, res)),
);

communicationRouter.get(
  "/conversations/:id/pinned",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(conversationIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.getPinnedMessages(req, res)),
);

communicationRouter.post(
  "/conversations/:id/read",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(markMessagesReadSchema),
  asyncHandler((req, res) => communicationController.markRead(req, res)),
);

communicationRouter.post(
  "/conversations/:id/typing",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  presenceLimit,
  validate(conversationIdParamsSchema, "params"),
  validate(typingSchema),
  asyncHandler((req, res) => communicationController.setTyping(req, res)),
);

// ---- Individual messages ---------------------------------------------------

communicationRouter.get(
  "/messages/:id",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(messageIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.getMessage(req, res)),
);

communicationRouter.patch(
  "/messages/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  validate(updateMessageSchema),
  asyncHandler((req, res) => communicationController.updateMessage(req, res)),
);

communicationRouter.delete(
  "/messages/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.deleteMessage(req, res)),
);

communicationRouter.post(
  "/messages/:id/forward",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  validate(forwardMessageSchema),
  asyncHandler((req, res) => communicationController.forwardMessage(req, res)),
);

communicationRouter.post(
  "/messages/:id/pin",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.pinMessage(req, res)),
);

communicationRouter.post(
  "/messages/:id/unpin",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.unpinMessage(req, res)),
);

communicationRouter.post(
  "/messages/:id/react",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  validate(reactToMessageSchema),
  asyncHandler((req, res) => communicationController.reactToMessage(req, res)),
);

communicationRouter.post(
  "/messages/:id/unreact",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(messageIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.unreactToMessage(req, res)),
);

// ---- Presence --------------------------------------------------------------

communicationRouter.post(
  "/presence/heartbeat",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  presenceLimit,
  asyncHandler((req, res) => communicationController.heartbeat(req, res)),
);

communicationRouter.post(
  "/presence/offline",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  presenceLimit,
  asyncHandler((req, res) => communicationController.setOffline(req, res)),
);

communicationRouter.get(
  "/presence",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  asyncHandler((req, res) => communicationController.getPresence(req, res)),
);

// ---- Comments --------------------------------------------------------------

communicationRouter.get(
  "/comments",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listCommentsQuerySchema, "query"),
  asyncHandler((req, res) => communicationController.listComments(req, res)),
);

communicationRouter.post(
  "/comments",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(createCommentSchema),
  asyncHandler((req, res) => communicationController.createComment(req, res)),
);

communicationRouter.patch(
  "/comments/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(commentIdParamsSchema, "params"),
  validate(updateCommentSchema),
  asyncHandler((req, res) => communicationController.updateComment(req, res)),
);

communicationRouter.delete(
  "/comments/:id",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(commentIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationController.deleteComment(req, res)),
);

// ---- Activities ------------------------------------------------------------

communicationRouter.get(
  "/activities",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listActivitiesQuerySchema, "query"),
  asyncHandler((req, res) => communicationController.listActivities(req, res)),
);

communicationRouter.post(
  "/activities/sync",
  authorizePermissions(PERMISSIONS.CHAT_WRITE),
  writeLimit,
  asyncHandler((req, res) => communicationController.syncActivities(req, res)),
);

// ---- Search ----------------------------------------------------------------

communicationRouter.get(
  "/search",
  authorizePermissions(PERMISSIONS.CHAT_READ),
  readLimit,
  validate(communicationSearchQuerySchema, "query"),
  asyncHandler((req, res) => communicationController.search(req, res)),
);

// ---- Phase 20 — Announcements ----------------------------------------------

communicationRouter.get(
  "/announcements",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listAnnouncementsQuerySchema, "query"),
  asyncHandler((req, res) =>
    communicationHubController.listAnnouncements(req, res),
  ),
);

communicationRouter.post(
  "/announcements",
  authorizeAnyPermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  writeLimit,
  validate(createAnnouncementSchema),
  asyncHandler((req, res) =>
    communicationHubController.createAnnouncement(req, res),
  ),
);

communicationRouter.get(
  "/announcements/:id",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(announcementIdParamsSchema, "params"),
  asyncHandler((req, res) =>
    communicationHubController.getAnnouncement(req, res),
  ),
);

communicationRouter.patch(
  "/announcements/:id",
  authorizeAnyPermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  writeLimit,
  validate(announcementIdParamsSchema, "params"),
  validate(updateAnnouncementSchema),
  asyncHandler((req, res) =>
    communicationHubController.updateAnnouncement(req, res),
  ),
);

communicationRouter.delete(
  "/announcements/:id",
  authorizeAnyPermission(PERMISSIONS.ANNOUNCEMENT_MANAGE),
  writeLimit,
  validate(announcementIdParamsSchema, "params"),
  asyncHandler((req, res) =>
    communicationHubController.deleteAnnouncement(req, res),
  ),
);

communicationRouter.post(
  "/announcements/:id/read",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(announcementIdParamsSchema, "params"),
  asyncHandler((req, res) =>
    communicationHubController.markAnnouncementRead(req, res),
  ),
);

// ---- Phase 20 — Discussion threads -----------------------------------------

communicationRouter.get(
  "/threads",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listDiscussionThreadsQuerySchema, "query"),
  asyncHandler((req, res) => communicationHubController.listThreads(req, res)),
);

communicationRouter.post(
  "/threads",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(createDiscussionThreadSchema),
  asyncHandler((req, res) => communicationHubController.createThread(req, res)),
);

communicationRouter.get(
  "/threads/:id",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(threadIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationHubController.getThread(req, res)),
);

communicationRouter.patch(
  "/threads/:id",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(threadIdParamsSchema, "params"),
  validate(updateDiscussionThreadSchema),
  asyncHandler((req, res) => communicationHubController.updateThread(req, res)),
);

communicationRouter.delete(
  "/threads/:id",
  authorizeAnyPermission(PERMISSIONS.THREAD_MANAGE),
  writeLimit,
  validate(threadIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationHubController.deleteThread(req, res)),
);

communicationRouter.post(
  "/threads/:id/resolve",
  authorizeAnyPermission(PERMISSIONS.THREAD_MANAGE),
  writeLimit,
  validate(threadIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationHubController.resolveThread(req, res)),
);

communicationRouter.post(
  "/threads/:id/replies",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(threadIdParamsSchema, "params"),
  validate(createDiscussionReplySchema),
  asyncHandler((req, res) => communicationHubController.createReply(req, res)),
);

// ---- Phase 20 — Meetings ---------------------------------------------------

communicationRouter.get(
  "/meetings",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listMeetingsQuerySchema, "query"),
  asyncHandler((req, res) => communicationHubController.listMeetings(req, res)),
);

communicationRouter.post(
  "/meetings",
  authorizeAnyPermission(PERMISSIONS.MEETING_MANAGE),
  writeLimit,
  validate(createMeetingRoomSchema),
  asyncHandler((req, res) => communicationHubController.createMeeting(req, res)),
);

communicationRouter.get(
  "/meetings/:id",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(meetingIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationHubController.getMeeting(req, res)),
);

communicationRouter.patch(
  "/meetings/:id",
  authorizeAnyPermission(PERMISSIONS.MEETING_MANAGE),
  writeLimit,
  validate(meetingIdParamsSchema, "params"),
  validate(updateMeetingRoomSchema),
  asyncHandler((req, res) => communicationHubController.updateMeeting(req, res)),
);

communicationRouter.delete(
  "/meetings/:id",
  authorizeAnyPermission(PERMISSIONS.MEETING_MANAGE),
  writeLimit,
  validate(meetingIdParamsSchema, "params"),
  asyncHandler((req, res) => communicationHubController.deleteMeeting(req, res)),
);

communicationRouter.patch(
  "/meetings/:id/participants/:userId",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(meetingParticipantParamsSchema, "params"),
  validate(updateMeetingParticipantSchema),
  asyncHandler((req, res) =>
    communicationHubController.updateParticipant(req, res),
  ),
);

communicationRouter.post(
  "/meetings/:id/recordings",
  authorizeAnyPermission(PERMISSIONS.MEETING_MANAGE),
  writeLimit,
  validate(meetingIdParamsSchema, "params"),
  validate(createMeetingRecordingSchema),
  asyncHandler((req, res) => communicationHubController.addRecording(req, res)),
);

communicationRouter.post(
  "/meetings/:id/screen-shares",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_WRITE, PERMISSIONS.CHAT_WRITE),
  writeLimit,
  validate(meetingIdParamsSchema, "params"),
  validate(createMeetingScreenShareSchema),
  asyncHandler((req, res) =>
    communicationHubController.addScreenShare(req, res),
  ),
);

// ---- Phase 20 — AI + Channels ----------------------------------------------

communicationRouter.post(
  "/ai",
  authorizeAnyPermission(PERMISSIONS.AI_USE),
  writeLimit,
  validate(communicationAiRequestSchema),
  asyncHandler((req, res) => communicationHubController.runAi(req, res)),
);

communicationRouter.get(
  "/channels",
  authorizeAnyPermission(PERMISSIONS.COMMUNICATION_READ, PERMISSIONS.CHAT_READ),
  readLimit,
  validate(listConversationsQuerySchema, "query"),
  asyncHandler((req, res) => communicationHubController.listChannels(req, res)),
);

export { communicationRouter };
