import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { Report, DashboardStats, AIAnalysisResult, IncidentStatus } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  // Dedicated isolated port 3880 for API
  private apiUrl = window.location.port === '4880' ? 'http://localhost:3880/api' : (window.location.port === '4200' ? 'http://localhost:3880/api' : '/api');

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      catchError(err => {
        console.error('Failed to load dashboard:', err);
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

    return this.http.get<Report[]>(`${this.apiUrl}/reports`, { params }).pipe(
      catchError(err => {
        console.error('Failed to load reports:', err);
        return of([]);
      })
    );
  }

  getReportById(id: string): Observable<Report | null> {
    return this.http.get<Report>(`${this.apiUrl}/reports/${id}`).pipe(
      catchError(err => {
        console.error(`Failed to load report ${id}:`, err);
        return of(null);
      })
    );
  }

  analyzeImage(payload: FormData | { imageUrl?: string; presetHint?: string; latitude?: number; longitude?: number }): Observable<AIAnalysisResult> {
    return this.http.post<AIAnalysisResult>(`${this.apiUrl}/reports/analyze`, payload);
  }

  createReport(data: FormData | Partial<Report>): Observable<{ success: boolean; isDuplicate: boolean; mergedIntoId?: string; report: Report; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/reports`, data);
  }

  updateReportStatus(id: string, status: IncidentStatus, note?: string): Observable<{ success: boolean; report: Report; message: string }> {
    return this.http.patch<any>(`${this.apiUrl}/reports/${id}/status`, { status, note });
  }

  checkHealth(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      catchError(() => of({ status: 'offline' }))
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
