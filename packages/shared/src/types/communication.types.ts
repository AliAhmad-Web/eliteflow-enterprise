import type {
  ActivityDto,
  CommentDto,
  ConversationDto,
  MessageDto,
  UserPresenceDto,
} from "../schemas/communication.schema.js";
import type {
  AnnouncementDto,
  CommunicationAiResponseDto,
  DiscussionReplyDto,
  DiscussionThreadDto,
  MeetingRoomDto,
} from "../schemas/communication-hub.schema.js";

export type Conversation = ConversationDto;
export type Message = MessageDto;
export type Comment = CommentDto;
export type Activity = ActivityDto;
export type UserPresence = UserPresenceDto;
export type Announcement = AnnouncementDto;
export type DiscussionThread = DiscussionThreadDto;
export type DiscussionReply = DiscussionReplyDto;
export type MeetingRoom = MeetingRoomDto;
export type CommunicationAiResponse = CommunicationAiResponseDto;

/** Communication list pagination (pageSize aligns with notifications module). */
export type CommunicationPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ConversationListResponse = {
  items: Conversation[];
  pagination: CommunicationPagination;
};

export type MessageListResponse = {
  items: Message[];
  pagination: CommunicationPagination;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type CommentListResponse = {
  items: Comment[];
  pagination: CommunicationPagination;
};

export type ActivityListResponse = {
  items: Activity[];
  pagination: CommunicationPagination;
};

export type AnnouncementListResponse = {
  items: Announcement[];
  pagination: CommunicationPagination;
};

export type DiscussionThreadListResponse = {
  items: DiscussionThread[];
  pagination: CommunicationPagination;
};

export type MeetingRoomListResponse = {
  items: MeetingRoom[];
  pagination: CommunicationPagination;
};

export type CommunicationSearchResponse = {
  conversations: Conversation[];
  messages: Message[];
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    messageId: string;
    conversationId: string;
  }>;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  clients: Array<{
    id: string;
    companyName: string;
    status: string;
  }>;
};
