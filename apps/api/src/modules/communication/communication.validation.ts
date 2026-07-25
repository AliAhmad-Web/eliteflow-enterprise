import { z } from "zod";
import { uuidSchema } from "@enterprise/shared";

export {
  addConversationMembersSchema,
  commentIdParamsSchema,
  communicationSearchQuerySchema,
  conversationIdParamsSchema,
  conversationMemberParamsSchema,
  createCommentSchema,
  createConversationSchema,
  createMessageSchema,
  forwardMessageSchema,
  listActivitiesQuerySchema,
  listCommentsQuerySchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  markMessagesReadSchema,
  messageIdParamsSchema,
  reactToMessageSchema,
  typingSchema,
  updateCommentSchema,
  updateConversationMemberSchema,
  updateConversationSchema,
  updateMessageSchema,
  // Phase 20 — Communication Hub
  announcementIdParamsSchema,
  communicationAiRequestSchema,
  createAnnouncementSchema,
  createDiscussionReplySchema,
  createDiscussionThreadSchema,
  createMeetingRecordingSchema,
  createMeetingRoomSchema,
  createMeetingScreenShareSchema,
  listAnnouncementsQuerySchema,
  listDiscussionThreadsQuerySchema,
  listMeetingsQuerySchema,
  meetingIdParamsSchema,
  threadIdParamsSchema,
  updateAnnouncementSchema,
  updateDiscussionThreadSchema,
  updateMeetingParticipantSchema,
  updateMeetingRoomSchema,
} from "@enterprise/shared";

/** Meeting participant route params (`/meetings/:id/participants/:userId`). */
export const meetingParticipantParamsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});
