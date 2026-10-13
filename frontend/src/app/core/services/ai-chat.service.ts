import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  metadata?: {
    isError?: boolean;
    suggestions?: string[];
    source?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private http = inject(HttpClient);

  // FastAPI LangChain endpoint (proxied through backend or direct)
  private apiEndpoint = window.location.port === '4880' 
    ? 'http://localhost:3880/api/ai/chat' 
    : '/api/ai/chat';

  sendMessage(userQuery: string): Observable<ChatMessage> {
    const trimmed = userQuery.trim();

    return this.http.post<any>(this.apiEndpoint, { prompt: trimmed }).pipe(
      map(res => {
        // Enforce max ~35 words response if needed
        let responseText = res.response || res.answer || res.text || '';
        const words = responseText.split(/\s+/);
        if (words.length > 35) {
          responseText = words.slice(0, 35).join(' ') + '... (Llame al 010 para más información).';
        }

        return {
          id: 'msg-' + Date.now(),
          sender: 'assistant' as const,
          text: responseText,
          timestamp: new Date(),
          metadata: {
            isError: !!res.isError || !!res.is_error,
            suggestions: res.suggestions || [
              '📞 ¿A qué número llamar en Málaga?',
              '📍 ¿Cómo reportar un bache?',
              '🚨 Emergencias viales (092)'
            ],
            source: res.source || 'asistente-municipal-malaga'
          }
        };
      }),
      catchError(() => {
        // Si falla la conexión con el servidor o IA, mostrar mensaje explícito de error en español
        return of({
          id: 'msg-err-' + Date.now(),
          sender: 'assistant' as const,
          text: '⚠️ Error de conexión: No se pudo conectar con el servicio de IA municipal. Por favor, llame directamente al 010 (Línea Málaga) o al 092 (Policía Local).',
          timestamp: new Date(),
          metadata: {
            isError: true,
            suggestions: [
              '📞 Teléfono 010 (Línea Málaga)',
              '🚨 Teléfono 092 (Policía Local)'
            ],
            source: 'error-conexion'
          }
        });
      })
    );
  }
}
