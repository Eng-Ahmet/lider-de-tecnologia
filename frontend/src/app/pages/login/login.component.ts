import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div class="glass-card max-w-md w-full p-8 space-y-6 border-slate-700/80 shadow-2xl relative">
        
        <!-- Header -->
        <div class="text-center space-y-2">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-sky-500/25">
            📢
          </div>
          <h1 class="text-2xl font-extrabold text-white font-heading tracking-tight">
            ¡Tu voz ha llegado!
          </h1>
          <p class="text-xs text-slate-400">
            Plataforma de Notificación de Incidencias Urbanas • Málaga Smart City
          </p>
        </div>

        <!-- Quick 1-Click Demo Login Bar for Evaluation Committee -->
        <div class="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
          <span class="text-[11px] font-bold text-sky-400 uppercase tracking-wider block text-center">
            ⚡ Acceso Rápido para el Jurado
          </span>
          <div class="grid grid-cols-2 gap-2">
            <button (click)="quickLogin('admin')" type="button"
                    class="py-2 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              <span>👑</span>
              <span>Admin Municipal</span>
            </button>
            <button (click)="quickLogin('user')" type="button"
                    class="py-2 px-3 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              <span>👤</span>
              <span>Vecino / Usuario</span>
            </button>
          </div>
        </div>

        <!-- Tab Toggle -->
        <div class="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800">
          <button (click)="isRegister = false; error = null" type="button"
                  [class.bg-sky-600]="!isRegister"
                  [class.text-white]="!isRegister"
                  class="flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 transition-all">
            Iniciar Sesión
          </button>
          <button (click)="isRegister = true; error = null" type="button"
                  [class.bg-sky-600]="isRegister"
                  [class.text-white]="isRegister"
                  class="flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 transition-all">
            Registrarse
          </button>
        </div>

        <!-- Error Alert -->
        <div *ngIf="error" class="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- Login Form -->
        <form *ngIf="!isRegister" (ngSubmit)="submitLogin()" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Correo Electrónico</label>
            <input type="email" [(ngModel)]="loginEmail" name="loginEmail" required placeholder="admin@callefix.malaga.es"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Contraseña</label>
            <input type="password" [(ngModel)]="loginPassword" name="loginPassword" required placeholder="••••••••"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <button type="submit" [disabled]="loading"
                  class="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] disabled:opacity-50">
            {{ loading ? 'Autenticando...' : 'Iniciar Sesión' }}
          </button>
        </form>

        <!-- Register Form -->
        <form *ngIf="isRegister" (ngSubmit)="submitRegister()" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Nombre Completo</label>
            <input type="text" [(ngModel)]="regFullName" name="regFullName" required placeholder="Juan Pérez"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Correo Electrónico</label>
            <input type="email" [(ngModel)]="regEmail" name="regEmail" required placeholder="juan.perez@ejemplo.es"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Teléfono (Opcional)</label>
            <input type="tel" [(ngModel)]="regPhone" name="regPhone" placeholder="+34 600 00 00 00"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Contraseña (Mínimo 6 caracteres)</label>
            <input type="password" [(ngModel)]="regPassword" name="regPassword" required placeholder="••••••••"
                   class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 outline-none">
          </div>

          <button type="submit" [disabled]="loading"
                  class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] disabled:opacity-50">
            {{ loading ? 'Creando cuenta...' : 'Crear Cuenta de Ciudadano' }}
          </button>
        </form>

      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isRegister = false;
  loading = false;
  error: string | null = null;

  loginEmail = 'admin@callefix.malaga.es';
  loginPassword = 'Admin123!';

  regFullName = '';
  regEmail = '';
  regPhone = '';
  regPassword = '';

  private getReturnUrl(): string {
    return this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  quickLogin(type: 'admin' | 'user'): void {
    this.loading = true;
    this.error = null;
    if (type === 'admin') {
      this.loginEmail = 'admin@callefix.malaga.es';
      this.loginPassword = 'Admin123!';
    } else {
      this.loginEmail = 'vecino@malaga.es';
      this.loginPassword = 'Vecino123!';
    }

    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.getReturnUrl());
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al iniciar sesión';
      }
    });
  }

  submitLogin(): void {
    this.loading = true;
    this.error = null;
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.getReturnUrl());
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al iniciar sesión';
      }
    });
  }

  submitRegister(): void {
    this.loading = true;
    this.error = null;
    this.authService.register({
      fullName: this.regFullName,
      email: this.regEmail,
      phoneNumber: this.regPhone,
      password: this.regPassword,
      role: 'User'
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al registrar usuario';
      }
    });
  }
}
