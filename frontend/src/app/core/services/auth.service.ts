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

  private currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Administrator');

  constructor() {
    console.log(`🔐 [AuthService] Inicializado con API Base URL: ${this.apiUrl}`);
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('callefix_token');
    const userJson = localStorage.getItem('callefix_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSignal.set(user);
        console.log('👤 [AuthService] Sesión existente restaurada desde localStorage:', user.email);
      } catch {
        this.loginAsDemoUser();
      }
    } else {
      this.loginAsDemoUser();
    }
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
