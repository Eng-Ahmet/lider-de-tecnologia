import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { Report, IncidentPriority } from '../../core/models/report.model';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      
      <!-- Top Title and Action -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
            📋 Catálogo de Incidencias Viales
          </h1>
          <p class="text-slate-300 text-sm">
            Listado completo de incidencias reportadas en Málaga con geolocalización, autoría y estados.
          </p>
        </div>

        <a routerLink="/reports/new"
           class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-105">
          <span>+ Nueva Incidencia</span>
        </a>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="glass-card p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          <!-- Search input -->
          <div class="relative lg:col-span-2">
            <span class="absolute left-3 top-2.5 text-slate-400">🔍</span>
            <input type="text" [(ngModel)]="filters.search" (input)="applyFilters()" placeholder="Buscar por calle, barrio, creador o ID..."
                   class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
          </div>

          <!-- Status filter -->
          <div>
            <select [(ngModel)]="filters.status" (change)="applyFilters()"
                    class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
              <option value="all">Todos los Estados</option>
              <option value="Submitted">⏳ Pendiente (Submitted)</option>
              <option value="UnderReview">🔍 En Revisión (UnderReview)</option>
              <option value="InProgress">🛠️ En Curso (InProgress)</option>
              <option value="Resolved">✅ Resuelta (Resolved)</option>
            </select>
          </div>

          <!-- Category filter -->
          <div>
            <select [(ngModel)]="filters.category" (change)="applyFilters()"
                    class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
              <option value="all">Todas las Categorías</option>
              <option value="pothole">🕳️ Baches y Calzada</option>
              <option value="damaged_road">🚧 Carretera Dañada</option>
              <option value="traffic_accident">⚠️ Accidente / Semáforo</option>
              <option value="blocked_road">⛔ Vía Bloqueada</option>
              <option value="damaged_sign">🛑 Señalización</option>
              <option value="other_hazard">📌 Otros Peligros</option>
            </select>
          </div>

          <!-- Priority filter -->
          <div>
            <select [(ngModel)]="filters.priority" (change)="applyFilters()"
                    class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
              <option value="all">Todas las Prioridades</option>
              <option value="Critical">🔴 Crítica</option>
              <option value="High">🟠 Alta</option>
              <option value="Medium">🟡 Media</option>
              <option value="Low">⚪ Baja</option>
            </select>
          </div>

        </div>

        <!-- Secondary Toolbar: My Reports Toggle & Sort -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-3">
            <!-- Toggle "Mis Reportes" if logged in -->
            <button *ngIf="authService.isLoggedIn()" (click)="toggleOnlyMine()" type="button"
                    [class.bg-sky-600]="filters.onlyMine"
                    [class.text-white]="filters.onlyMine"
                    [class.bg-slate-800]="!filters.onlyMine"
                    [class.text-slate-300]="!filters.onlyMine"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5">
              <span>👤</span>
              <span>{{ filters.onlyMine ? 'Mostrando: Mis Reportes' : 'Ver Sólo Mis Reportes' }}</span>
            </button>

            <span class="text-xs text-slate-400">
              Mostrando <strong class="text-sky-400">{{ filteredReports.length }}</strong> de {{ allReports.length }} incidencias
            </span>
          </div>

          <!-- Sort -->
          <div class="flex items-center gap-2 text-xs">
            <span class="text-slate-400">Ordenar por:</span>
            <select [(ngModel)]="sortBy" (change)="sortReports()"
                    class="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none">
              <option value="duplicates">🔥 Más Duplicados Agrupados</option>
              <option value="priority">⚠️ Mayor Prioridad</option>
              <option value="recent">🕒 Más Recientes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div class="glass-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-800/40">
              <tr>
                <th class="py-3.5 px-4">ID</th>
                <th class="py-3.5 px-4">Incidencia / Foto</th>
                <th class="py-3.5 px-4">Ubicación Real</th>
                <th class="py-3.5 px-4">Reportado Por</th>
                <th class="py-3.5 px-4 text-center">Duplicados</th>
                <th class="py-3.5 px-4">Prioridad</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let report of filteredReports" class="hover:bg-slate-800/30 transition-colors group">
                
                <td class="py-4 px-4 font-mono font-bold text-sky-400">
                  <a [routerLink]="['/reports', report.id]" class="hover:underline">
                    #{{ report.id }}
                  </a>
                </td>

                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <img [src]="report.imageUrl" [alt]="report.title" class="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md group-hover:scale-105 transition-transform">
                    <div class="space-y-0.5 max-w-xs">
                      <a [routerLink]="['/reports', report.id]" class="font-bold text-slate-200 hover:text-sky-400 transition-colors line-clamp-1">
                        {{ report.title }}
                      </a>
                      <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{{ formatCategory(report.category) }}</span>
                        <span>•</span>
                        <span *ngIf="report.aiConfidence" class="text-emerald-400 font-semibold">{{ (report.aiConfidence * 100).toFixed(0) }}% IA</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-4 text-slate-300">
                  <div class="font-medium line-clamp-1">{{ report.address }}</div>
                  <div class="text-[10px] text-slate-400">{{ report.neighborhood }}</div>
                </td>

                <td class="py-4 px-4 text-slate-300">
                  <div class="font-medium">{{ report.userFullName || 'Ciudadano' }}</div>
                  <div class="text-[10px] text-slate-400 font-mono">{{ report.userEmail }}</div>
                </td>

                <td class="py-4 px-4 text-center">
                  <div *ngIf="report.duplicateCount > 1" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    <span>🔥</span>
                    <span>{{ report.duplicateCount }} avisos</span>
                  </div>
                  <div *ngIf="report.duplicateCount <= 1" class="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                    1 aviso
                  </div>
                </td>

                <td class="py-4 px-4">
                  <span class="badge" [ngClass]="'badge-' + report.priority.toLowerCase()">
                    {{ report.priority }}
                  </span>
                </td>

                <td class="py-4 px-4">
                  <span class="badge" [ngClass]="getStatusBadgeClass(report.status)">
                    {{ getStatusLabel(report.status) }}
                  </span>
                </td>

                <td class="py-4 px-4 text-right">
                  <a [routerLink]="['/reports', report.id]"
                     class="px-3.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-semibold text-xs transition-all border border-sky-500/30">
                    Detalles &rarr;
                  </a>
                </td>

              </tr>

              <tr *ngIf="filteredReports.length === 0">
                <td colspan="8" class="py-12 text-center text-slate-400 space-y-2">
                  <div class="text-3xl">🔍</div>
                  <div class="font-bold text-slate-300">No se encontraron incidencias</div>
                  <p class="text-xs">Prueba a desactivar el filtro de "Mis reportes" o modificar la búsqueda.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class ReportListComponent implements OnInit {
  protected reportService = inject(ReportService);
  protected authService = inject(AuthService);

  allReports: Report[] = [];
  filteredReports: Report[] = [];

  filters = {
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
    neighborhood: 'all',
    onlyMine: false,
  };

  sortBy = 'duplicates';

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.reportService.getReports().subscribe((reports) => {
      this.allReports = reports;
      this.applyFilters();
    });
  }

  toggleOnlyMine(): void {
    this.filters.onlyMine = !this.filters.onlyMine;
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allReports];

    if (this.filters.onlyMine && this.authService.currentUser()) {
      result = result.filter(r => r.userId === this.authService.currentUser()?.id);
    }

    if (this.filters.status !== 'all') {
      result = result.filter(r => r.status === this.filters.status);
    }

    if (this.filters.category !== 'all') {
      result = result.filter(r => r.category === this.filters.category);
    }

    if (this.filters.priority !== 'all') {
      result = result.filter(r => r.priority === this.filters.priority);
    }

    if (this.filters.search.trim()) {
      const q = this.filters.search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.neighborhood && r.neighborhood.toLowerCase().includes(q)) ||
        (r.userFullName && r.userFullName.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q)
      );
    }

    this.filteredReports = result;
    this.sortReports();
  }

  sortReports(): void {
    if (this.sortBy === 'duplicates') {
      this.filteredReports.sort((a, b) => b.duplicateCount - a.duplicateCount);
    } else if (this.sortBy === 'priority') {
      const priorityOrder: Record<IncidentPriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      this.filteredReports.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
    } else {
      this.filteredReports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
