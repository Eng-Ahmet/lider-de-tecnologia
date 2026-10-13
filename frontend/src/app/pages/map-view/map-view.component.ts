import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { Report } from '../../core/models/report.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="h-[calc(100vh-65px)] flex flex-col relative overflow-hidden">
      
      <!-- Floating Top Filter Bar -->
      <div class="absolute top-4 left-4 right-4 z-20 max-w-5xl mx-auto flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl">
        <div class="flex items-center gap-2">
          <span class="text-lg">🗺️</span>
          <div>
            <h2 class="text-xs font-bold text-white font-heading">Mapa de Calor y Agrupación Espacial</h2>
            <p class="text-[10px] text-slate-400">Puntos de incidencias y áreas de clustering de 40 metros en Málaga</p>
          </div>
        </div>

        <!-- Filter buttons -->
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button (click)="filterStatus('all')"
                  [class.bg-sky-600]="activeFilter === 'all'"
                  [class.text-white]="activeFilter === 'all'"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all">
            Todos ({{ reports.length }})
          </button>
          <button (click)="filterStatus('Submitted')"
                  [class.bg-amber-600]="activeFilter === 'Submitted'"
                  [class.text-white]="activeFilter === 'Submitted'"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 text-amber-300 text-xs font-semibold hover:bg-slate-700 transition-all">
            Pendientes
          </button>
          <button (click)="filterStatus('UnderReview')"
                  [class.bg-indigo-600]="activeFilter === 'UnderReview'"
                  [class.text-white]="activeFilter === 'UnderReview'"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-semibold hover:bg-slate-700 transition-all">
            En Revisión
          </button>
          <button (click)="filterStatus('Resolved')"
                  [class.bg-emerald-600]="activeFilter === 'Resolved'"
                  [class.text-white]="activeFilter === 'Resolved'"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-300 text-xs font-semibold hover:bg-slate-700 transition-all">
          </button>
        </div>
      </div>

      <!-- Map Container -->
      <div #mapContainer class="flex-1 w-full h-full z-10"></div>

    </div>
  `
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  private reportService = inject(ReportService);

  @ViewChild('mapContainer') mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;

  reports: Report[] = [];
  activeFilter = 'all';

  ngOnInit(): void {
    this.reportService.getReports().subscribe((data) => {
      this.reports = data;
      this.renderMarkers();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [36.7213, -4.4214],
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers();
  }

  filterStatus(status: string): void {
    this.activeFilter = status;
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const filtered = this.activeFilter === 'all'
      ? this.reports
      : this.reports.filter(r => r.status === this.activeFilter);

    filtered.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      const color = report.status === 'Resolved' ? '#10b981' : (report.status === 'UnderReview' || report.status === 'InProgress') ? '#6366f1' : '#f59e0b';

      const iconHtml = `
        <div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 13px;">
          ${report.duplicateCount > 1 ? `<span style="color: white; font-weight: 800; font-size: 11px;">${report.duplicateCount}</span>` : '📍'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 13px; max-width: 240px;">
          <h4 style="color: #38bdf8; font-weight: bold; margin: 0 0 4px 0;">#${report.id} - ${report.title}</h4>
          <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 12px;">${report.neighborhood}</p>
          <img src="${report.imageUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              ${report.status.toUpperCase()}
            </span>
            <span style="font-size: 11px; color: #c084fc; font-weight: bold;">
              🔥 ${report.duplicateCount} avisos agrupados
            </span>
          </div>
          <a href="/reports/${report.id}" style="display: block; text-align: center; background: #0284c7; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            Ver Detalles Completos
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersLayer!.addLayer(marker);

      // Cluster zone circle
      if (report.duplicateCount > 1) {
        const circle = L.circle([report.latitude, report.longitude], {
          radius: 40,
          color: '#a855f7',
          fillColor: '#a855f7',
          fillOpacity: 0.18,
          weight: 2,
        });
        this.markersLayer!.addLayer(circle);
      }
    });
  }
}
