import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/report.model';
import { getApiBaseUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = getApiBaseUrl();

  private defaultAdminUser: User = {
    id: 'USR-AHMET-01',
    fullName: 'Ahmet (Líder Digital)',
    email: 'a.h.ahmet.es@gmail.com',
    phoneNumber: '+34 600 123 456',
    role: 'Administrator',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  private currentUserSignal = signal<User | null>(this.defaultAdminUser);
  readonly currentUser = this.currentUserSignal.asReadonly();
  // 100% Public Access - all permissions enabled by default
  readonly isLoggedIn = computed(() => true);
  readonly isAdmin = computed(() => true);

  constructor() {
    console.log(`🔐 [AuthService] Inicializado con API Base URL: ${this.apiUrl} (Modo 100% Público y Abierto)`);
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const userJson = localStorage.getItem('callefix_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSignal.set(user);
        console.log('👤 [AuthService] Sesión de usuario activa:', user.email);
        return;
      } catch {}
    }
    this.currentUserSignal.set(this.defaultAdminUser);
    localStorage.setItem('callefix_user', JSON.stringify(this.defaultAdminUser));
    localStorage.setItem('callefix_token', 'token-demo-public-access');
  }

  register(data: { fullName: string; email: string; password: string; phoneNumber?: string; role?: string }): Observable<AuthResponse> {
    console.log(`📝 [AuthService.register] Registrando usuario: ${data.email}`);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(res => {
        console.log('✅ [AuthService.register] Registro exitoso:', res.user?.email);
        this.handleAuthSuccess(res);
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    console.log(`🔑 [AuthService.login] Intentando inicio de sesión para: ${email}`);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        console.log('✅ [AuthService.login] Inicio de sesión exitoso:', res.user?.email);
        this.handleAuthSuccess(res);
      })
    );
  }

  logout(): void {
    console.log('🚪 [AuthService.logout] Cerrando sesión');
    localStorage.removeItem('callefix_token');
    localStorage.removeItem('callefix_user');
    this.currentUserSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('callefix_token');
  }

  private handleAuthSuccess(res: AuthResponse): void {
    if (res.token && res.user) {
      localStorage.setItem('callefix_token', res.token);
      localStorage.setItem('callefix_user', JSON.stringify(res.user));
      this.currentUserSignal.set(res.user);
    }
  }

  loginAsDemoAdmin(): void {
    console.log('👑 [AuthService] Conectando como Administrador Municipal demo...');
    this.login('admin@callefix.malaga.es', 'Admin123!').subscribe({
      next: () => console.log('✅ [AuthService] Conectado como Admin Municipal'),
      error: (e) => console.error('❌ [AuthService] Demo admin login error', e)
    });
  }

  loginAsDemoUser(): void {
    console.log('👥 [AuthService] Conectando como Vecino demo...');
    this.login('vecino@malaga.es', 'Vecino123!').subscribe({
      next: () => console.log('✅ [AuthService] Conectado como Vecino'),
      error: (e) => console.error('❌ [AuthService] Demo user login error', e)
    });
  }
}
