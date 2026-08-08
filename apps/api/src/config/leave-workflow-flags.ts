/**
 * Leave approval workflow environment flags.
 * Re-exported for config consumers — source of truth is leave-approval.config.
 */
export {
  isLeaveManagerApprovalRequired,
  isLeaveHrApprovalRequired,
  getLeaveAutoExpireDays,
  getLeaveApprovalConfig,
} from "../modules/team/workflows/leave-approval.config.js";
