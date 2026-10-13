import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';
import { LocationAIService, LocationEvaluation } from '../../core/services/location-ai.service';
import { SPAIN_PROVINCES, SpainProvince } from '../../core/data/spain-geo.data';
import { IncidentCategory, IncidentPriority } from '../../core/models/report.model';
import * as L from 'leaflet';

interface DemoPreset {
  id: string;
  name: string;
  category: IncidentCategory;
  province: string;
  city: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  description: string;
}

@Component({
  selector: 'app-report-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      <!-- Page Header -->
      <div class="space-y-1.5 sm:space-y-2">
        <a routerLink="/reports" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors">
          <span>&larr;</span>
          <span>Volver al catálogo</span>
        </a>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
          📢 Reportar Nueva Incidencia Vial
        </h1>
        <p class="text-slate-300 text-xs sm:text-sm">
          Registra un desperfecto en la vía pública con geolocalización precisa y evidencia fotográfica para las cuadrillas municipales.
        </p>
      </div>

      <!-- Quick Preset Selector for Fast Hackathon Evaluation -->
      <div class="glass-card p-4 sm:p-5 space-y-3 border-sky-500/20 bg-sky-950/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span> Cargar Muestra Rápida de España
          </span>
          <span class="text-[10px] sm:text-[11px] text-slate-400">Autocompleta cascada y mapa</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          <button *ngFor="let preset of presets" (click)="applyPreset(preset)" type="button"
                  [class.ring-2]="selectedPresetId === preset.id"
                  [class.ring-sky-400]="selectedPresetId === preset.id"
                  class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-left border border-slate-700/50 transition-all flex flex-col gap-1.5 sm:gap-2 group">
            <img [src]="preset.imageUrl" [alt]="preset.name" class="w-full h-14 sm:h-16 object-cover rounded-lg group-hover:scale-105 transition-transform">
            <div>
              <div class="font-bold text-[10px] sm:text-[11px] text-slate-200 line-clamp-1">{{ preset.name }}</div>
              <div class="text-[9px] sm:text-[10px] text-slate-400">{{ preset.city }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Main Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-6">
        
        <!-- Step 1: Evidencia Fotográfica (Sin IA) -->
        <div class="glass-card p-4 sm:p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm sm:text-base font-bold text-white font-heading flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/30">1</span>
              <span>Fotografía de la Incidencia (Evidencia Visual para Operarios)</span>
            </h2>
            <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">📸 Foto adjunta sin procesado de IA</span>
          </div>

          <!-- Upload Box -->
          <div class="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-4 group hover:border-sky-500 transition-colors">
            <img *ngIf="previewUrl" [src]="previewUrl" alt="Vista previa de la incidencia" class="absolute inset-0 w-full h-full object-cover">
            
            <div *ngIf="!previewUrl" class="text-center space-y-2 pointer-events-none">
              <span class="text-4xl text-slate-500">📸</span>
              <p class="text-xs text-slate-200 font-semibold">Haz clic aquí o arrastra una fotografía para adjuntarla</p>
              <p class="text-[11px] text-slate-400">La imagen sirve exclusivamente como evidencia visual para los operarios del Ayuntamiento</p>
            </div>

            <div *ngIf="previewUrl" class="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5 shadow-lg">
              <span>✅</span>
              <span>Fotografía adjunta correctamente</span>
            </div>

            <input type="file" (change)="onFileSelected($event)" accept="image/*"
                   class="absolute inset-0 opacity-0 cursor-pointer z-10" title="Seleccionar fotografía">
          </div>
        </div>

        <!-- Step 2: Spain Cascading Location Selectors & AI Location Evaluator -->
        <div class="glass-card p-4 sm:p-6 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 class="text-sm sm:text-base font-bold text-white font-heading flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/30">2</span>
              <span>Ubicación: España ➔ Provincia ➔ Municipio ➔ Dirección</span>
            </h2>

            <button (click)="detectGPSLocation()" type="button" [disabled]="detectingGPS"
                    class="px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto min-h-[38px]">
              <span>📍</span>
              <span>{{ detectingGPS ? 'Detectando GPS...' : 'Usar mi GPS actual' }}</span>
            </button>
          </div>

          <!-- Cascading Geographic Selectors -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            
            <!-- 1. Country (Default España 🇪🇸) -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <span>País</span>
                <span class="text-[10px] text-slate-500">(Predeterminado)</span>
              </label>
              <div class="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-slate-200 text-xs flex items-center gap-2 font-medium">
                <span class="text-base">🇪🇸</span>
                <span>España</span>
              </div>
            </div>

            <!-- 2. Province of Spain (Cascading Level 1) -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Provincia de España</label>
              <select [(ngModel)]="form.province" (change)="onProvinceChange()" name="province" required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
                <option *ngFor="let prov of provinces" [value]="prov.name">
                  {{ prov.name }} ({{ prov.region }})
                </option>
              </select>
            </div>

            <!-- 3. City / Municipality (Cascading Level 2) -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Ciudad / Municipio</label>
              <select [(ngModel)]="form.city" (change)="onCityChange()" name="city" required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
                <option *ngFor="let city of availableCities" [value]="city">
                  {{ city }}
                </option>
              </select>
            </div>

          </div>

          <!-- 4. Address Line (Calle, número y punto kilométrico) -->
          <div class="space-y-1.5 relative">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="text-xs font-semibold text-slate-300">Línea de Dirección (Address Line)</label>
              
              <!-- Direct GPS Button (User Request) -->
              <button (click)="detectGPSLocation()" type="button" [disabled]="detectingGPS"
                      class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                <span [class.animate-pulse]="detectingGPS">📍</span>
                <span>{{ detectingGPS ? 'Localizando GPS...' : 'Usar Mi Ubicación Actual' }}</span>
              </button>
            </div>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">🔍</span>
              <input type="text" [(ngModel)]="form.addressLine" (input)="onAddressLineInput()" name="addressLine" required
                     placeholder="Ej: Calle Marqués de Larios, 14 (o escribe para autocompletar)"
                     class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
            </div>

            <!-- Live Nominatim suggestions -->
            <div *ngIf="addressSuggestions.length > 0" class="absolute z-30 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              <button *ngFor="let sug of addressSuggestions" (click)="selectAddressSuggestion(sug)" type="button"
                      class="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-xs text-slate-200 border-b border-slate-800 last:border-0 flex items-center gap-2">
                <span>📍</span>
                <span class="line-clamp-1">{{ sug.displayName }}</span>
              </button>
            </div>
          </div>



          <!-- Interactive Leaflet Map with Draggable Pin -->
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center justify-between text-xs gap-1.5">
              <span class="text-slate-400">Arrastra el marcador o haz clic en el mapa para ajustar coordenadas:</span>
              <div class="flex items-center gap-2">
                <button type="button" (click)="setMalagaCenter()"
                        class="text-[10px] px-2 py-0.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 font-semibold cursor-pointer">
                  🎯 Centro (36.71982, -4.42139)
                </button>
                <span class="font-mono text-sky-400 font-semibold">{{ form.latitude.toFixed(5) }}, {{ form.longitude.toFixed(5) }}</span>
              </div>
            </div>
            <div class="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
              <div #createMapContainer class="w-full h-full"></div>
            </div>
          </div>

        </div>

        <!-- Step 3: Categorization & Description -->
        <div class="glass-card p-4 sm:p-6 space-y-4">
          <h2 class="text-sm sm:text-base font-bold text-white font-heading flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center border border-sky-500/30">3</span>
            <span>Categoría y Descripción del Incidente</span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Tipo de Incidencia</label>
              <select [(ngModel)]="form.category" name="category" required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
                <option value="pothole">🕳️ Bache o socavón en calzada</option>
                <option value="damaged_road">🚧 Carretera dañada / Grietas</option>
                <option value="traffic_accident">⚠️ Accidente / Semáforo derribado</option>
                <option value="blocked_road">⛔ Vía cortada / Obstáculo</option>
                <option value="damaged_sign">🛑 Señal de tráfico dañada</option>
                <option value="other_hazard">📌 Otro peligro vial</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Prioridad Estimada</label>
              <select [(ngModel)]="form.priority" name="priority" required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:border-sky-500 outline-none">
                <option value="Low">Baja — Molestia leve</option>
                <option value="Medium">Media — Tráfico regular</option>
                <option value="High">Alta — Peligro para vehículos / viandantes</option>
                <option value="Critical">Crítica — Riesgo inminente de accidente</option>
              </select>
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Título Breve del Reporte</label>
              <input type="text" [(ngModel)]="form.title" name="title" required placeholder="Ej: Bache profundo frente a parada de autobús"
                     class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-xs font-semibold text-slate-300">Descripción Detallada</label>
              <textarea [(ngModel)]="form.description" name="description" rows="3" required placeholder="Describe las dimensiones, si afecta a un carril completo, si hay peligro de tropiezo..."
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none"></textarea>
            </div>

          </div>
        </div>

        <!-- Submit Button (Responsive touch target) -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
          <a routerLink="/reports" class="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center transition-all">
            Cancelar
          </a>

          <button type="button" (click)="onSubmit()" [disabled]="submitting"
                  class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 min-h-[48px] cursor-pointer">
            <span *ngIf="submitting">Enviando reporte...</span>
            <span *ngIf="!submitting">📢 Registrar Incidencia Municipal</span>
          </button>
        </div>

      </form>

      <!-- Success Modal -->
      <div *ngIf="successModal" (click)="resetForm()" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div (click)="$event.stopPropagation()" class="glass-card max-w-lg w-full p-5 sm:p-6 space-y-5 border-sky-500/40 animate-scale-in">
          
          <div class="text-center space-y-2">
            <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl shadow-xl"
                 [ngClass]="successModal.isDuplicate ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'">
              {{ successModal.isDuplicate ? '🤝' : '✅' }}
            </div>
            <h3 class="text-xl font-bold text-white font-heading">
              {{ successModal.isDuplicate ? '¡Tu voz tiene más fuerza!' : '¡Incidencia Registrada con Éxito!' }}
            </h3>
            <p class="text-xs text-slate-300">
              {{ successModal.message }}
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-400">ID de Seguimiento:</span>
              <span class="font-mono font-bold text-sky-400">#{{ successModal.report.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Ubicación:</span>
              <span class="text-slate-200 font-semibold">{{ successModal.report.address }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Reportes agrupados:</span>
              <span class="text-purple-300 font-bold">🔥 {{ successModal.report.duplicateCount }} avisos</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Prioridad:</span>
              <span class="text-amber-400 font-bold">{{ successModal.report.priority }}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-3">
            <button (click)="navigateToReport(successModal.report.id)"
                    class="w-full sm:flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg transition-all text-center">
              Ver Ficha de la Incidencia
            </button>
            <button (click)="resetForm()"
                    class="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all">
              Crear Otra
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class ReportCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  protected reportService = inject(ReportService);
  protected authService = inject(AuthService);
  protected locationAIService = inject(LocationAIService);
  private router = inject(Router);

  @ViewChild('createMapContainer') createMapContainer!: ElementRef;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  provinces: SpainProvince[] = SPAIN_PROVINCES;
  availableCities: string[] = [];

  presets: DemoPreset[] = [
    {
      id: 'preset-larios',
      name: 'Bache Calle Larios',
      category: 'pothole',
      province: 'Málaga',
      city: 'Málaga (Centro Histórico)',
      addressLine: 'Calle Marqués de Larios, 14',
      latitude: 36.71982,
      longitude: -4.42139,
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      description: 'Hundimiento en el pavimento peatonal que provoca tropiezos continuos.'
    },
    {
      id: 'preset-teatinos',
      name: 'Señal en Teatinos',
      category: 'damaged_sign',
      province: 'Málaga',
      city: 'Málaga (Teatinos - Universidad)',
      addressLine: 'Bulevar Louis Pasteur, 28',
      latitude: 36.71721,
      longitude: -4.47148,
      imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
      description: 'Señal de tráfico doblada en el cruce de la universidad.'
    },
    {
      id: 'preset-malagueta',
      name: 'Zanja en Malagueta',
      category: 'damaged_road',
      province: 'Málaga',
      city: 'Málaga (La Malagueta - Este)',
      addressLine: 'Paseo Marítimo Ciudad de Melilla, 5',
      latitude: 36.71918,
      longitude: -4.40982,
      imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
      description: 'Zanja mal asfaltada con desprendimiento de grava junto al paseo.'
    },
    {
      id: 'preset-soho',
      name: 'Semáforo en Soho',
      category: 'traffic_accident',
      province: 'Málaga',
      city: 'Málaga (Soho - Puerto)',
      addressLine: 'Calle Tomás Heredia, 12',
      latitude: 36.7158,
      longitude: -4.4235,
      imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      description: 'Báculo semafórico colisionado y cables expuestos.'
    },
    {
      id: 'preset-alameda',
      name: 'Rama en Alameda',
      category: 'blocked_road',
      province: 'Málaga',
      city: 'Málaga (Centro Histórico)',
      addressLine: 'Alameda Principal, 18',
      latitude: 36.7179,
      longitude: -4.4248,
      imageUrl: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?auto=format&fit=crop&w=800&q=80',
      description: 'Gran rama caída atravesando los carriles principales.'
    }
  ];

  selectedPresetId: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  form = {
    title: '',
    category: 'pothole' as IncidentCategory,
    priority: 'High' as IncidentPriority,
    province: 'Málaga',
    city: 'Málaga (Centro Histórico)',
    addressLine: 'Calle Marqués de Larios, 14',
    latitude: 36.71982,
    longitude: -4.42139,
    description: '',
  };

  locationEvaluation: LocationEvaluation | null = null;
  addressSuggestions: { displayName: string; lat: number; lon: number }[] = [];
  searchTimeout: any;

  detectingGPS = false;
  submitting = false;
  successModal: any = null;

  ngOnInit(): void {
    this.updateAvailableCities();
    this.applyPreset(this.presets[0]);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 150);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  onProvinceChange(): void {
    this.updateAvailableCities();
    if (this.availableCities.length > 0) {
      this.form.city = this.availableCities[0];
    }
    const prov = this.provinces.find(p => p.name === this.form.province);
    if (prov) {
      this.form.latitude = prov.lat;
      this.form.longitude = prov.lng;
      this.updateMapMarker(prov.lat, prov.lng);
    }
    this.reevaluateLocation();
  }

  onCityChange(): void {
    this.reevaluateLocation();
  }

  private updateAvailableCities(): void {
    const prov = this.provinces.find(p => p.name === this.form.province);
    this.availableCities = prov ? prov.cities : [];
  }

  private reevaluateLocation(): void {
    this.locationEvaluation = this.locationAIService.evaluateLocation(
      this.form.addressLine,
      this.form.city,
      this.form.province
    );
    if (this.locationEvaluation.isHighPriorityZone && this.form.priority === 'Low') {
      this.form.priority = 'High';
    }
  }

  private initMap(): void {
    if (!this.createMapContainer?.nativeElement) return;

    const pos: L.LatLngTuple = [this.form.latitude, this.form.longitude];

    this.map = L.map(this.createMapContainer.nativeElement, {
      center: pos,
      zoom: 16,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.marker = L.marker(pos, { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const p = this.marker!.getLatLng();
      this.form.latitude = p.lat;
      this.form.longitude = p.lng;
      this.reverseGeocode(p.lat, p.lng);
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.form.latitude = e.latlng.lat;
      this.form.longitude = e.latlng.lng;
      this.marker?.setLatLng(e.latlng);
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
  }

  private updateMapMarker(lat: number, lon: number): void {
    if (!this.map || !this.marker) return;
    const pos: L.LatLngTuple = [lat, lon];
    this.marker.setLatLng(pos);
    this.map.setView(pos, 16);
  }

  onAddressLineInput(): void {
    clearTimeout(this.searchTimeout);
    this.reevaluateLocation();

    if (!this.form.addressLine || this.form.addressLine.length < 3) {
      this.addressSuggestions = [];
      return;
    }

    this.searchTimeout = setTimeout(() => {
      const q = `${this.form.addressLine}, ${this.form.city}, ${this.form.province}`;
      this.reportService.searchAddress(q).subscribe((res) => {
        this.addressSuggestions = res;
      });
    }, 400);
  }

  selectAddressSuggestion(sug: { displayName: string; lat: number; lon: number }): void {
    this.form.addressLine = sug.displayName.split(',')[0];
    this.form.latitude = sug.lat;
    this.form.longitude = sug.lon;
    this.addressSuggestions = [];
    this.updateMapMarker(sug.lat, sug.lon);
    this.reevaluateLocation();
  }

  detectGPSLocation(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    this.detectingGPS = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.detectingGPS = false;
        this.form.latitude = pos.coords.latitude;
        this.form.longitude = pos.coords.longitude;
        this.updateMapMarker(pos.coords.latitude, pos.coords.longitude);
        this.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        this.detectingGPS = false;
        console.warn('GPS error', err);
        alert('No se pudo obtener el GPS actual. Se ha posicionado en el centro de Málaga.');
        this.setMalagaCenter();
      }
    );
  }

  setMalagaCenter(): void {
    this.form.latitude = 36.71982;
    this.form.longitude = -4.42139;
    this.form.province = 'Málaga';
    this.updateAvailableCities();
    this.form.city = 'Málaga (Centro Histórico)';
    this.form.addressLine = 'Calle Marqués de Larios, 14';
    this.updateMapMarker(36.71982, -4.42139);
    this.reevaluateLocation();
  }

  private reverseGeocode(lat: number, lon: number): void {
    this.reportService.reverseGeocode(lat, lon).subscribe((addr) => {
      if (addr) {
        this.form.addressLine = addr.split(',')[0];
        this.reevaluateLocation();
      }
    });
  }

  applyPreset(preset: DemoPreset): void {
    this.selectedPresetId = preset.id;
    this.previewUrl = preset.imageUrl;
    this.selectedFile = null;

    this.form.title = preset.name;
    this.form.category = preset.category;
    this.form.province = preset.province;
    this.updateAvailableCities();
    this.form.city = preset.city;
    this.form.addressLine = preset.addressLine;
    this.form.latitude = preset.latitude;
    this.form.longitude = preset.longitude;
    this.form.description = preset.description;

    this.updateMapMarker(preset.latitude, preset.longitude);
    this.reevaluateLocation();
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.selectedPresetId = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (!this.form.title || this.form.title.trim().length < 3) {
      alert('Por favor ingrese un título válido (mínimo 3 caracteres).');
      return;
    }
    if (!this.form.description || this.form.description.trim().length < 5) {
      alert('Por favor describa la incidencia (mínimo 5 caracteres).');
      return;
    }
    if (!this.form.addressLine) {
      alert('Por favor indique la línea de dirección (calle y número).');
      return;
    }

    this.submitting = true;

    const fullAddress = `${this.form.addressLine}, ${this.form.city}, ${this.form.province}, España`;

    const formData = new FormData();
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    } else if (this.previewUrl) {
      formData.append('imageUrl', this.previewUrl);
    }

    formData.append('title', this.form.title.trim());
    formData.append('category', this.form.category);
    formData.append('priority', this.form.priority);
    formData.append('neighborhood', this.form.city);
    formData.append('address', fullAddress);
    formData.append('latitude', this.form.latitude.toString());
    formData.append('longitude', this.form.longitude.toString());
    formData.append('description', this.form.description.trim());
    formData.append('citizenEmail', 'a.h.ahmet.es@gmail.com');
    formData.append('citizenName', 'Ahmet (Líder Digital)');

    // Public report submission - direct send without required authentication
    this.sendReportFormData(formData);
  }

  private sendReportFormData(formData: FormData): void {
    this.reportService.createReport(formData).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successModal = res;
      },
      error: (err) => {
        this.submitting = false;
        console.error('Create report error:', err);
        alert(err.error?.error || 'Error al enviar el reporte. Por favor verifique los datos.');
      }
    });
  }

  navigateToReport(id: string): void {
    this.successModal = null;
    this.router.navigate(['/reports', id]);
  }

  resetForm(): void {
    this.successModal = null;
    this.applyPreset(this.presets[0]);
  }
}
