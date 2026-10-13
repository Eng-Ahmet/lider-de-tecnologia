import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-all">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        <!-- Logo & Branding -->
        <a routerLink="/dashboard" class="flex items-center gap-2.5 sm:gap-3 group text-decoration-none">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform flex-shrink-0 p-1">
            <img src="/favicon.svg" alt="CalleFix AI" class="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="font-extrabold text-base sm:text-lg tracking-tight text-white font-heading">¡Tu voz ha llegado!</span>
              <span class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 hidden xs:inline">4880</span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium hidden md:block">CalleFix AI • Sistema de Detección de Incidencias Urbanas</p>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          <a routerLink="/dashboard" routerLinkActive="bg-sky-600 text-white font-semibold shadow-sm" [routerLinkActiveOptions]="{exact: true}"
             class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
            📊 Panel
          </a>
          <a routerLink="/reports" routerLinkActive="bg-sky-600 text-white font-semibold shadow-sm"
             class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
            📋 Incidencias
          </a>
          <a routerLink="/map" routerLinkActive="bg-sky-600 text-white font-semibold shadow-sm"
             class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
            🗺️ Mapa
          </a>
        </nav>

        <!-- Right: Actions & User Info -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <!-- System Status Pill -->
          <div class="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
            <span class="w-2 h-2 rounded-full" [ngClass]="apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
            <span>API: 3880</span>
          </div>

          <!-- New Report CTA -->
          <a routerLink="/reports/new"
             class="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/30 transition-all hover:scale-105 min-h-[38px]">
            <span class="text-sm">+</span>
            <span class="hidden sm:inline">Reportar</span>
          </a>

          <!-- User Profile / Switcher -->
          <div *ngIf="authService.isLoggedIn(); else loginButton" class="flex items-center gap-1.5 sm:gap-2">
            
            <div class="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <span class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="authService.isAdmin() ? 'bg-purple-400' : 'bg-sky-400'"></span>
              <span class="font-bold text-slate-200 hidden lg:inline max-w-[120px] truncate">{{ authService.currentUser()?.fullName }}</span>
              <span class="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase"
                    [ngClass]="authService.isAdmin() ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'">
                {{ authService.isAdmin() ? 'ADMIN' : 'VECINO' }}
              </span>
            </div>

            <!-- Role switch for evaluation -->
            <button *ngIf="!authService.isAdmin()" (click)="authService.loginAsDemoAdmin()" title="Cambiar a Administrador"
                    class="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 min-h-[36px]" type="button">
              <span class="hidden sm:inline">👑 Admin</span>
              <span class="sm:hidden">👑</span>
            </button>
            <button *ngIf="authService.isAdmin()" (click)="authService.loginAsDemoUser()" title="Cambiar a Vecino"
                    class="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 min-h-[36px]" type="button">
              <span class="hidden sm:inline">👤 Vecino</span>
              <span class="sm:hidden">👤</span>
            </button>

            <!-- Logout -->
            <button (click)="logout()" title="Cerrar sesión"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 text-xs transition-colors min-h-[36px] flex items-center justify-center">
              🚪
            </button>
          </div>

          <ng-template #loginButton>
            <a routerLink="/login"
               class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all">
              Entrar
            </a>
          </ng-template>

          <!-- Mobile Hamburger Toggle -->
          <button (click)="mobileMenuOpen = !mobileMenuOpen" type="button"
                  class="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center justify-center min-h-[38px] min-w-[38px]">
            {{ mobileMenuOpen ? '✕' : '☰' }}
          </button>

        </div>

      </div>

      <!-- Mobile Navigation Drawer -->
      <div *ngIf="mobileMenuOpen" class="md:hidden pt-3 pb-2 space-y-1 border-t border-slate-800 mt-2.5 animate-fade-in">
        <a routerLink="/dashboard" (click)="mobileMenuOpen = false" routerLinkActive="bg-sky-600 text-white font-bold" [routerLinkActiveOptions]="{exact: true}"
           class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all">
          <span>📊</span>
          <span>Panel de Control (Dashboard)</span>
        </a>
        <a routerLink="/reports" (click)="mobileMenuOpen = false" routerLinkActive="bg-sky-600 text-white font-bold"
           class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all">
          <span>📋</span>
          <span>Catálogo de Incidencias</span>
        </a>
        <a routerLink="/map" (click)="mobileMenuOpen = false" routerLinkActive="bg-sky-600 text-white font-bold"
           class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all">
          <span>🗺️</span>
          <span>Mapa Geográfico Completo</span>
        </a>
        <a routerLink="/reports/new" (click)="mobileMenuOpen = false" routerLinkActive="bg-sky-600 text-white font-bold"
           class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-sky-400 hover:bg-slate-800 transition-all">
          <span>+</span>
          <span>Registrar Nueva Incidencia</span>
        </a>
      </div>
    </header>
  `
})
export class NavbarComponent implements OnInit {
  protected reportService = inject(ReportService);
  protected authService = inject(AuthService);
  private router = inject(Router);

  apiOnline = false;
  mobileMenuOpen = false;

  ngOnInit(): void {
    this.reportService.checkHealth().subscribe({
      next: (res) => {
        this.apiOnline = res.status === 'ok';
      },
      error: () => {
        this.apiOnline = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
