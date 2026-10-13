import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/db.service.js';
import { clusterService } from '../services/cluster.service.js';
import { detectionService } from '../services/detection.service.js';
import { storageService } from '../services/storage.service.js';
import { emailService } from '../services/email.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Report, IncidentCategory, IncidentStatus, IncidentPriority, Attachment, ReportSubmission } from '../types/report.js';

export class ReportController {
  /**
   * GET /api/dashboard
   * Calculates metrics dynamically from actual database records
   */
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await dbService.getDashboardStats(req.user);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Error al calcular estadísticas reales del panel' });
    }
  }

  /**
   * GET /api/reports
   * Search, filter by status, category, priority, user ownership, and neighborhood
   */
  async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { category, status, priority, neighborhood, search, onlyMine } = req.query;
      let reports = await dbService.getAllReports();

      // If requested only authenticated user's reports (Admins see all)
      if (onlyMine === 'true' && req.user && req.user.role !== 'Administrator') {
        const uId = req.user.id;
        const uEmail = (req.user.email || '').toLowerCase();
        reports = reports.filter(r =>
          r.userId === uId ||
          (r.userEmail && r.userEmail.toLowerCase() === uEmail) ||
          (r.submissions && r.submissions.some(s => s.citizenEmail && s.citizenEmail.toLowerCase() === uEmail))
        );
      }

      if (category && category !== 'all') {
        reports = reports.filter(r => r.category === category);
      }

      if (status && status !== 'all') {
        reports = reports.filter(r => r.status === status);
      }

      if (priority && priority !== 'all') {
        reports = reports.filter(r => r.priority === priority);
      }

      if (neighborhood && neighborhood !== 'all') {
        reports = reports.filter(r => (r.neighborhood || '').toLowerCase().includes((neighborhood as string).toLowerCase()));
      }

      if (search) {
        const q = (search as string).toLowerCase();
        reports = reports.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          (r.neighborhood && r.neighborhood.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
        );
      }

      res.json(reports);
    } catch (error) {
      console.error('Error listing reports:', error);
      res.status(500).json({ error: 'Error al listar las incidencias' });
    }
  }

  /**
   * GET /api/reports/:id
   */
  async getReportById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await dbService.getReportById(id);

      if (!report) {
        res.status(404).json({ error: `Incidencia con ID ${id} no encontrada` });
        return;
      }

      res.json(report);
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ error: 'Error al obtener la incidencia' });
    }
  }

  /**
   * POST /api/reports/analyze
   */
  async analyzeReportImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let fileName: string | undefined;
      let mimeType: string | undefined;

      if (req.file) {
        fileName = req.file.originalname;
        mimeType = req.file.mimetype;
      } else if (req.body.imageUrl) {
        fileName = req.body.imageUrl;
      }

      const presetHint = req.body.presetHint || req.body.category;
      const analysis = await detectionService.analyzeImage(fileName, mimeType, presetHint);

      // Check nearby duplicates preview
      let duplicateWarning: { id: string; distance: number; duplicateCount: number } | null = null;
      if (req.body.latitude && req.body.longitude) {
        const lat = parseFloat(req.body.latitude);
        const lon = parseFloat(req.body.longitude);
        const existing = await dbService.getAllReports();
        const match = clusterService.findDuplicate(analysis.detectedCategory, lat, lon, existing);
        if (match) {
          duplicateWarning = {
            id: match.existingReport.id,
            distance: match.distance,
            duplicateCount: match.existingReport.duplicateCount,
          };
        }
      }

      res.json({
        ...analysis,
        duplicateWarning,
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      res.status(500).json({ error: 'Error al analizar la imagen' });
    }
  }

  /**
   * POST /api/reports
   * Create report or merge into duplicate cluster
   * Owner is determined strictly from authenticated session/token (never client-supplied)
   */
  async createReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { title, description, category, address, neighborhood, latitude, longitude, priority } = req.body;

      // Public / Guest user default if unauthenticated
      const userId = req.user?.id || 'USR-VECINO-01';
      const userFullName = req.user?.fullName || req.body.citizenName || 'Ciudadano de Málaga';
      const userEmail = req.user?.email || req.body.citizenEmail || 'vecino@malaga.es';

      // Backend Validation
      if (!title || title.trim().length < 3) {
        res.status(400).json({ error: 'El título es obligatorio y debe tener al menos 3 caracteres' });
        return;
      }

      if (!description || description.trim().length < 5) {
        res.status(400).json({ error: 'La descripción es obligatoria y debe tener al menos 5 caracteres' });
        return;
      }

      if (!address || address.trim().length < 3) {
        res.status(400).json({ error: 'La dirección es obligatoria' });
        return;
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({ error: 'Las coordenadas geográficas (latitud y longitud) son obligatorias y deben ser válidas' });
        return;
      }

      // Handle Attachment / Image Upload to Cloudflare R2 / Local fallback
      let imageUrl = req.body.imageUrl || '';
      const attachments: Attachment[] = [];

      if (req.file) {
        imageUrl = await storageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        attachments.push({
          id: `ATT-${uuidv4().substring(0, 8)}`,
          url: imageUrl,
          name: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
        });
      } else if (imageUrl) {
        attachments.push({
          id: `ATT-${uuidv4().substring(0, 8)}`,
          url: imageUrl,
          name: 'foto_evidencia.jpg',
          uploadedAt: new Date().toISOString(),
        });
      } else {
        // Fallback default image
        imageUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
      }

      const incidentCategory: IncidentCategory = category || 'pothole';
      const incidentPriority: IncidentPriority = priority || 'Medium';

      // Citizen Submission payload
      const submission: ReportSubmission = {
        id: `SUB-${Date.now().toString().slice(-4)}`,
        citizenName: userFullName,
        citizenEmail: userEmail,
        description: description.trim(),
        imageUrl,
        latitude: lat,
        longitude: lon,
        address: address.trim(),
        submittedAt: new Date().toISOString(),
      };

      // Check for spatial duplicate within 40m
      const existingReports = await dbService.getAllReports();
      const duplicateMatch = clusterService.findDuplicate(incidentCategory, lat, lon, existingReports);

      if (duplicateMatch) {
        // MERGE INTO EXISTING CLUSTER
        const clusteredReport = clusterService.mergeIntoCluster(duplicateMatch.existingReport, submission);
        await dbService.saveReport(clusteredReport);

        // Send email notification to citizen (non-blocking)
        if (userEmail) {
          emailService.sendReportMergedEmail(clusteredReport as any, userEmail, userFullName)
            .catch(() => {});
        }

        res.status(200).json({
          success: true,
          isDuplicate: true,
          mergedIntoId: clusteredReport.id,
          distanceMeters: duplicateMatch.distance,
          message: `¡Incidencia agrupada con éxito! Ya existía un reporte similar a ${duplicateMatch.distance}m. Se ha sumado tu aviso elevando la prioridad del caso a ${clusteredReport.priority}.`,
          report: clusteredReport,
        });
        return;
      }

      // CREATE NEW REPORT
      const newId = `REP-${(1000 + existingReports.length + 1)}`;
      const newReport: Report = {
        id: newId,
        title: title.trim(),
        description: description.trim(),
        category: incidentCategory,
        address: address.trim(),
        neighborhood: neighborhood?.trim() || 'Málaga Capital',
        latitude: lat,
        longitude: lon,
        status: 'Submitted',
        priority: incidentPriority,
        userId,
        userFullName,
        userEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageUrl,
        attachments,
        statusHistory: [
          {
            id: `SH-${uuidv4().substring(0, 6)}`,
            reportId: newId,
            oldStatus: 'Submitted',
            newStatus: 'Submitted',
            changedByUserId: userId,
            changedByName: userFullName,
            note: 'Incidencia creada en la plataforma por el ciudadano.',
            timestamp: new Date().toISOString(),
          }
        ],
        duplicateCount: 1,
        clusterId: `CLUSTER-${Date.now().toString().slice(-6)}`,
        submissions: [submission],
        aiConfidence: req.body.aiConfidence ? parseFloat(req.body.aiConfidence) : 0.95,
        aiDetectedCategory: incidentCategory,
      };

      await dbService.saveReport(newReport);

      // Send email confirmation (non-blocking)
      if (userEmail) {
        emailService.sendReportReceivedEmail(newReport as any, userEmail, userFullName)
          .catch(() => {});
      }

      res.status(201).json({
        success: true,
        isDuplicate: false,
        message: '¡Incidencia registrada correctamente en el sistema municipal!',
        report: newReport,
      });
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ error: 'Error al registrar la incidencia' });
    }
  }

  /**
   * PATCH /api/reports/:id/status
   * Protected: Only Administrator can change status or assign reports
   */
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const modifier = req.user || {
        id: 'USR-ADMIN-01',
        fullName: 'Técnico Municipal / Administrador',
        email: 'admin@callefix.malaga.es',
        role: 'Administrator'
      };

      const { id } = req.params;
      const { status, note } = req.body;

      const validStatuses: IncidentStatus[] = ['Submitted', 'UnderReview', 'InProgress', 'Resolved'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ error: `Estado no válido. Debe ser uno de: ${validStatuses.join(', ')}` });
        return;
      }

      const updated = await dbService.updateReportStatus(
        id,
        status as IncidentStatus,
        { id: modifier.id, fullName: modifier.fullName },
        note
      );

      if (!updated) {
        res.status(404).json({ error: `Incidencia #${id} no encontrada` });
        return;
      }

      // Notify citizen who created the report (non-blocking background task)
      if (updated.userEmail) {
        emailService.sendStatusUpdateEmail(updated as any, updated.userEmail, note)
          .catch(() => {});
      }

      // Also notify any citizen submissions linked into this cluster (non-blocking)
      if (updated.submissions && updated.submissions.length > 0) {
        for (const sub of updated.submissions) {
          if (sub.citizenEmail && sub.citizenEmail !== updated.userEmail) {
            emailService.sendStatusUpdateEmail(updated as any, sub.citizenEmail, note)
              .catch(() => {});
          }
        }
      }

      res.json({
        success: true,
        message: `Estado de la incidencia #${id} actualizado a ${status}`,
        report: updated,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Error al actualizar el estado de la incidencia' });
    }
  }
}

export const reportController = new ReportController();
