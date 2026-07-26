/**
 * Collaboration architecture (Phase 5) — prepared for realtime multi-user editing.
 *
 * Runtime realtime is not enabled yet. These contracts define the future
 * Socket/WebRTC channel payload shapes so clients and API can evolve together.
 */

export interface WhiteboardPresenceUser {
  userId: string;
  displayName: string;
  color: string;
  lastSeenAt: string;
}

export interface WhiteboardLiveCursor {
  userId: string;
  x: number;
  y: number;
  updatedAt: string;
}

export type WhiteboardCollabEvent =
  | { type: "presence.join"; user: WhiteboardPresenceUser }
  | { type: "presence.leave"; userId: string }
  | { type: "cursor.move"; cursor: WhiteboardLiveCursor }
  | { type: "object.upsert"; objectId: string; payload: unknown; version: number }
  | { type: "object.delete"; objectId: string; version: number }
  | { type: "comment.add"; commentId: string }
  | { type: "version.created"; version: number };

export interface WhiteboardCollabChannel {
  whiteboardId: string;
  /** Future: `whiteboard:{id}` Redis/Socket room name */
  room: string;
}

export function getWhiteboardCollabRoom(whiteboardId: string): string {
  return `whiteboard:${whiteboardId}`;
}

/** Placeholder client — swap for Socket.IO/Pusher when realtime ships. */
export class WhiteboardCollabClient {
  constructor(private readonly whiteboardId: string) {}

  get channel(): WhiteboardCollabChannel {
    return {
      whiteboardId: this.whiteboardId,
      room: getWhiteboardCollabRoom(this.whiteboardId),
    };
  }

  connect(): void {
    // Intentionally no-op until realtime infrastructure is enabled.
  }

  disconnect(): void {
    // Intentionally no-op.
  }

  publish(_event: WhiteboardCollabEvent): void {
    void _event;
    // Intentionally no-op.
  }
}
