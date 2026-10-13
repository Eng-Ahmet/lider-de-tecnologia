export type IncidentCategory =
  | 'pothole'
  | 'damaged_road'
  | 'traffic_accident'
  | 'blocked_road'
  | 'damaged_sign'
  | 'other_hazard';

export type IncidentStatus = 'Submitted' | 'UnderReview' | 'InProgress' | 'Resolved';

export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Attachment {
  id: string;
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  reportId: string;
  oldStatus: IncidentStatus;
  newStatus: IncidentStatus;
  changedByUserId: string;
  changedByName: string;
  note?: string;
  timestamp: string;
}

export interface ReportSubmission {
  id: string;
  citizenName?: string;
  citizenEmail?: string;
  description: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address?: string;
  submittedAt: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  address: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  status: IncidentStatus;
  priority: IncidentPriority;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  imageUrl: string;
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  duplicateCount: number;
  clusterId: string;
  submissions: ReportSubmission[];
  aiConfidence?: number;
  aiDetectedCategory?: IncidentCategory;
  resolutionNotes?: string;
}

export interface DashboardStats {
  totalReports: number;
  userReports: number;
  newOrPendingReports: number;
  investigatingReports: number;
  resolvedReports: number;
  urgentOrCriticalReports: number;
  duplicatesMerged: number;
  categoryBreakdown: Record<IncidentCategory, number>;
  neighborhoodStats: { neighborhood: string; count: number }[];
  recentReports: Report[];
}
