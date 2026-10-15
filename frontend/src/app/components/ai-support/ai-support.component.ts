import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Faq {
  question: string;
  answer: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-support',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">AI Support</h1>
          <p class="text-gray-600">Ask anything about Vendora or browse the FAQs below.</p>
        </div>
        <a
          routerLink="/dashboard"
          class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </a>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- FAQ list -->
        <div class="bg-white rounded-lg shadow p-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div *ngIf="faqsLoading()" class="text-gray-500">Loading FAQs...</div>
          <div *ngIf="faqsError()" class="text-red-600 text-sm bg-red-50 p-2 rounded">
            {{ faqsError() }}
          </div>
          <div *ngIf="faqs().length" class="space-y-3">
            <div *ngFor="let faq of faqs()" class="border rounded-md p-3 hover:bg-gray-50">
              <button
                (click)="useFaq(faq)"
                class="text-left font-medium text-primary-600 hover:underline w-full"
              >
                {{ faq.question }}
              </button>
              <p class="text-sm text-gray-600 mt-1">{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <!-- Chat -->
        <div class="bg-white rounded-lg shadow p-4 flex flex-col h-[500px]">
          <div class="flex items-center justify-between mb-4 relative">
            <h2 class="text-lg font-semibold text-gray-800">Chat with AI</h2>
            <div class="flex items-center gap-4">
              <button
                (click)="historyOpen.set(!historyOpen())"
                class="text-sm text-primary-600 hover:underline"
              >
                History ({{ conversations().length }})
              </button>
              <button
                (click)="newChat()"
                [disabled]="loading()"
                class="text-sm text-primary-600 hover:underline disabled:opacity-50"
              >
                New chat
              </button>
            </div>

            <div
              *ngIf="historyOpen()"
              class="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto bg-white border rounded-md shadow-lg z-10"
            >
              <p *ngIf="!conversations().length" class="p-3 text-sm text-gray-500">
                No previous conversations.
              </p>
              <div
                *ngFor="let c of conversations()"
                class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                [class.bg-gray-100]="c.id === conversationId()"
              >
                <button
                  (click)="openConversation(c.id)"
                  [disabled]="loading() || opening()"
                  class="flex-1 text-left text-sm truncate disabled:opacity-50"
                  [title]="c.title"
                >
                  {{ c.title }}
                  <span class="block text-xs text-gray-500">{{
                    c.updated_at | date: 'short'
                  }}</span>
                </button>
                <button
                  (click)="deleteConversation(c.id)"
                  [disabled]="loading()"
                  aria-label="Delete conversation"
                  class="text-gray-400 hover:text-red-600 text-sm disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto space-y-3 mb-4 pr-2" #scrollContainer>
            <div
              *ngFor="let msg of messages()"
              [class.text-right]="msg.role === 'user'"
              class="flex"
              [class.justify-end]="msg.role === 'user'"
            >
              <div
                class="max-w-[80%] rounded-lg px-4 py-2 text-sm"
                [class.bg-primary-100]="msg.role === 'user'"
                [class.text-primary-900]="msg.role === 'user'"
                [class.bg-gray-100]="msg.role === 'assistant'"
                [class.text-gray-800]="msg.role === 'assistant'"
              >
                {{ msg.text }}
              </div>
            </div>
            <div *ngIf="loading()" class="text-gray-500 text-sm">AI is typing...</div>
            <div *ngIf="error()" class="text-red-600 text-sm bg-red-50 p-2 rounded">
              {{ error() }}
            </div>
          </div>

          <div class="flex gap-2 mt-auto">
            <input
              #chatInput
              [(ngModel)]="newMessage"
              (keydown.enter)="send()"
              type="text"
              placeholder="Type your support question..."
              class="flex-1 min-w-0 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              [disabled]="loading()"
            />
            <button
              (click)="send()"
              [disabled]="!newMessage.trim() || loading() || opening()"
              class="shrink-0 bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AiSupportComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private chatInput = viewChild<ElementRef<HTMLInputElement>>('chatInput');

  // Signals so HTTP callbacks updating state always re-render the view.
  faqs = signal<Faq[]>([]);
  faqsLoading = signal(true);
  faqsError = signal('');
  messages = signal<ChatMessage[]>([this.greeting()]);
  conversations = signal<Conversation[]>([]);
  conversationId = signal<string | null>(null);
  historyOpen = signal(false);
  newMessage = '';
  loading = signal(false);
  // A manual history click is loading a conversation; sending meanwhile would be overwritten by its reply.
  opening = signal(false);
  error = signal('');

  private greeting(): ChatMessage {
    return {
      role: 'assistant',
      text: 'Hi! I am your Vendora AI assistant. How can I help you today?',
    };
  }

  newChat(): void {
    this.conversationId.set(null);
    this.messages.set([this.greeting()]);
    this.error.set('');
    this.historyOpen.set(false);
  }

  openConversation(id: string, onlyIfPristine = false): void {
    // Do not let a history click clobber the conversation while a chat request is in flight.
    if (this.loading() || this.opening()) return;
    // The auto-open on load does not lock the UI: the user may start typing while it loads.
    if (!onlyIfPristine) this.opening.set(true);
    this.http
      .get<{ data: ChatMessage[] }>(`${environment.apiUrl}/ai/conversations/${id}`)
      .subscribe({
        next: (res) => {
          this.opening.set(false);
          // The auto-open on load must not overwrite what the user started doing while it was loading.
          if (
            onlyIfPristine &&
            (this.messages().length > 1 || this.conversationId() || this.newMessage)
          ) {
            return;
          }
          this.conversationId.set(id);
          this.messages.set([this.greeting(), ...res.data]);
          this.error.set('');
          this.historyOpen.set(false);
        },
        error: () => {
          this.opening.set(false);
          this.error.set('Could not open that conversation.');
        },
      });
  }

  deleteConversation(id: string): void {
    if (this.loading()) return;
    this.http.delete(`${environment.apiUrl}/ai/conversations/${id}`).subscribe({
      next: () => {
        this.conversations.update((list) => list.filter((c) => c.id !== id));
        if (this.conversationId() === id) {
          this.newChat();
        }
      },
      error: () => this.error.set('Could not delete that conversation.'),
    });
  }

  private loadConversations(openLatest = false): void {
    this.http.get<{ data: Conversation[] }>(`${environment.apiUrl}/ai/conversations`).subscribe({
      next: (res) => {
        this.conversations.set(res.data);
        if (openLatest && res.data.length && this.messages().length === 1) {
          this.openConversation(res.data[0].id, true);
        }
      },
      error: () => {}, // history is a convenience; the chat works without it
    });
  }

  ngOnInit(): void {
    this.loadConversations(true);

    this.http
      .get<{ data: Faq[] }>(`${environment.apiUrl}/ai/faqs`)
      .pipe(timeout(10000))
      .subscribe({
        next: (res) => {
          this.faqs.set(res.data);
          this.faqsLoading.set(false);
        },
        error: (err) => {
          this.faqs.set([]);
          this.faqsLoading.set(false);
          if (err.name === 'TimeoutError' || err.status === 0) {
            this.faqsError.set(
              'Could not reach the backend. Make sure php artisan serve is running at ' +
                environment.backendUrl +
                '.',
            );
          } else if (err.status === 401) {
            this.faqsError.set('Your session has expired. Please log in again.');
          } else {
            this.faqsError.set(err.error?.message || 'Could not load FAQs. Please try again.');
          }
        },
      });
  }

  useFaq(faq: Faq): void {
    this.newMessage = faq.question;
    // The chat sits above a long FAQ list: bring the box into view so the copied question is not lost.
    const input = this.chatInput()?.nativeElement;
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }

  send(): void {
    const text = this.newMessage.trim();
    if (!text || this.loading() || this.opening()) return;

    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.newMessage = '';
    this.loading.set(true);
    this.error.set('');

    this.http
      .post<{ message: string; conversation_id?: string | null }>(`${environment.apiUrl}/ai/chat`, {
        message: text,
        conversation_id: this.conversationId(),
      })
      .pipe(timeout(180000))
      .subscribe({
        next: (res) => {
          this.messages.update((m) => [...m, { role: 'assistant', text: res.message }]);
          this.loading.set(false);
          if (res.conversation_id) {
            this.conversationId.set(res.conversation_id);
            this.loadConversations();
          }
        },
        error: (err) => {
          if (err.name === 'TimeoutError' || err.status === 0) {
            this.error.set(
              'Could not reach the backend. Make sure php artisan serve is running at ' +
                environment.backendUrl +
                '.',
            );
          } else if (err.status === 401) {
            this.error.set('Your session has expired. Please log in again.');
          } else {
            this.error.set(
              err.error?.message ||
                'Could not get a response from the AI support service. Please try again.',
            );
          }
          this.loading.set(false);
        },
      });
  }
}
