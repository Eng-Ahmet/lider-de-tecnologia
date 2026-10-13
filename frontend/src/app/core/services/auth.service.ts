import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = window.location.port === '4880' ? 'http://localhost:3880/api' : (window.location.port === '4200' ? 'http://localhost:3880/api' : '/api');

  private currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Administrator');

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('callefix_token');
    const userJson = localStorage.getItem('callefix_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSignal.set(user);
      } catch {
        this.loginAsDemoUser();
      }
    } else {
      this.loginAsDemoUser();
    }
  }

  register(data: { fullName: string; email: string; password: string; phoneNumber?: string; role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  logout(): void {
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
    this.login('admin@callefix.malaga.es', 'Admin123!').subscribe({
      error: (e) => console.error('Demo admin login error', e)
    });
  }

  loginAsDemoUser(): void {
    this.login('vecino@malaga.es', 'Vecino123!').subscribe({
      error: (e) => console.error('Demo user login error', e)
    });
  }
}
