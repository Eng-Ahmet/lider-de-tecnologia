import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map, from } from 'rxjs';
import { Report, DashboardStats, AIAnalysisResult, IncidentStatus, IncidentPriority, IncidentCategory, ReportSubmission, Attachment } from '../models/report.model';
import { getApiBaseUrl } from '../config/api.config';

const STORAGE_KEY = 'callefix_reports_store_v3';
export const TEST_EMAIL = 'a.h.ahmet.es@gmail.com';
export const TEST_NAME = 'Ahmet (Líder Digital)';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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

const INITIAL_LOCAL_REPORTS: Report[] = [
  {
    id: 'REP-1001',
    title: 'Bache profundo en Calle Marqués de Larios',
    description: 'Bache de aproximadamente 12 cm de profundidad en zona peatonal y cruce de vehículos autorizados. Tropiezo peligroso para viandantes.',
    category: 'pothole',
    address: 'Calle Marqués de Larios, 14, 29015 Málaga',
    neighborhood: 'Centro Histórico',
    latitude: 36.7198,
    longitude: -4.4214,
    status: 'Submitted',
    priority: 'Critical',
    userId: 'USR-AHMET-01',
    userFullName: TEST_NAME,
    userEmail: TEST_EMAIL,
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    attachments: [
      {
        id: 'ATT-01',
        url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        name: 'bache_larios_principal.jpg',
        size: 1420500,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      }
    ],
    statusHistory: [
      {
        id: 'SH-01',
        reportId: 'REP-1001',
        oldStatus: 'Submitted',
        newStatus: 'Submitted',
        changedByUserId: 'USR-AHMET-01',
        changedByName: TEST_NAME,
        note: 'Reporte inicial registrado en la plataforma por el ciudadano.',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      }
    ],
    duplicateCount: 8,
    clusterId: 'CLUSTER-LARIOS-01',
    aiConfidence: 0.97,
    aiDetectedCategory: 'pothole',
    submissions: [
      {
        id: 'SUB-01',
        citizenName: TEST_NAME,
        citizenEmail: TEST_EMAIL,
        description: 'Casi me caigo con la bicicleta por la mañana. Se ha hecho más grande con la lluvia.',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        latitude: 36.71982,
        longitude: -4.42138,
        address: 'Calle Marqués de Larios, 14',
        submittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 'SUB-02',
        citizenName: 'Elena Ramos',
        citizenEmail: 'elena.ramos@malaga.es',
        description: 'Peligro grave para personas mayores en plena calle Larios.',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
        latitude: 36.71979,
        longitude: -4.42142,
        address: 'Calle Marqués de Larios, 12',
        submittedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      }
    ],
  },
  {
    id: 'REP-1002',
    title: 'Señal de Ceda el Paso derribada',
    description: 'Señal de tráfico doblada a 45 grados por posible impacto nocturno de furgoneta. Falta de visibilidad en cruce concurrido.',
    category: 'damaged_sign',
    address: 'Bulevar Louis Pasteur, 28, 29071 Málaga',
    neighborhood: 'Teatinos',
    latitude: 36.7172,
    longitude: -4.4715,
    status: 'UnderReview',
    priority: 'High',
    userId: 'USR-AHMET-01',
    userFullName: TEST_NAME,
    userEmail: TEST_EMAIL,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
    attachments: [],
    statusHistory: [
      {
        id: 'SH-02',
        reportId: 'REP-1002',
        oldStatus: 'Submitted',
        newStatus: 'UnderReview',
        changedByUserId: 'USR-AHMET-01',
        changedByName: TEST_NAME,
        note: 'Señal asignada al equipo de señalización vertical de Teatinos para reposición.',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      }
    ],
    duplicateCount: 5,
    clusterId: 'CLUSTER-TEATINOS-02',
    aiConfidence: 0.94,
    aiDetectedCategory: 'damaged_sign',
    submissions: []
  },
  {
    id: 'REP-1003',
    title: 'Asfalto agrietado y hundido tras obras de canalización',
    description: 'Zanja mal compactada que ha cedido dejando una hendidura transversal en la calzada.',
    category: 'damaged_road',
    address: 'Paseo Marítimo Ciudad de Melilla, 5, 29016 Málaga',
    neighborhood: 'La Malagueta',
    latitude: 36.7192,
    longitude: -4.4098,
    status: 'Submitted',
    priority: 'Medium',
    userId: 'USR-AHMET-01',
    userFullName: TEST_NAME,
    userEmail: TEST_EMAIL,
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
    attachments: [],
    statusHistory: [],
    duplicateCount: 3,
    clusterId: 'CLUSTER-MALAGUETA-03',
    aiConfidence: 0.92,
    aiDetectedCategory: 'damaged_road',
    submissions: []
  },
  {
    id: 'REP-1004',
    title: 'Semáforo sin corriente y cables expuestos',
    description: 'Poste semafórico averiado en cruce principal del Soho tras fuerte tormenta.',
    category: 'traffic_accident',
    address: 'Calle Tomás Heredia, 12, 29001 Málaga',
    neighborhood: 'Soho Málaga',
    latitude: 36.7158,
    longitude: -4.4235,
    status: 'Resolved',
    priority: 'Critical',
    userId: 'USR-AHMET-01',
    userFullName: TEST_NAME,
    userEmail: TEST_EMAIL,
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    attachments: [],
    statusHistory: [
      {
        id: 'SH-03',
        reportId: 'REP-1004',
        oldStatus: 'InProgress',
        newStatus: 'Resolved',
        changedByUserId: 'USR-AHMET-01',
        changedByName: TEST_NAME,
        note: 'Cuadrilla eléctrica 4 reparó el cuadro y restauró el ciclo semafórico.',
        timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      }
    ],
    duplicateCount: 6,
    clusterId: 'CLUSTER-SOHO-04',
    aiConfidence: 0.95,
    aiDetectedCategory: 'traffic_accident',
    resolutionNotes: 'Cuadrilla eléctrica 4 reparó el cuadro y restauró el ciclo semafórico.',
    submissions: []
  },
  {
    id: 'REP-1005',
    title: 'Vía cortada por desprendimiento de rama de ficus',
    description: 'Gran rama caída atravesando los dos carriles del sentido oeste.',
    category: 'blocked_road',
    address: 'Alameda Principal, 18, 29005 Málaga',
    neighborhood: 'Centro Histórico',
    latitude: 36.7179,
    longitude: -4.4248,
    status: 'InProgress',
    priority: 'High',
    userId: 'USR-AHMET-01',
    userFullName: TEST_NAME,
    userEmail: TEST_EMAIL,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?auto=format&fit=crop&w=800&q=80',
    attachments: [],
    statusHistory: [
      {
        id: 'SH-04',
        reportId: 'REP-1005',
        oldStatus: 'Submitted',
        newStatus: 'InProgress',
        changedByUserId: 'USR-AHMET-01',
        changedByName: TEST_NAME,
        note: 'Parques y Jardines trabajando con motosierras en el lugar.',
        timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      }
    ],
    duplicateCount: 2,
    clusterId: 'CLUSTER-ALAMEDA-05',
    aiConfidence: 0.91,
    aiDetectedCategory: 'blocked_road',
    submissions: []
  }
];

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = getApiBaseUrl();

  constructor() {
    console.log(`🌐 [ReportService] Inicializado 100% en modo LocalStorage (Público, Autónomo, Sin dependencias de base de datos)`);
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_REPORTS));
        console.log(`📦 [ReportService] Almacén LocalStorage inicializado con ${INITIAL_LOCAL_REPORTS.length} incidencias.`);
      }
    } catch (e) {
      console.warn('⚠️ [ReportService] Advertencia al acceder a localStorage:', e);
    }
  }

  private getStoredReports(): Report[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing localStorage reports:', e);
    }
    return [...INITIAL_LOCAL_REPORTS];
  }

  private saveStoredReports(reports: Report[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  getDashboard(): Observable<DashboardStats> {
    console.log(`📡 [ReportService.getDashboard] Calculando métricas dinámicas desde LocalStorage...`);
    const reports = this.getStoredReports();

    const categoryBreakdown: Record<IncidentCategory, number> = {
      pothole: 0,
      damaged_road: 0,
      traffic_accident: 0,
      blocked_road: 0,
      damaged_sign: 0,
      other_hazard: 0,
    };

    const neighborhoodMap = new Map<string, { total: number; resolved: number }>();
    let duplicatesMerged = 0;
    let newOrPending = 0;
    let investigating = 0;
    let resolved = 0;
    let urgentOrCritical = 0;
    let userReports = 0;

    for (const r of reports) {
      if (r.category && categoryBreakdown[r.category] !== undefined) {
        categoryBreakdown[r.category]++;
      }
      if (r.status === 'Submitted') newOrPending++;
      else if (r.status === 'UnderReview' || r.status === 'InProgress') investigating++;
      else if (r.status === 'Resolved') resolved++;

      if (r.priority === 'Critical' || r.priority === 'High') urgentOrCritical++;
      if (r.duplicateCount > 1) duplicatesMerged += (r.duplicateCount - 1);
      if (r.userEmail === TEST_EMAIL) userReports++;

      const nName = r.neighborhood || 'Málaga Capital';
      const existingN = neighborhoodMap.get(nName) || { total: 0, resolved: 0 };
      existingN.total++;
      if (r.status === 'Resolved') existingN.resolved++;
      neighborhoodMap.set(nName, existingN);
    }

    const neighborhoodStats = Array.from(neighborhoodMap.entries()).map(([neighborhood, stats]) => ({
      neighborhood,
      count: stats.total,
    }));

    const recentReports = [...reports]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const stats: DashboardStats = {
      totalReports: reports.length,
      userReports: userReports || reports.length,
      newOrPendingReports: newOrPending,
      investigatingReports: investigating,
      resolvedReports: resolved,
      urgentOrCriticalReports: urgentOrCritical,
      duplicatesMerged,
      categoryBreakdown,
      neighborhoodStats,
      recentReports,
    };

    return of(stats);
  }

  getReports(filters?: { category?: string; status?: string; priority?: string; neighborhood?: string; search?: string; onlyMine?: boolean }): Observable<Report[]> {
    console.log(`📡 [ReportService.getReports] Consultando incidencias desde LocalStorage con filtros:`, filters || 'todos');
    let reports = this.getStoredReports();

    if (filters) {
      if (filters.category && filters.category !== 'all') {
        reports = reports.filter(r => r.category === filters.category);
      }
      if (filters.status && filters.status !== 'all') {
        reports = reports.filter(r => r.status === filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        reports = reports.filter(r => r.priority === filters.priority);
      }
      if (filters.neighborhood && filters.neighborhood !== 'all') {
        reports = reports.filter(r => r.neighborhood === filters.neighborhood);
      }
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        reports = reports.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
    }

    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return of(reports);
  }

  getReportById(id: string): Observable<Report | null> {
    console.log(`📡 [ReportService.getReportById] Buscando #${id} en LocalStorage...`);
    const reports = this.getStoredReports();
    const found = reports.find(r => r.id === id) || null;
    return of(found);
  }

  analyzeImage(payload: FormData | { imageUrl?: string; presetHint?: string; latitude?: number; longitude?: number }): Observable<AIAnalysisResult> {
    return this.http.post<AIAnalysisResult>(`${this.apiUrl}/reports/analyze`, payload).pipe(
      catchError(() => {
        let cat: IncidentCategory = 'pothole';
        let label = 'Bache o Desperfecto en Pavimento';
        let desc = 'Desperfecto en calzada detectado mediante análisis local.';

        if (payload instanceof FormData) {
          const catForm = payload.get('category') as string;
          if (catForm) cat = catForm as IncidentCategory;
        }

        const simulated: AIAnalysisResult = {
          detectedCategory: cat,
          confidence: 0.96,
          label,
          description: desc,
          suggestedPriority: 'High',
          simulated: true,
          keyFeatures: ['Fisura en superficie', 'Riesgo para tráfico rodado', 'Ubicación georreferenciada'],
        };
        return of(simulated);
      })
    );
  }

  createReport(data: FormData | Partial<Report>): Observable<{ success: boolean; isDuplicate: boolean; mergedIntoId?: string; report: Report; message: string }> {
    return from(this.processReportCreation(data));
  }

  private async processReportCreation(data: FormData | Partial<Report>): Promise<{ success: boolean; isDuplicate: boolean; mergedIntoId?: string; report: Report; message: string }> {
    console.log(`📤 [ReportService.createReport] Procesando reporte en LocalStorage...`);

    let title = '';
    let description = '';
    let category: IncidentCategory = 'pothole';
    let priority: IncidentPriority = 'Medium';
    let address = 'Calle Larios, Málaga';
    let neighborhood = 'Centro Histórico';
    let latitude = 36.721;
    let longitude = -4.421;
    let imageUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
    let citizenEmail = TEST_EMAIL;
    let citizenName = TEST_NAME;

    if (data instanceof FormData) {
      title = (data.get('title') as string) || 'Incidencia Vial';
      description = (data.get('description') as string) || 'Sin descripción';
      category = ((data.get('category') as IncidentCategory) || 'pothole');
      priority = ((data.get('priority') as IncidentPriority) || 'Medium');
      address = (data.get('address') as string) || address;
      neighborhood = (data.get('neighborhood') as string) || neighborhood;
      latitude = parseFloat(data.get('latitude') as string) || latitude;
      longitude = parseFloat(data.get('longitude') as string) || longitude;
      citizenEmail = (data.get('citizenEmail') as string) || TEST_EMAIL;
      citizenName = (data.get('citizenName') as string) || TEST_NAME;

      const file = data.get('image');
      if (file instanceof File) {
        try {
          imageUrl = await this.fileToDataUrl(file);
        } catch {
          imageUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
        }
      } else {
        const imgUrlParam = data.get('imageUrl') as string;
        if (imgUrlParam) imageUrl = imgUrlParam;
      }
    } else {
      title = data.title || 'Incidencia Vial';
      description = data.description || '';
      category = data.category || 'pothole';
      priority = data.priority || 'Medium';
      address = data.address || address;
      neighborhood = data.neighborhood || neighborhood;
      latitude = data.latitude || latitude;
      longitude = data.longitude || longitude;
      imageUrl = data.imageUrl || imageUrl;
      citizenEmail = data.userEmail || TEST_EMAIL;
      citizenName = data.userFullName || TEST_NAME;
    }

    const reports = this.getStoredReports();

    // Check duplicate clustering within 45 meters with same category
    let duplicateMatch: { report: Report; distance: number } | null = null;
    for (const r of reports) {
      if (r.category === category && r.status !== 'Resolved') {
        const dist = calculateDistanceMeters(latitude, longitude, r.latitude, r.longitude);
        if (dist <= 45) {
          duplicateMatch = { report: r, distance: Math.round(dist) };
          break;
        }
      }
    }

    const submission: ReportSubmission = {
      id: `SUB-${Date.now().toString().slice(-4)}`,
      citizenName,
      citizenEmail,
      description,
      imageUrl,
      latitude,
      longitude,
      address,
      submittedAt: new Date().toISOString(),
    };

    if (duplicateMatch) {
      const existing = duplicateMatch.report;
      existing.duplicateCount = (existing.duplicateCount || 1) + 1;
      if (!existing.submissions) existing.submissions = [];
      existing.submissions.push(submission);
      existing.updatedAt = new Date().toISOString();

      if (existing.priority === 'Low') existing.priority = 'Medium';
      else if (existing.priority === 'Medium' && existing.duplicateCount >= 3) existing.priority = 'High';
      else if (existing.priority === 'High' && existing.duplicateCount >= 5) existing.priority = 'Critical';

      this.saveStoredReports(reports);
      this.fireAndForgetBackendCreation(data);

      return {
        success: true,
        isDuplicate: true,
        mergedIntoId: existing.id,
        report: existing,
        message: `¡Incidencia agrupada con éxito! Ya existía un reporte similar a ${duplicateMatch.distance}m. Se ha sumado tu aviso elevando la prioridad del caso a ${existing.priority}.`,
      };
    }

    // New unique report
    const newId = `REP-${1000 + reports.length + 1}`;
    const attachments: Attachment[] = [
      {
        id: `ATT-${Date.now().toString().slice(-6)}`,
        url: imageUrl,
        name: 'evidencia_incidencia.jpg',
        uploadedAt: new Date().toISOString(),
      }
    ];

    const newReport: Report = {
      id: newId,
      title: title.trim(),
      description: description.trim(),
      category,
      address: address.trim(),
      neighborhood: neighborhood?.trim() || 'Málaga Capital',
      latitude,
      longitude,
      status: 'Submitted',
      priority,
      userId: 'USR-AHMET-01',
      userFullName: citizenName,
      userEmail: citizenEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageUrl,
      attachments,
      statusHistory: [
        {
          id: `SH-${Date.now().toString().slice(-5)}`,
          reportId: newId,
          oldStatus: 'Submitted',
          newStatus: 'Submitted',
          changedByUserId: 'USR-AHMET-01',
          changedByName: citizenName,
          note: 'Incidencia registrada en la plataforma por el ciudadano.',
          timestamp: new Date().toISOString(),
        }
      ],
      duplicateCount: 1,
      clusterId: `CLUSTER-${Date.now().toString().slice(-6)}`,
      submissions: [submission],
      aiConfidence: 0.95,
      aiDetectedCategory: category,
    };

    reports.unshift(newReport);
    this.saveStoredReports(reports);
    this.fireAndForgetBackendCreation(data);

    return {
      success: true,
      isDuplicate: false,
      report: newReport,
      message: '¡Incidencia registrada correctamente en el sistema municipal!',
    };
  }

  private fireAndForgetBackendCreation(data: FormData | Partial<Report>): void {
    try {
      this.http.post(`${this.apiUrl}/reports`, data).pipe(
        catchError(() => of(null))
      ).subscribe();
    } catch {}
  }

  updateReportStatus(id: string, status: IncidentStatus, note?: string): Observable<{ success: boolean; report: Report; message: string }> {
    console.log(`🔄 [ReportService.updateReportStatus] Actualizando #${id} a estado "${status}" en LocalStorage...`);
    const reports = this.getStoredReports();
    const index = reports.findIndex(r => r.id === id);

    if (index === -1) {
      throw new Error(`Incidencia #${id} no encontrada`);
    }

    const report = reports[index];
    const oldStatus = report.status;
    report.status = status;
    report.updatedAt = new Date().toISOString();
    if (status === 'Resolved') {
      report.resolvedAt = new Date().toISOString();
      if (note) report.resolutionNotes = note;
    }

    if (!report.statusHistory) report.statusHistory = [];
    report.statusHistory.push({
      id: `SH-${Date.now().toString().slice(-5)}`,
      reportId: id,
      oldStatus,
      newStatus: status,
      changedByUserId: 'USR-AHMET-01',
      changedByName: TEST_NAME,
      note: note || `Estado actualizado a ${status}`,
      timestamp: new Date().toISOString(),
    });

    reports[index] = report;
    this.saveStoredReports(reports);

    try {
      this.http.patch(`${this.apiUrl}/reports/${id}/status`, { status, note }).pipe(
        catchError(() => of(null))
      ).subscribe();
    } catch {}

    return of({
      success: true,
      report,
      message: `Estado de la incidencia #${id} actualizado a ${status}`,
    });
  }

  checkHealth(): Observable<any> {
    return of({ status: 'ok', storage: 'localStorage', mode: 'public_zero_auth' });
  }

  searchAddress(query: string): Observable<{ displayName: string; lat: number; lon: number }[]> {
    if (!query || query.trim().length < 3) return of([]);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Málaga, España')}&limit=5`;
    return this.http.get<any[]>(url).pipe(
      map(results => results.map(r => ({
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon)
      }))),
      catchError(() => of([]))
    );
  }

  reverseGeocode(lat: number, lon: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    return this.http.get<any>(url).pipe(
      map(r => r.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`),
      catchError(() => of(`${lat.toFixed(5)}, ${lon.toFixed(5)}`))
    );
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
