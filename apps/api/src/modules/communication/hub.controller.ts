import type { Request, Response } from "express";

import type {
  CommunicationAiRequestInput,
  CreateAnnouncementInput,
  CreateDiscussionReplyInput,
  CreateDiscussionThreadInput,
  CreateMeetingRecordingInput,
  CreateMeetingRoomInput,
  CreateMeetingScreenShareInput,
  ListAnnouncementsQueryInput,
  ListConversationsQueryInput,
  ListDiscussionThreadsQueryInput,
  ListMeetingsQueryInput,
  UpdateAnnouncementInput,
  UpdateDiscussionThreadInput,
  UpdateMeetingParticipantInput,
  UpdateMeetingRoomInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import {
  COMMUNICATION_ERROR_CODES,
  CommunicationError,
} from "./communication.errors.js";
import type { CommunicationActor } from "./communication.types.js";
import { communicationHubService } from "./hub.service.js";

function getActor(req: Request): CommunicationActor {
  if (!req.auth) {
    throw new CommunicationError(
      "Authentication required",
      401,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    companyId: (req.auth as unknown as { companyId?: string | null }).companyId,
  };
}

export class CommunicationHubController {
  // ---- Announcements --------------------------------------------------------

  async listAnnouncements(req: Request, res: Response) {
    const result = await communicationHubService.listAnnouncements(
      req.query as unknown as ListAnnouncementsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Announcements retrieved"));
  }

  async createAnnouncement(req: Request, res: Response) {
    const result = await communicationHubService.createAnnouncement(
      req.body as CreateAnnouncementInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Announcement created"));
  }

  async getAnnouncement(req: Request, res: Response) {
    const result = await communicationHubService.getAnnouncement(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Announcement retrieved"));
  }

  async updateAnnouncement(req: Request, res: Response) {
    const result = await communicationHubService.updateAnnouncement(
      req.params.id as string,
      req.body as UpdateAnnouncementInput,
      getActor(req),
    );
    res.json(successResponse(result, "Announcement updated"));
  }

  async deleteAnnouncement(req: Request, res: Response) {
    await communicationHubService.deleteAnnouncement(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(null, "Announcement deleted"));
  }

  async markAnnouncementRead(req: Request, res: Response) {
    const result = await communicationHubService.markAnnouncementRead(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Announcement marked read"));
  }

  // ---- Threads --------------------------------------------------------------

  async listThreads(req: Request, res: Response) {
    const result = await communicationHubService.listThreads(
      req.query as unknown as ListDiscussionThreadsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Threads retrieved"));
  }

  async createThread(req: Request, res: Response) {
    const result = await communicationHubService.createThread(
      req.body as CreateDiscussionThreadInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Thread created"));
  }

  async getThread(req: Request, res: Response) {
    const result = await communicationHubService.getThread(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Thread retrieved"));
  }

  async updateThread(req: Request, res: Response) {
    const result = await communicationHubService.updateThread(
      req.params.id as string,
      req.body as UpdateDiscussionThreadInput,
      getActor(req),
    );
    res.json(successResponse(result, "Thread updated"));
  }

  async deleteThread(req: Request, res: Response) {
    await communicationHubService.deleteThread(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(null, "Thread deleted"));
  }

  async resolveThread(req: Request, res: Response) {
    const result = await communicationHubService.resolveThread(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Thread resolved"));
  }

  async createReply(req: Request, res: Response) {
    const result = await communicationHubService.createReply(
      req.params.id as string,
      req.body as CreateDiscussionReplyInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Reply created"));
  }

  // ---- Meetings -------------------------------------------------------------

  async listMeetings(req: Request, res: Response) {
    const result = await communicationHubService.listMeetings(
      req.query as unknown as ListMeetingsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Meetings retrieved"));
  }

  async createMeeting(req: Request, res: Response) {
    const result = await communicationHubService.createMeeting(
      req.body as CreateMeetingRoomInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Meeting created"));
  }

  async getMeeting(req: Request, res: Response) {
    const result = await communicationHubService.getMeeting(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Meeting retrieved"));
  }

  async updateMeeting(req: Request, res: Response) {
    const result = await communicationHubService.updateMeeting(
      req.params.id as string,
      req.body as UpdateMeetingRoomInput,
      getActor(req),
    );
    res.json(successResponse(result, "Meeting updated"));
  }

  async deleteMeeting(req: Request, res: Response) {
    await communicationHubService.deleteMeeting(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(null, "Meeting deleted"));
  }

  async updateParticipant(req: Request, res: Response) {
    const result = await communicationHubService.updateParticipantStatus(
      req.params.id as string,
      req.params.userId as string,
      req.body as UpdateMeetingParticipantInput,
      getActor(req),
    );
    res.json(successResponse(result, "Participant updated"));
  }

  async addRecording(req: Request, res: Response) {
    const result = await communicationHubService.addRecording(
      req.params.id as string,
      req.body as CreateMeetingRecordingInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Recording added"));
  }

  async addScreenShare(req: Request, res: Response) {
    const result = await communicationHubService.addScreenShare(
      req.params.id as string,
      req.body as CreateMeetingScreenShareInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Screen share started"));
  }

  // ---- AI / Channels --------------------------------------------------------

  async runAi(req: Request, res: Response) {
    const result = await communicationHubService.runAi(
      req.body as CommunicationAiRequestInput,
      getActor(req),
    );
    res.json(successResponse(result, "AI response generated"));
  }

  async listChannels(req: Request, res: Response) {
    const result = await communicationHubService.listChannels(
      req.query as unknown as ListConversationsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Channels retrieved"));
  }
}

export const communicationHubController = new CommunicationHubController();
