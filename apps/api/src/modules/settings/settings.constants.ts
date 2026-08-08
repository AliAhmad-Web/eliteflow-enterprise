export const SETTINGS_AUDIT_RESOURCE = "settings" as const;

export const SETTINGS_AUDIT_ACTIONS = {
  PROFILE_UPDATED: "settings.profile_updated",
  PROFILE_AVATAR_UPDATED: "settings.profile_avatar_updated",
  PROFILE_AVATAR_REMOVED: "settings.profile_avatar_removed",
  PROFILE_DOCUMENT_UPLOADED: "settings.profile_document_uploaded",
  PROFILE_DOCUMENT_DELETED: "settings.profile_document_deleted",
  COMPANY_UPDATED: "settings.company_updated",
  APPEARANCE_UPDATED: "settings.appearance_updated",
  LOCALE_UPDATED: "settings.locale_updated",
  NOTIFICATIONS_UPDATED: "settings.notifications_updated",
  AI_UPDATED: "settings.ai_updated",
  SECURITY_PREFS_UPDATED: "settings.security_prefs_updated",
  API_KEY_CREATED: "settings.api_key_created",
  API_KEY_UPDATED: "settings.api_key_updated",
  API_KEY_DELETED: "settings.api_key_deleted",
  BACKUP_CREATED: "settings.backup_created",
  BILLING_UPDATED: "settings.billing_updated",
  ACCOUNT_DELETION_REQUESTED: "settings.account_deletion_requested",
  PREFERENCES_RESET: "settings.preferences_reset",
} as const;

export const SETTINGS_ORG_KEY = "default" as const;

export const PROFILE_AVATAR_TAG = "profile-avatar" as const;
export const PROFILE_DOCUMENT_TAG = "profile-document" as const;

export const SETTINGS_MESSAGES = {
  PROFILE_UPDATED: "Profile updated successfully.",
  AVATAR_UPDATED: "Profile picture updated successfully.",
  AVATAR_REMOVED: "Profile picture removed.",
  DOCUMENT_UPLOADED: "Document uploaded successfully.",
  DOCUMENT_DELETED: "Document deleted successfully.",
  COMPANY_UPDATED: "Company settings updated.",
  SAVED: "Settings saved successfully.",
  RESET: "Settings reset to defaults.",
  FORBIDDEN: "You do not have permission to perform this action",
  NOT_FOUND: "Resource not found",
  USERNAME_TAKEN: "Username is already taken",
  EMAIL_MISMATCH: "Confirmation email does not match your account",
  KEY_CREATED: "API key stored securely.",
  KEY_UPDATED: "API key updated.",
  KEY_DELETED: "API key removed.",
  BACKUP_STARTED: "Backup job created.",
  DELETION_REQUESTED: "Account deletion request submitted.",
} as const;
