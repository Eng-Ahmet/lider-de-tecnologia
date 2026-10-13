import { Report, IncidentCategory, IncidentStatus, IncidentPriority, StatusHistoryEntry, DashboardStats } from '../types/report.js';
import { INITIAL_MOCK_REPORTS } from '../data/mock-data.js';
import { config } from '../config/config.js';
import pg from 'pg';

export class DbService {
  private reports: Report[] = [...INITIAL_MOCK_REPORTS];
  private pgPool: pg.Pool | null = null;
  private isPgConnected = false;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    if (!config.databaseUrl) {
      console.log('📦 Using In-Memory Database store with Málaga seed data.');
      return;
    }

    try {
      this.pgPool = new pg.Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 3000,
      });

      const client = await this.pgPool.connect();
      console.log('🐘 PostgreSQL connected successfully on isolated port 5488!');

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          phone_number TEXT,
          role VARCHAR(32) NOT NULL DEFAULT 'User',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id VARCHAR(64) PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(64) NOT NULL,
          address TEXT NOT NULL,
          neighborhood VARCHAR(64),
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'Submitted',
          priority VARCHAR(32) NOT NULL DEFAULT 'Medium',
          user_id VARCHAR(64) NOT NULL,
          user_full_name TEXT,
          user_email TEXT,
          image_url TEXT NOT NULL,
          attachments JSONB DEFAULT '[]'::jsonb,
          status_history JSONB DEFAULT '[]'::jsonb,
          duplicate_count INT DEFAULT 1,
          cluster_id VARCHAR(64),
          ai_confidence DOUBLE PRECISION,
          ai_detected_category VARCHAR(64),
          resolution_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,
          submissions JSONB DEFAULT '[]'::jsonb
        );
      `);

      client.release();
      this.isPgConnected = true;
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed on isolated port (5488). Using In-Memory persistent store.');
      this.isPgConnected = false;
      this.reports = [...INITIAL_MOCK_REPORTS];
    }
  }

  async getAllReports(): Promise<Report[]> {
    if (this.isPgConnected && this.pgPool) {
      try {
        const res = await this.pgPool.query('SELECT * FROM reports ORDER BY updated_at DESC');
        return res.rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category as IncidentCategory,
          address: row.address,
          neighborhood: row.neighborhood,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          status: row.status as IncidentStatus,
          priority: row.priority as IncidentPriority,
          userId: row.user_id,
          userFullName: row.user_full_name,
          userEmail: row.user_email,
          imageUrl: row.image_url,
          attachments: Array.isArray(row.attachments) ? row.attachments : JSON.parse(row.attachments || '[]'),
          statusHistory: Array.isArray(row.status_history) ? row.status_history : JSON.parse(row.status_history || '[]'),
          duplicateCount: row.duplicate_count,
          clusterId: row.cluster_id,
          aiConfidence: row.ai_confidence ? parseFloat(row.ai_confidence) : undefined,
          aiDetectedCategory: row.ai_detected_category,
          resolutionNotes: row.resolution_notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          resolvedAt: row.resolved_at,
          submissions: Array.isArray(row.submissions) ? row.submissions : JSON.parse(row.submissions || '[]'),
        }));
      } catch (err) {
        console.warn('⚠️ Error fetching from PG, fallback to memory:', err);
      }
    }
    return [...this.reports].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getReportById(id: string): Promise<Report | undefined> {
    const cleanId = (id || '').trim().toLowerCase();
    const all = await this.getAllReports();
    return all.find(r => (r.id || '').trim().toLowerCase() === cleanId);
  }

  async saveReport(report: Report): Promise<Report> {
    const existingIndex = this.reports.findIndex(r => r.id === report.id);
    if (existingIndex >= 0) {
      this.reports[existingIndex] = report;
    } else {
      this.reports.unshift(report);
    }

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO reports (id, title, description, category, address, neighborhood, latitude, longitude, status, priority, user_id, user_full_name, user_email, image_url, attachments, status_history, duplicate_count, cluster_id, ai_confidence, ai_detected_category, resolution_notes, created_at, updated_at, resolved_at, submissions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             duplicate_count = EXCLUDED.duplicate_count,
             updated_at = EXCLUDED.updated_at,
             resolved_at = EXCLUDED.resolved_at,
             resolution_notes = EXCLUDED.resolution_notes,
             status_history = EXCLUDED.status_history,
             submissions = EXCLUDED.submissions`,
          [
            report.id, report.title, report.description, report.category, report.address, report.neighborhood || '',
            report.latitude, report.longitude, report.status, report.priority, report.userId, report.userFullName || '',
            report.userEmail || '', report.imageUrl, JSON.stringify(report.attachments || []), JSON.stringify(report.statusHistory || []),
            report.duplicateCount, report.clusterId, report.aiConfidence || null, report.aiDetectedCategory || null,
            report.resolutionNotes || null, report.createdAt, report.updatedAt, report.resolvedAt || null, JSON.stringify(report.submissions || [])
          ]
        );
      } catch (err) {
        console.warn('⚠️ Error persisting to PG:', err);
      }
    }

    return report;
  }

  async updateReportStatus(
    id: string,
    status: IncidentStatus,
    changedBy: { id: string; fullName: string },
    note?: string
  ): Promise<Report | undefined> {
    const report = await this.getReportById(id);
    if (!report) return undefined;

    const oldStatus = report.status;
    report.status = status;
    report.updatedAt = new Date().toISOString();

    if (status === 'Resolved') {
      report.resolvedAt = new Date().toISOString();
    }

    if (note) {
      report.resolutionNotes = note;
    }

    // Append audit log to status history
    const historyEntry: StatusHistoryEntry = {
      id: `SH-${Date.now().toString().slice(-4)}`,
      reportId: id,
      oldStatus,
      newStatus: status,
      changedByUserId: changedBy.id,
      changedByName: changedBy.fullName,
      note: note || `Estado actualizado a ${status}`,
      timestamp: new Date().toISOString(),
    };

    if (!report.statusHistory) {
      report.statusHistory = [];
    }
    report.statusHistory.unshift(historyEntry);

    return this.saveReport(report);
  }

  /**
   * Calculate live statistics strictly from database records
   */
  async getDashboardStats(currentUserId?: string): Promise<DashboardStats> {
    const reports = await this.getAllReports();

    const totalReports = reports.length;
    const userReports = currentUserId
      ? reports.filter(r => r.userId === currentUserId).length
      : 0;

    const newOrPendingReports = reports.filter(r => r.status === 'Submitted').length;
    const investigatingReports = reports.filter(r => r.status === 'UnderReview' || r.status === 'InProgress').length;
    const resolvedReports = reports.filter(r => r.status === 'Resolved').length;
    const urgentOrCriticalReports = reports.filter(r => r.priority === 'High' || r.priority === 'Critical').length;

    const duplicatesMerged = reports.reduce((acc, r) => acc + (r.duplicateCount > 1 ? r.duplicateCount - 1 : 0), 0);

    const categoryBreakdown: Record<IncidentCategory, number> = {
      pothole: 0,
      damaged_road: 0,
      traffic_accident: 0,
      blocked_road: 0,
      damaged_sign: 0,
      other_hazard: 0,
    };

    const neighborhoodMap: Record<string, number> = {};

    reports.forEach(r => {
      if (categoryBreakdown[r.category] !== undefined) {
        categoryBreakdown[r.category]++;
      } else {
        categoryBreakdown.other_hazard++;
      }

      const nb = r.neighborhood || 'Málaga Capital';
      neighborhoodMap[nb] = (neighborhoodMap[nb] || 0) + 1;
    });

    const neighborhoodStats = Object.entries(neighborhoodMap).map(([neighborhood, count]) => ({
      neighborhood,
      count,
    }));

    return {
      totalReports,
      userReports,
      newOrPendingReports,
      investigatingReports,
      resolvedReports,
      urgentOrCriticalReports,
      duplicatesMerged,
      categoryBreakdown,
      neighborhoodStats,
      recentReports: reports.slice(0, 6),
    };
  }
}

export const dbService = new DbService();
