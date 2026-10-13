import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { Report, IncidentStatus } from '../../core/models/report.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div *ngIf="loading" class="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 space-y-4">
      <div class="text-3xl animate-spin">🔄</div>
      <p class="text-sm font-semibold text-slate-200">Cargando detalles de la incidencia...</p>
      <p class="text-xs text-slate-500">Conectando con la API municipal de Málaga...</p>
    </div>

    <div *ngIf="!loading && !report" class="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
      <div class="text-4xl">⚠️</div>
      <h2 class="text-xl font-bold text-white font-heading">{{ loadError || 'Incidencia no encontrada' }}</h2>
      <p class="text-xs text-slate-400 max-w-md mx-auto">
        No se pudo recuperar la información de la incidencia. Puede haber sido resuelta, archivada o el identificador no existe.
      </p>
      <div class="flex items-center justify-center gap-3 pt-2">
        <button *ngIf="currentId" (click)="retryLoad()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all">
          <span>🔄</span>
          <span>Reintentar Carga</span>
        </button>
        <a routerLink="/reports" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs inline-block shadow-lg shadow-sky-600/20 transition-all">
          Volver a la lista
        </a>
      </div>
    </div>

    <div *ngIf="!loading && report" class="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      <!-- Top Navigation & Status Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div class="space-y-1">
          <a routerLink="/reports" class="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition-colors">
            <span>&larr;</span>
            <span>Volver al catálogo</span>
          </a>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            #{{ report.id }} • {{ report.title }}
          </h1>
          <p class="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span>📍 {{ report.address }}</span>
            <span>•</span>
            <span>Registrado el {{ formatDate(report.createdAt) }} por <strong>{{ report.userFullName || 'Ciudadano' }}</strong></span>
          </p>
        </div>

        <!-- Badges summary -->
        <div class="flex items-center gap-2 flex-wrap">
          <span *ngIf="report.duplicateCount > 1" class="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/10">
            <span>🔥</span>
            <span>{{ report.duplicateCount }} Reportes Agrupados</span>
          </span>

          <span class="badge" [ngClass]="'badge-' + report.priority.toLowerCase()">
            Prioridad {{ report.priority }}
          </span>

          <span class="badge" [ngClass]="getStatusBadgeClass(report.status)">
            {{ getStatusLabel(report.status) }}
          </span>
        </div>
      </div>

      <!-- Main 2-Column Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left: Image, Map, Audit Log & Clustered Reports (2 Cols) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Image Box -->
          <div class="glass-card overflow-hidden space-y-4 p-4">
            <div class="relative w-full h-[360px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
              <img [src]="report.imageUrl" [alt]="report.title" class="w-full h-full object-cover">
              
              <div class="absolute top-4 left-4 flex flex-col gap-2">
                <span class="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-sky-300 border border-sky-400/40 text-xs font-bold flex items-center gap-1.5 shadow-xl">
                  <span>📷</span>
                  <span>Evidencia Fotográfica: {{ formatCategory(report.category) }}</span>
                </span>

                <span class="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/60 text-xs font-medium flex items-center gap-1.5 shadow-xl">
                  <span>🛠️</span>
                  <span>Cuadrilla de Obras Municipales</span>
                </span>
              </div>

              <div *ngIf="report.clusterId" class="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-purple-300 border border-purple-400/40 text-xs font-mono font-bold shadow-xl">
                Cluster: {{ report.clusterId }}
              </div>
            </div>

            <!-- Description -->
            <div class="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 space-y-1.5">
              <span class="text-xs font-semibold text-slate-400">Descripción detallada del incidente:</span>
              <p class="text-sm text-slate-200 leading-relaxed">{{ report.description }}</p>
            </div>
          </div>

          <!-- Mini Leaflet Map -->
          <div class="glass-card p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white font-heading flex items-center gap-1.5">
                <span>📍 Ubicación Geográfica en Málaga</span>
              </h3>
              <span class="text-xs font-mono text-slate-400">Lat: {{ report.latitude.toFixed(5) }}, Lon: {{ report.longitude.toFixed(5) }}</span>
            </div>
            
            <div class="relative w-full h-56 rounded-xl overflow-hidden border border-slate-700">
              <div #miniMapContainer class="w-full h-full"></div>
            </div>
          </div>

          <!-- Section: Audit Log / Status Change History (Required in Section 7) -->
          <div class="glass-card p-6 space-y-4">
            <h3 class="text-base font-bold text-white font-heading flex items-center gap-2">
              <span>📜</span>
              <span>Historial de Auditoría de Estados</span>
            </h3>

            <div class="space-y-3">
              <div *ngFor="let h of report.statusHistory" class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 font-semibold text-slate-200">
                    <span class="text-indigo-400">{{ h.changedByName }}</span>
                    <span class="text-slate-500">&bull;</span>
                    <span class="badge" [ngClass]="getStatusBadgeClass(h.newStatus)">{{ getStatusLabel(h.newStatus) }}</span>
                  </div>
                  <span class="text-[11px] text-slate-400">{{ formatDate(h.timestamp) }}</span>
                </div>
                <p *ngIf="h.note" class="text-slate-300 italic pt-1">{{ h.note }}</p>
              </div>

              <div *ngIf="!report.statusHistory || report.statusHistory.length === 0" class="text-xs text-slate-500 italic">
                Sin cambios de estado previos.
              </div>
            </div>
          </div>

          <!-- Section: Clustered Submissions from Neighbors -->
          <div class="glass-card p-6 space-y-5 border-purple-500/30 bg-purple-950/10">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
              <div>
                <h3 class="text-base font-bold text-white font-heading flex items-center gap-2">
                  <span>🤝</span>
                  <span>Reportes Vecinales Agrupados en este Punto</span>
                </h3>
                <p class="text-xs text-purple-200/80">
                  La IA detectó coincidencias geográficas (< 40m) y unificó los partes para ahorrar trámites a la cuadrilla municipal.
                </p>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {{ report.submissions?.length || 0 }} envíos registrados
              </span>
            </div>

            <div *ngIf="report.submissions && report.submissions.length > 0" class="space-y-3">
              <div *ngFor="let sub of report.submissions; let i = index"
                   class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-purple-500/40 transition-colors">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[10px] flex items-center justify-center">
                      #{{ i + 1 }}
                    </span>
                    <strong class="text-slate-200">{{ sub.citizenName || 'Ciudadano' }}</strong>
                  </div>
                  <span class="text-slate-400 text-[11px]">{{ formatDate(sub.submittedAt) }}</span>
                </div>
                <p class="text-xs text-slate-300 italic bg-slate-800/40 p-2.5 rounded-lg border-l-2 border-purple-500">
                  "{{ sub.description }}"
                </p>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Status Tracking & Management (Section 7) -->
        <div class="space-y-6">
          
          <!-- Lifecycle Progress Tracker -->
          <div class="glass-card p-6 space-y-4">
            <h3 class="text-base font-bold text-white font-heading">Ciclo de Vida de la Incidencia</h3>

            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      [ngClass]="'bg-emerald-500 text-white'">✓</span>
                <div>
                  <div class="text-xs font-bold text-slate-200">1. Registrada (Submitted)</div>
                  <div class="text-[10px] text-slate-400">{{ formatDate(report.createdAt) }}</div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      [ngClass]="isStepActive(report.status, ['UnderReview', 'InProgress', 'Resolved']) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'">
                  2
                </span>
                <div>
                  <div class="text-xs font-bold text-slate-200">2. En Revisión (UnderReview)</div>
                  <div class="text-[10px] text-slate-400">Inspección técnica municipal</div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      [ngClass]="isStepActive(report.status, ['InProgress', 'Resolved']) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'">
                  3
                </span>
                <div>
                  <div class="text-xs font-bold text-slate-200">3. En Curso (InProgress)</div>
                  <div class="text-[10px] text-slate-400">Cuadrilla operando en la calzada</div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      [ngClass]="report.status === 'Resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'">
                  4
                </span>
                <div>
                  <div class="text-xs font-bold text-slate-200">4. Resuelta (Resolved)</div>
                  <div class="text-[10px] text-slate-400">{{ report.resolvedAt ? formatDate(report.resolvedAt) : 'Pendiente de cierre' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Municipal Operator Action Box (Admin Protected) -->
          <div *ngIf="authService.isAdmin()" class="glass-card p-6 space-y-5 border-purple-500/40 bg-slate-900/90 shadow-2xl">
            <div class="space-y-1 pb-3 border-b border-slate-800">
              <span class="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Acción Exclusiva de Administrador</span>
              <h3 class="text-base font-bold text-white font-heading">Actualizar Estado y Auditar</h3>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-semibold text-slate-300">Seleccionar Nuevo Estado:</label>
              
              <div class="grid grid-cols-1 gap-2">
                <button type="button" (click)="selectedStatus = 'Submitted'"
                        [class.ring-2]="selectedStatus === 'Submitted'"
                        [class.ring-amber-400]="selectedStatus === 'Submitted'"
                        class="p-2.5 rounded-xl bg-slate-800 text-left border border-slate-700 text-xs flex items-center justify-between">
                  <span class="font-bold text-amber-400">Submitted (Pendiente)</span>
                </button>

                <button type="button" (click)="selectedStatus = 'UnderReview'"
                        [class.ring-2]="selectedStatus === 'UnderReview'"
                        [class.ring-indigo-400]="selectedStatus === 'UnderReview'"
                        class="p-2.5 rounded-xl bg-slate-800 text-left border border-slate-700 text-xs flex items-center justify-between">
                  <span class="font-bold text-indigo-400">UnderReview (En Revisión)</span>
                </button>

                <button type="button" (click)="selectedStatus = 'InProgress'"
                        [class.ring-2]="selectedStatus === 'InProgress'"
                        [class.ring-sky-400]="selectedStatus === 'InProgress'"
                        class="p-2.5 rounded-xl bg-slate-800 text-left border border-slate-700 text-xs flex items-center justify-between">
                  <span class="font-bold text-sky-400">InProgress (En Curso)</span>
                </button>

                <button type="button" (click)="selectedStatus = 'Resolved'"
                        [class.ring-2]="selectedStatus === 'Resolved'"
                        [class.ring-emerald-400]="selectedStatus === 'Resolved'"
                        class="p-2.5 rounded-xl bg-slate-800 text-left border border-slate-700 text-xs flex items-center justify-between">
                  <span class="font-bold text-emerald-400">Resolved (Resuelta ✅)</span>
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Nota del Técnico para la Auditoría:</label>
              <textarea [(ngModel)]="operatorNote" rows="3" placeholder="Detalla la acción realizada por la cuadrilla municipal..."
                        class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-purple-500 outline-none"></textarea>
            </div>

            <button (click)="updateStatus()" [disabled]="updating"
                    class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2">
              <span *ngIf="updating" class="animate-spin">🔄</span>
              <span>{{ updating ? 'Actualizando...' : 'Guardar Cambio y Notificar por Email' }}</span>
            </button>

            <div *ngIf="updateSuccessMessage" class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
              {{ updateSuccessMessage }}
            </div>
          </div>

          <!-- Non-admin notification -->
          <div *ngIf="!authService.isAdmin()" class="glass-card p-5 space-y-2 border-slate-800 text-center">
            <span class="text-2xl">🔒</span>
            <h4 class="text-xs font-bold text-slate-300">Modo Solo Lectura Ciudadano</h4>
            <p class="text-[11px] text-slate-400">
              Inicia sesión como Administrador Municipal (o usa el botón superior) para cambiar el estado o asignar cuadrillas.
            </p>
          </div>

        </div>

      </div>

    </div>
  `
})
export class ReportDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  protected route = inject(ActivatedRoute);
  protected reportService = inject(ReportService);
  protected authService = inject(AuthService);

  @ViewChild('miniMapContainer') miniMapContainer!: ElementRef;
  private miniMap: L.Map | null = null;

  report: Report | null = null;
  loading = true;
  loadError: string | null = null;
  currentId: string | null = null;
  selectedStatus: IncidentStatus = 'Submitted';
  operatorNote = '';
  updating = false;
  updateSuccessMessage: string | null = null;
  private watchdogTimer: any = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('🔍 [ReportDetail] Parámetro de ruta detectado:', id);
      if (id) {
        this.currentId = id;
        this.loadReport(id);
      } else {
        console.warn('⚠️ [ReportDetail] No se encontró el parámetro ID en la URL');
        this.loading = false;
        this.loadError = 'Identificador de incidencia no especificado.';
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.report) {
      this.initMiniMap();
    }
  }

  ngOnDestroy(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
    if (this.miniMap) {
      this.miniMap.remove();
    }
  }

  retryLoad(): void {
    if (this.currentId) {
      this.loadReport(this.currentId);
    }
  }

  loadReport(id: string): void {
    this.loading = true;
    this.loadError = null;
    console.log(`📡 [ReportDetail] Solicitando detalles de #${id} al servidor...`);

    // Safety watchdog: ensure loading spinner never hangs indefinitely
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      if (this.loading) {
        console.warn(`⏱️ [ReportDetail] Tiempo de espera agotado al cargar #${id}`);
        this.loading = false;
        if (!this.report) {
          this.loadError = 'La conexión tardó demasiado tiempo. Por favor pulse Reintentar.';
        }
      }
    }, 7000);

    this.reportService.getReportById(id).subscribe({
      next: (data) => {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.loading = false;
        this.report = data;
        if (data) {
          console.log(`✅ [ReportDetail] Incidencia #${id} cargada exitosamente:`, data.title);
          this.selectedStatus = data.status;
          this.operatorNote = data.resolutionNotes || '';
          setTimeout(() => {
            try {
              this.initMiniMap();
            } catch (mapErr) {
              console.warn('⚠️ [ReportDetail] Error inicializando mini-mapa:', mapErr);
            }
          }, 150);
        } else {
          console.warn(`⚠️ [ReportDetail] El servidor no encontró la incidencia #${id}`);
          this.loadError = `Incidencia #${id} no encontrada en la base de datos municipal.`;
        }
      },
      error: (err) => {
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.loading = false;
        this.report = null;
        console.error(`❌ [ReportDetail] Error HTTP al cargar #${id}:`, err);
        this.loadError = 'Error de comunicación con el servidor backend.';
      }
    });
  }

  private initMiniMap(): void {
    if (!this.miniMapContainer?.nativeElement || !this.report) return;

    if (this.miniMap) {
      this.miniMap.remove();
      this.miniMap = null;
    }

    const containerEl = this.miniMapContainer.nativeElement as any;
    if (containerEl._leaflet_id) {
      delete containerEl._leaflet_id;
    }

    const pos: L.LatLngTuple = [this.report.latitude, this.report.longitude];

    this.miniMap = L.map(this.miniMapContainer.nativeElement, {
      center: pos,
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.miniMap);

    const marker = L.marker(pos).addTo(this.miniMap);
    marker.bindPopup(`<strong>#${this.report.id}</strong><br>${this.report.address}`).openPopup();

    L.circle(pos, {
      radius: 40,
      color: '#a855f7',
      fillColor: '#a855f7',
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(this.miniMap);
  }

  updateStatus(): void {
    if (!this.report) return;

    this.updating = true;
    this.updateSuccessMessage = null;

    this.reportService.updateReportStatus(this.report.id, this.selectedStatus, this.operatorNote).subscribe({
      next: (res) => {
        this.updating = false;
        this.report = res.report;
        this.updateSuccessMessage = `¡Estado actualizado a "${this.getStatusLabel(this.selectedStatus)}" y registrado en el historial de auditoría!`;
      },
      error: (err) => {
        this.updating = false;
        alert(err.error?.error || 'Error al actualizar estado.');
      }
    });
  }

  isStepActive(current: IncidentStatus, targetStatuses: IncidentStatus[]): boolean {
    return targetStatuses.includes(current);
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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
