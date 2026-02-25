export interface SupervisorStopView {
  id: string;
  stopOrder: number;
  isLocked: boolean;
  estimatedTravelMinutes: number | null;
  siteId: string | null;
  siteName: string;
  siteCode: string | null;
  siteAddress: string | null;
  jobCode: string | null;
  startTime: string | null;
  endTime: string | null;
  assignedStaff: string[];
  checkInAt: string | null;
  checkOutAt: string | null;
  driveFromPreviousMinutes: number | null;
}
