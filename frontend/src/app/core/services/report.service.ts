import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, tap } from 'rxjs';
import { Report, DashboardStats, AIAnalysisResult, IncidentStatus } from '../models/report.model';
import { getApiBaseUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = getApiBaseUrl();

  constructor() {
    console.log(`🌐 [ReportService] Inicializado con API Base URL: ${this.apiUrl}`);
  }

  getDashboard(): Observable<DashboardStats> {
    console.log(`📡 [ReportService.getDashboard] Solicitando métricas desde ${this.apiUrl}/dashboard`);
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(stats => console.log('✅ [ReportService.getDashboard] Métricas recibidas:', stats)),
      catchError(err => {
        console.error('❌ [ReportService.getDashboard] Error al cargar métricas:', err);
        return of({
          totalReports: 0,
          userReports: 0,
          newOrPendingReports: 0,
          investigatingReports: 0,
          resolvedReports: 0,
          urgentOrCriticalReports: 0,
          duplicatesMerged: 0,
          categoryBreakdown: { pothole: 0, damaged_road: 0, traffic_accident: 0, blocked_road: 0, damaged_sign: 0, other_hazard: 0 },
          neighborhoodStats: [],
          recentReports: [],
        });
      })
    );
  }

  getReports(filters?: { category?: string; status?: string; priority?: string; neighborhood?: string; search?: string; onlyMine?: boolean }): Observable<Report[]> {
    let params = new HttpParams();
    if (filters?.category && filters.category !== 'all') params = params.set('category', filters.category);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') params = params.set('priority', filters.priority);
    if (filters?.neighborhood && filters.neighborhood !== 'all') params = params.set('neighborhood', filters.neighborhood);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.onlyMine) params = params.set('onlyMine', 'true');

    console.log(`📡 [ReportService.getReports] Solicitando listado con filtros:`, filters || 'sin filtros');
    return this.http.get<Report[]>(`${this.apiUrl}/reports`, { params }).pipe(
      tap(reports => console.log(`✅ [ReportService.getReports] Recibidas ${reports.length} incidencias`)),
      catchError(err => {
        console.error('❌ [ReportService.getReports] Error al cargar incidencias:', err);
        return of([]);
      })
    );
  }

  getReportById(id: string): Observable<Report | null> {
    const url = `${this.apiUrl}/reports/${id}`;
    console.log(`📡 [ReportService.getReportById] Solicitando incidencia #${id} desde ${url}`);
    return this.http.get<Report>(url).pipe(
      tap(report => console.log(`✅ [ReportService.getReportById] Incidencia #${id} cargada exitosamente:`, report)),
      catchError(err => {
        console.error(`❌ [ReportService.getReportById] Error al cargar incidencia #${id}:`, err);
        return of(null);
      })
    );
  }

  analyzeImage(payload: FormData | { imageUrl?: string; presetHint?: string; latitude?: number; longitude?: number }): Observable<AIAnalysisResult> {
    console.log(`🤖 [ReportService.analyzeImage] Analizando datos de imagen/categoría con IA...`);
    return this.http.post<AIAnalysisResult>(`${this.apiUrl}/reports/analyze`, payload).pipe(
      tap(res => console.log('✅ [ReportService.analyzeImage] Resultado IA:', res)),
      catchError(err => {
        console.error('❌ [ReportService.analyzeImage] Error en análisis:', err);
        throw err;
      })
    );
  }

  createReport(data: FormData | Partial<Report>): Observable<{ success: boolean; isDuplicate: boolean; mergedIntoId?: string; report: Report; message: string }> {
    console.log(`📤 [ReportService.createReport] Enviando nueva incidencia al servidor...`);
    return this.http.post<any>(`${this.apiUrl}/reports`, data).pipe(
      tap(res => console.log('✅ [ReportService.createReport] Incidencia procesada con éxito:', res)),
      catchError(err => {
        console.error('❌ [ReportService.createReport] Error al registrar incidencia:', err);
        throw err;
      })
    );
  }

  updateReportStatus(id: string, status: IncidentStatus, note?: string): Observable<{ success: boolean; report: Report; message: string }> {
    console.log(`🔄 [ReportService.updateReportStatus] Actualizando #${id} a estado "${status}"...`);
    return this.http.patch<any>(`${this.apiUrl}/reports/${id}/status`, { status, note }).pipe(
      tap(res => console.log(`✅ [ReportService.updateReportStatus] Estado actualizado:`, res)),
      catchError(err => {
        console.error(`❌ [ReportService.updateReportStatus] Error al actualizar estado:`, err);
        throw err;
      })
    );
  }

  checkHealth(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      tap(res => console.log('💓 [ReportService.checkHealth] Estado backend:', res)),
      catchError(err => {
        console.warn('⚠️ [ReportService.checkHealth] Backend offline o inaccesible:', err);
        return of({ status: 'offline' });
      })
    );
  }

  /**
   * Search real address via OpenStreetMap Nominatim
   */
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

  /**
   * Reverse geocode coordinates to human-readable address
   */
  reverseGeocode(lat: number, lon: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    return this.http.get<any>(url).pipe(
      map(r => r.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`),
      catchError(() => of(`${lat.toFixed(5)}, ${lon.toFixed(5)}`))
    );
  }
}
