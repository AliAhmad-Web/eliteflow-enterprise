/**
 * No visible route loading UI. App Router `loading.tsx` replaces the page
 * slot and caused full main-area blanks. Soft client navigation keeps the
 * previous page until the next segment is ready; use widget skeletons only.
 */
export default function DashboardLoading() {
  return null;
}
