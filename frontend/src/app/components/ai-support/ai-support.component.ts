import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Faq {
  question: string;
  answer: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">AI Support</h1>
          <p class="text-gray-600">Ask anything about Vendora or browse the FAQs below.</p>
        </div>
        <a routerLink="/dashboard"
           class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- FAQ list -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div *ngIf="faqsLoading" class="text-gray-500">Loading FAQs...</div>
          <div *ngIf="faqsError" class="text-red-600 text-sm bg-red-50 p-2 rounded">{{ faqsError }}</div>
          <div *ngIf="faqs.length" class="space-y-3">
            <div *ngFor="let faq of faqs" class="border rounded-md p-3 hover:bg-gray-50">
              <button (click)="useFaq(faq)" class="text-left font-medium text-primary-600 hover:underline w-full">
                {{ faq.question }}
              </button>
              <p class="text-sm text-gray-600 mt-1">{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Chat -->
        <div class="bg-white rounded-lg shadow p-4 flex flex-col h-[500px]">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Chat with AI</h2>

          <div class="flex-1 overflow-y-auto space-y-3 mb-4 pr-2" #scrollContainer>
            <div *ngFor="let msg of messages"
                 [class.text-right]="msg.role === 'user'"
                 class="flex"
                 [class.justify-end]="msg.role === 'user'">
              <div class="max-w-[80%] rounded-lg px-4 py-2 text-sm"
                   [class.bg-primary-100]="msg.role === 'user'"
                   [class.text-primary-900]="msg.role === 'user'"
                   [class.bg-gray-100]="msg.role === 'assistant'"
                   [class.text-gray-800]="msg.role === 'assistant'">
                {{ msg.text }}
              </div>
            </div>
            <div *ngIf="loading" class="text-gray-500 text-sm">AI is typing...</div>
            <div *ngIf="error" class="text-red-600 text-sm bg-red-50 p-2 rounded">{{ error }}</div>
          </div>

          <div class="flex gap-2 mt-auto">
            <input
              [(ngModel)]="newMessage"
              (keydown.enter)="send()"
              type="text"
              placeholder="Type your support question..."
              class="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              [disabled]="loading" />
            <button
              (click)="send()"
              [disabled]="!newMessage.trim() || loading"
              class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AiSupportComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  faqs: Faq[] = [];
  faqsLoading = true;
  faqsError = '';
  messages: ChatMessage[] = [
    { role: 'assistant', text: 'Hi! I am your Vendora AI assistant. How can I help you today?' }
  ];
  newMessage = '';
  loading = false;
  error = '';

  private headers(): HttpHeaders {
    const token = this.authService.getTokenValue();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  ngOnInit(): void {
    this.http.get<{ data: Faq[] }>(`${environment.apiUrl}/ai/faqs`, { headers: this.headers() })
      .pipe(timeout(10000))
      .subscribe({
        next: (res) => {
          this.faqs = res.data;
          this.faqsLoading = false;
        },
        error: (err) => {
          this.faqs = [];
          this.faqsLoading = false;
          if (err.name === 'TimeoutError' || err.status === 0) {
            this.faqsError = 'Could not reach the backend. Make sure php artisan serve is running at ' + environment.backendUrl + '.';
          } else if (err.status === 401) {
            this.faqsError = 'Your session has expired. Please log in again.';
          } else {
            this.faqsError = err.error?.message || 'Could not load FAQs. Please try again.';
          }
        }
      });
  }

  useFaq(faq: Faq): void {
    this.newMessage = faq.question;
  }

  send(): void {
    const text = this.newMessage.trim();
    if (!text || this.loading) return;

    this.messages.push({ role: 'user', text });
    this.newMessage = '';
    this.loading = true;
    this.error = '';

    this.http.post<{ message: string }>(`${environment.apiUrl}/ai/chat`, { message: text }, { headers: this.headers() })
      .pipe(timeout(10000))
      .subscribe({
        next: (res) => {
          this.messages.push({ role: 'assistant', text: res.message });
          this.loading = false;
        },
        error: (err) => {
          if (err.name === 'TimeoutError' || err.status === 0) {
            this.error = 'Could not reach the backend. Make sure php artisan serve is running at ' + environment.backendUrl + '.';
          } else if (err.status === 401) {
            this.error = 'Your session has expired. Please log in again.';
          } else {
            this.error = err.error?.message || 'Could not get a response from the AI support service. Please try again.';
          }
          this.loading = false;
        }
      });
  }
}
