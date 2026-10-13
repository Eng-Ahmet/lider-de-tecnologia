import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, Report } from '../../core/models/report.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      <!-- Top Welcome Banner -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/20 p-6 lg:p-8 shadow-2xl">
        <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
              <span>🏛️ Ayuntamiento de Málaga</span>
              <span>•</span>
              <span *ngIf="authService.isAdmin()" class="text-purple-300 font-bold">👑 Vista Administrador Municipal</span>
              <span *ngIf="!authService.isAdmin()" class="text-emerald-300 font-bold">👤 Vista Ciudadano: {{ authService.currentUser()?.fullName }}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-heading">
              Panel de Control de Incidencias Urbanas
            </h1>
            <p class="text-slate-300 text-sm sm:text-base max-w-2xl">
              Sistema inteligente de monitorización vial con <strong class="text-sky-400">agrupación espacial automática</strong> de reportes duplicados y asignación de cuadrillas en tiempo real.
            </p>
          </div>

          <!-- Quick Actions -->
          <div class="flex flex-wrap items-center gap-3">
            <button (click)="simulateDuplicateDemo()" [disabled]="simulating"
                    class="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-purple-500/10">
              <span [class.animate-spin]="simulating">⚡</span>
              <span>{{ simulating ? 'Agrupando...' : 'Demo: Simular Reporte Duplicado' }}</span>
            </button>

            <a routerLink="/reports/new"
               class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-105">
              <span>+ Crear Nuevo Reporte</span>
            </a>
          </div>
        </div>

        <!-- Alert Notification -->
        <div *ngIf="demoAlert" class="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
          <div class="flex items-center gap-2">
            <span>🎉</span>
            <span>{{ demoAlert }}</span>
          </div>
          <button (click)="demoAlert = null" class="text-slate-400 hover:text-white">&times;</button>
        </div>
      </div>

      <!-- Real DB Statistics Cards (Required in Section 3) -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <!-- 1. Total Incidencias -->
        <div class="glass-card p-5 space-y-2 border-slate-800">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reportes</span>
          <div class="text-3xl font-extrabold text-white font-heading">{{ stats?.totalReports || 0 }}</div>
          <span class="text-[11px] text-slate-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Registros en BD real
          </span>
        </div>

        <!-- 2. Mis Reportes (Submitted by Authenticated User) -->
        <div class="glass-card p-5 space-y-2 border-sky-500/30 bg-sky-500/10">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-sky-400 uppercase tracking-wider">Mis Reportes</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">Tus envíos</span>
          </div>
          <div class="text-3xl font-extrabold text-sky-300 font-heading">{{ stats?.userReports || 0 }}</div>
          <span class="text-[11px] text-sky-200/80 flex items-center gap-1">
            👤 Vinculados a tu cuenta
          </span>
        </div>

        <!-- 3. Nuevas o Pendientes -->
        <div class="glass-card p-5 space-y-2 border-amber-500/20 bg-amber-500/5">
          <span class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pendientes</span>
          <div class="text-3xl font-extrabold text-amber-400 font-heading">{{ stats?.newOrPendingReports || 0 }}</div>
          <span class="text-[11px] text-amber-300/70 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Estado: Submitted
          </span>
        </div>

        <!-- 4. En Investigación (UnderReview / InProgress) -->
        <div class="glass-card p-5 space-y-2 border-indigo-500/20 bg-indigo-500/5">
          <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Investigando</span>
          <div class="text-3xl font-extrabold text-indigo-400 font-heading">{{ stats?.investigatingReports || 0 }}</div>
          <span class="text-[11px] text-indigo-300/70 flex items-center gap-1">
            🛠️ Cuadrilla actuando
          </span>
        </div>

        <!-- 5. Resueltas -->
        <div class="glass-card p-5 space-y-2 border-emerald-500/20 bg-emerald-500/5">
          <span class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Resueltas</span>
          <div class="text-3xl font-extrabold text-emerald-400 font-heading">{{ stats?.resolvedReports || 0 }}</div>
          <span class="text-[11px] text-emerald-300/70 flex items-center gap-1">
            ✅ Reparación finalizada
          </span>
        </div>

        <!-- 6. Urgentes o Críticas -->
        <div class="glass-card p-5 space-y-2 border-rose-500/20 bg-rose-500/5">
          <span class="text-xs font-semibold text-rose-400 uppercase tracking-wider">Urgentes / Críticas</span>
          <div class="text-3xl font-extrabold text-rose-400 font-heading">{{ stats?.urgentOrCriticalReports || 0 }}</div>
          <span class="text-[11px] text-rose-300/70 flex items-center gap-1">
            ⚠️ Máxima prioridad
          </span>
        </div>

      </div>

      <!-- Main Section: Interactive Leaflet Map & Categories -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Interactive Map (2 Cols) -->
        <div class="lg:col-span-2 glass-card p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div>
              <h2 class="text-lg font-bold text-white font-heading flex items-center gap-2">
                <span>📍 Mapa Geográfico de Málaga (Coordenadas Reales)</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">Leaflet</span>
              </h2>
              <p class="text-xs text-slate-400">Puntos reales con radio de clustering de 40 metros generado por la IA.</p>
            </div>
            
            <div class="flex items-center gap-3 text-xs">
              <span class="flex items-center gap-1 text-amber-300">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pendiente
              </span>
              <span class="flex items-center gap-1 text-indigo-300">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> En Curso
              </span>
              <span class="flex items-center gap-1 text-emerald-300">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Resuelta
              </span>
            </div>
          </div>

          <div class="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-700/60 shadow-inner">
            <div #mapContainer class="w-full h-full"></div>
          </div>
        </div>

        <!-- Breakdown & Duplicates Summary (1 Col) -->
        <div class="space-y-6">
          
          <!-- Category Breakdown -->
          <div class="glass-card p-5 space-y-4">
            <h3 class="text-base font-bold text-white font-heading">Tipos de Incidencias Viales</h3>
            
            <div class="space-y-3">
              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-300">🕳️ Baches y Calzada</span>
                  <span class="text-sky-400">{{ stats?.categoryBreakdown?.pothole || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-sky-500 rounded-full" [style.width.%]="getPercent(stats?.categoryBreakdown?.pothole)"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-300">🚧 Carretera Dañada / Socavón</span>
                  <span class="text-indigo-400">{{ stats?.categoryBreakdown?.damaged_road || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="getPercent(stats?.categoryBreakdown?.damaged_road)"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-300">🛑 Señalización Afectada</span>
                  <span class="text-amber-400">{{ stats?.categoryBreakdown?.damaged_sign || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-amber-500 rounded-full" [style.width.%]="getPercent(stats?.categoryBreakdown?.damaged_sign)"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-300">⚠️ Accidente / Semáforo Caído</span>
                  <span class="text-rose-400">{{ stats?.categoryBreakdown?.traffic_accident || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full" [style.width.%]="getPercent(stats?.categoryBreakdown?.traffic_accident)"></div>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-300">⛔ Vía Bloqueada / Obstáculo</span>
                  <span class="text-purple-400">{{ stats?.categoryBreakdown?.blocked_road || 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div class="h-full bg-purple-500 rounded-full" [style.width.%]="getPercent(stats?.categoryBreakdown?.blocked_road)"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Duplicates Value Prop Card -->
          <div class="glass-card p-5 space-y-3 border-purple-500/30 bg-purple-950/20">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-purple-300 uppercase tracking-wider">Ahorro Administrativo</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">IA Clustering</span>
            </div>
            <div class="text-3xl font-extrabold text-white font-heading">{{ stats?.duplicatesMerged || 0 }}</div>
            <p class="text-xs text-purple-200/90 leading-relaxed">
              Reportes duplicados consolidados en una única orden de trabajo. Menos trámites repetidos y respuesta más rápida para el ciudadano.
            </p>
          </div>

        </div>
      </div>

      <!-- Recent Incidents Table with Search and Full Navigation -->
      <div class="glass-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white font-heading">Incidencias Viales Recientes</h2>
            <p class="text-xs text-slate-400">Datos en tiempo real extraídos directamente de la base de datos.</p>
          </div>
          <a routerLink="/reports" class="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
            <span>Ver catálogo completo</span>
            <span>&rarr;</span>
          </a>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-800/40">
              <tr>
                <th class="py-3 px-4">ID</th>
                <th class="py-3 px-4">Incidencia / Foto</th>
                <th class="py-3 px-4">Ubicación Real</th>
                <th class="py-3 px-4">Usuario Creador</th>
                <th class="py-3 px-4 text-center">Duplicados</th>
                <th class="py-3 px-4">Prioridad</th>
                <th class="py-3 px-4">Estado</th>
                <th class="py-3 px-4 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let report of stats?.recentReports" class="hover:bg-slate-800/40 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-sky-400">#{{ report.id }}</td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <img [src]="report.imageUrl" [alt]="report.title" class="w-10 h-10 rounded-lg object-cover border border-slate-700">
                    <div class="max-w-xs">
                      <div class="font-semibold text-slate-200 line-clamp-1">{{ report.title }}</div>
                      <div class="text-[11px] text-slate-400">{{ formatCategory(report.category) }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 text-slate-300">
                  <div class="font-medium line-clamp-1">{{ report.address }}</div>
                  <div class="text-[10px] text-slate-400">{{ report.neighborhood }}</div>
                </td>
                <td class="py-3 px-4 text-slate-300">
                  <div class="font-medium">{{ report.userFullName || 'Ciudadano' }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ report.userEmail }}</div>
                </td>
                <td class="py-3 px-4 text-center">
                  <span *ngIf="report.duplicateCount > 1" class="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    🔥 {{ report.duplicateCount }} avisos
                  </span>
                  <span *ngIf="report.duplicateCount <= 1" class="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                    1 aviso
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span class="badge" [ngClass]="'badge-' + report.priority.toLowerCase()">
                    {{ report.priority }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span class="badge" [ngClass]="getStatusBadgeClass(report.status)">
                    {{ getStatusLabel(report.status) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <a [routerLink]="['/reports', report.id]" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-medium transition-all">
                    Detalles
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  protected reportService = inject(ReportService);
  protected authService = inject(AuthService);

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private markers: L.LayerGroup | null = null;

  stats: DashboardStats | null = null;
  simulating = false;
  demoAlert: string | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  loadDashboardData(): void {
    this.reportService.getDashboard().subscribe((data) => {
      this.stats = data;
      this.renderMapMarkers();
    });
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    const malagaCenter: L.LatLngTuple = [36.72016, -4.42034];

    this.map = L.map(this.mapContainer.nativeElement, {
      center: malagaCenter,
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.markers = L.layerGroup().addTo(this.map);
    this.renderMapMarkers();
  }

  private renderMapMarkers(): void {
    if (!this.map || !this.markers || !this.stats?.recentReports) return;

    this.markers.clearLayers();

    this.stats.recentReports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      const color = report.status === 'Resolved' ? '#10b981' : (report.status === 'UnderReview' || report.status === 'InProgress') ? '#6366f1' : '#f59e0b';

      const iconHtml = `
        <div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 13px;">
          ${report.duplicateCount > 1 ? `<span style="color: white; font-weight: bold; font-size: 10px;">${report.duplicateCount}</span>` : '📍'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 13px; max-width: 220px; line-height: 1.4;">
          <strong style="color: #38bdf8; display: block; font-size: 14px; margin-bottom: 4px;">#${report.id} - ${report.title}</strong>
          <div style="margin-bottom: 6px; color: #94a3b8;">${report.address}</div>
          <img src="${report.imageUrl}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: ${color}25; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
              ${this.getStatusLabel(report.status)}
            </span>
            <span style="color: #c084fc; font-weight: bold; font-size: 11px;">
              🔥 ${report.duplicateCount} avisos
            </span>
          </div>
          <div style="margin-top: 8px; text-align: right;">
            <a href="/reports/${report.id}" style="color: #38bdf8; text-decoration: none; font-weight: bold; font-size: 12px;">Ver Ficha Completa &rarr;</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.markers!.addLayer(marker);

      if (report.duplicateCount > 1) {
        const clusterCircle = L.circle([report.latitude, report.longitude], {
          radius: 40,
          color: '#a855f7',
          fillColor: '#a855f7',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '4, 4',
        });
        this.markers!.addLayer(clusterCircle);
      }
    });
  }

  simulateDuplicateDemo(): void {
    this.simulating = true;
    const payload = {
      category: 'pothole',
      title: 'Bache reportado por vecino en Calle Larios',
      description: 'Hundimiento en el cruce de peatones frente a la tienda.',
      address: 'Calle Marqués de Larios, 14, Málaga',
      neighborhood: 'Centro Histórico',
      latitude: 36.71981,
      longitude: -4.42141,
      priority: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    };

    this.reportService.createReport(payload as any).subscribe({
      next: (res) => {
        this.simulating = false;
        if (res.isDuplicate) {
          this.demoAlert = `¡Éxito de Clustering! La IA agrupó el reporte en #${res.mergedIntoId}. Ahora tiene ${res.report.duplicateCount} avisos y su prioridad subió a ${res.report.priority}.`;
        } else {
          this.demoAlert = `¡Nuevo reporte registrado con éxito (#${res.report.id})!`;
        }
        this.loadDashboardData();
      },
      error: (err) => {
        this.simulating = false;
        console.error(err);
      }
    });
  }

  getPercent(val?: number): number {
    const total = this.stats?.totalReports || 1;
    return Math.round(((val || 0) / total) * 100);
  }

  formatCategory(cat: string): string {
    const map: Record<string, string> = {
      pothole: 'Bache en calzada',
      damaged_road: 'Carretera deteriorada',
      traffic_accident: 'Accidente / Semáforo',
      blocked_road: 'Vía cortada / Obstáculo',
      damaged_sign: 'Señal de tráfico',
      other_hazard: 'Otro peligro vial',
    };
    return map[cat] || cat;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      Submitted: 'Pendiente',
      UnderReview: 'En Revisión',
      InProgress: 'En Curso',
      Resolved: 'Resuelta',
    };
    return map[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      Submitted: 'badge-pending',
      UnderReview: 'badge-reviewing',
      InProgress: 'badge-reviewing',
      Resolved: 'badge-resolved',
    };
    return map[status] || 'badge-low';
  }
}
