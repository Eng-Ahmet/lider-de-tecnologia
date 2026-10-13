import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../../core/services/ai-chat.service';

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating Action Button -->
    <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      
      <!-- Chat Window Drawer / Modal -->
      <div *ngIf="isOpen()"
           class="w-[92vw] sm:w-[410px] h-[520px] max-h-[82vh] bg-slate-900/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        <!-- Header -->
        <div class="px-4 py-3 bg-gradient-to-r from-sky-900/80 via-slate-900 to-sky-950 border-b border-sky-500/30 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-sm shadow-md shadow-sky-500/30">
              🏛️
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="font-bold text-xs sm:text-sm text-white font-heading">Asistente Municipal • Málaga</h3>
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Servicio municipal activo"></span>
              </div>
              <p class="text-[10px] text-sky-300 font-sans">📞 Teléfonos 010 / 092 • Guía de incidencias</p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button (click)="clearChat()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-xs" title="Reiniciar chat">
              🔄
            </button>
            <button (click)="toggleChat()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors text-sm" title="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <!-- Quick Helplines Banner -->
        <div class="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-1 overflow-x-auto">
          <span class="font-semibold text-sky-400">Atención rápida:</span>
          <span class="bg-sky-900/40 border border-sky-700/50 px-1.5 py-0.5 rounded text-[10px] text-sky-200">📞 010 (Línea Málaga)</span>
          <span class="bg-amber-900/40 border border-amber-700/50 px-1.5 py-0.5 rounded text-[10px] text-amber-200">🚨 092 (Policía Local)</span>
          <span class="bg-red-900/40 border border-red-700/50 px-1.5 py-0.5 rounded text-[10px] text-rose-200">🚑 112 (Emergencias)</span>
        </div>

        <!-- Messages Area -->
        <div #scrollContainer class="flex-1 p-3.5 space-y-3 overflow-y-auto custom-scrollbar text-xs">
          
          <div *ngFor="let msg of messages()" 
               [ngClass]="msg.sender === 'user' ? 'justify-end' : 'justify-start'" 
               class="flex">
            
            <div [ngClass]="msg.sender === 'user' 
                    ? 'bg-sky-600 text-white rounded-2xl rounded-tr-sm max-w-[85%] shadow-md' 
                    : (msg.metadata?.isError 
                        ? 'bg-red-950/40 text-rose-200 border-2 border-red-500/60 rounded-2xl rounded-tl-sm max-w-[90%] shadow-lg shadow-red-950/30' 
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-2xl rounded-tl-sm max-w-[90%] shadow-sm')"
                 class="p-3 space-y-1.5">
              
              <!-- Error Banner if connection failed -->
              <div *ngIf="msg.metadata?.isError" class="flex items-center gap-1.5 pb-1 border-b border-red-500/30 text-rose-300 font-bold text-[10px] tracking-wide uppercase">
                <span>⚠️</span>
                <span>Fallo de Conexión con IA</span>
              </div>

              <!-- Message Text -->
              <div class="whitespace-pre-line leading-relaxed font-sans">{{ msg.text }}</div>
              
              <!-- Footer Meta -->
              <div class="flex items-center justify-between text-[9px] text-slate-400/80 pt-1">
                <span>{{ msg.timestamp | date:'shortTime' }}</span>
                <span *ngIf="msg.metadata?.isError" class="text-rose-400 font-bold">Sin conexión</span>
                <span *ngIf="!msg.metadata?.isError && msg.sender === 'assistant'" class="font-sans text-[8px] text-sky-400">
                  Respuesta oficial breve
                </span>
              </div>

              <!-- Suggestions Buttons -->
              <div *ngIf="msg.metadata?.suggestions?.length" class="pt-2 flex flex-wrap gap-1.5">
                <button *ngFor="let sug of msg.metadata?.suggestions"
                        (click)="sendPresetMessage(sug)"
                        class="text-[10px] px-2 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/30 text-sky-200 transition-all text-left">
                  💬 {{ sug }}
                </button>
              </div>

            </div>
          </div>

          <!-- Typing Indicator -->
          <div *ngIf="isTyping()" class="flex justify-start">
            <div class="bg-slate-800 border border-slate-700 p-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 text-xs text-sky-400">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]"></span>
              <span class="text-[10px] text-slate-400 ml-1">Consultando información municipal...</span>
            </div>
          </div>

        </div>

        <!-- Input Area -->
        <div class="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
          <input type="text"
                 [(ngModel)]="userInput"
                 (keydown.enter)="handleSend()"
                 [disabled]="isTyping()"
                 placeholder="¿Cómo reportar en Málaga o a quién llamar?..."
                 class="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none disabled:opacity-50">
          
          <button (click)="handleSend()"
                  [disabled]="!userInput.trim() || isTyping()"
                  class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center">
            <span>➤</span>
          </button>
        </div>

      </div>

      <!-- Main Floating Launcher Pill / Button -->
      <button (click)="toggleChat()"
              class="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white font-bold text-xs shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all border border-sky-400/40 cursor-pointer">
        <span class="text-base">🏛️</span>
        <span class="hidden sm:inline">Asistente Municipal Málaga</span>
        <span *ngIf="!isOpen()" class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
      </button>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(56, 189, 248, 0.2);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(56, 189, 248, 0.4);
    }
  `]
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
  private chatService = inject(AiChatService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = signal<boolean>(false);
  isTyping = signal<boolean>(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';

  ngOnInit(): void {
    // Mensaje de bienvenida inicial en español estricto
    this.messages.set([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: '👋 ¡Hola! Soy el **Asistente Municipal de CalleFix Málaga**.\n\nPuedo orientarle sobre cómo reportar incidencias viales en Málaga y a qué números oficiales llamar (010 o 092).',
        timestamp: new Date(),
        metadata: {
          suggestions: [
            '📞 ¿A qué número llamar en Málaga?',
            '📍 ¿Cómo reportar un bache en la web?',
            '🚨 Emergencias viales graves (092)'
          ],
          source: 'asistente-municipal'
        }
      }
    ]);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen.set(!this.isOpen());
  }

  clearChat(): void {
    this.ngOnInit();
  }

  sendPresetMessage(text: string): void {
    this.userInput = text;
    this.handleSend();
  }

  handleSend(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping()) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMsg]);
    this.userInput = '';
    this.isTyping.set(true);

    this.chatService.sendMessage(text).subscribe({
      next: (reply) => {
        this.messages.update(msgs => [...msgs, reply]);
        this.isTyping.set(false);
      },
      error: () => {
        // En caso de fallo de red
        const errorReply: ChatMessage = {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          text: '⚠️ Error de conexión: No se pudo conectar con el servicio de IA municipal. Por favor, llame directamente al 010 (Línea Málaga) o al 092 (Policía Local).',
          timestamp: new Date(),
          metadata: {
            isError: true,
            source: 'error-conexion',
            suggestions: [
              '📞 Llamar al 010 (Línea Málaga)',
              '🚨 Llamar al 092 (Policía Local)'
            ]
          }
        };
        this.messages.update(msgs => [...msgs, errorReply]);
        this.isTyping.set(false);
      }
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch {}
    }
  }
}
