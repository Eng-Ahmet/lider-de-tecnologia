import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { AiChatbotComponent } from './shared/components/ai-chatbot/ai-chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AiChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
