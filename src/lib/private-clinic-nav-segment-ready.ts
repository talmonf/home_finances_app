/** Dispatched after a private-clinic segment’s content tree has mounted client-side (`detail.path`). */
export const PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT = "private-clinic-nav-segment-ready";

export type PrivateClinicNavSegmentReadyDetail = {
  /** Use the same logical path as the tab `href`, e.g. `/dashboard/private-clinic/clients` */
  path: string;
};
