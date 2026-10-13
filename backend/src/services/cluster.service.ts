import { Report, ReportSubmission, IncidentPriority, IncidentCategory } from '../types/report.js';
import { config } from '../config/config.js';

export class ClusterService {
  /**
   * Calculate distance between two points in meters using Haversine formula
   */
  getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Search for an existing report within clustering radius (40m) of the same category
   */
  findDuplicate(
    category: IncidentCategory,
    latitude: number,
    longitude: number,
    existingReports: Report[]
  ): { existingReport: Report; distance: number } | null {
    let closestMatch: { existingReport: Report; distance: number } | null = null;
    let minDistance = config.clusteringRadiusMeters;

    for (const report of existingReports) {
      if (report.category !== category) continue;
      if (report.status === 'Resolved') continue;

      const dist = this.getDistanceMeters(latitude, longitude, report.latitude, report.longitude);

      if (dist <= config.clusteringRadiusMeters && dist < minDistance) {
        minDistance = dist;
        closestMatch = { existingReport: report, distance: Math.round(dist) };
      }
    }

    return closestMatch;
  }

  /**
   * Merge a new submission into an existing cluster
   */
  mergeIntoCluster(
    clusterReport: Report,
    submission: ReportSubmission
  ): Report {
    clusterReport.duplicateCount += 1;
    clusterReport.updatedAt = new Date().toISOString();

    if (!clusterReport.submissions) {
      clusterReport.submissions = [];
    }
    clusterReport.submissions.unshift(submission);

    // Auto-escalate priority based on duplicate volume
    clusterReport.priority = this.calculateEscalatedPriority(clusterReport.duplicateCount, clusterReport.priority);

    return clusterReport;
  }

  private calculateEscalatedPriority(duplicateCount: number, currentPriority: IncidentPriority): IncidentPriority {
    if (duplicateCount >= 6) return 'Critical';
    if (duplicateCount >= 3) return 'High';
    if (duplicateCount >= 2 && currentPriority === 'Low') return 'Medium';
    return currentPriority;
  }
}

export const clusterService = new ClusterService();
