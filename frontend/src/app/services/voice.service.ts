import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceCommand {
  type: 'expense' | 'income' | 'investment' | null;
  amount: number | null;
  description: string;
  date: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private _listening = new BehaviorSubject<boolean>(false);
  private _transcript = new BehaviorSubject<string>('');
  private _error = new BehaviorSubject<string | null>(null);

  readonly listening$ = this._listening.asObservable();
  readonly transcript$ = this._transcript.asObservable();
  readonly error$ = this._error.asObservable();

  constructor(private zone: NgZone) {}

  get supported(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  start(): void {
    if (!this.supported) {
      this._error.next('Voice input is not supported in this browser.');
      return;
    }
    if (this._listening.value) return;

    this._error.next(null);
    this._transcript.next('');

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = this.resolveLang();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.zone.run(() => this._listening.next(true));
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += result;
        } else {
          interim += result;
        }
      }
      this.zone.run(() => {
        this._transcript.next((final || interim).trim());
      });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.zone.run(() => {
        if (event.error === 'not-allowed') {
          this._error.next('Microphone permission denied.');
        } else if (event.error === 'no-speech') {
          this._error.next('No speech detected. Try again.');
        } else {
          this._error.next(`Voice error: ${event.error}`);
        }
        this._listening.next(false);
      });
    };

    this.recognition.onend = () => {
      this.zone.run(() => {
        this._listening.next(false);
        this.recognition = null;
      });
    };

    this.recognition.start();
  }

  stop(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* already stopped */ }
      this.recognition = null;
    }
    this._listening.next(false);
  }

  toggle(): void {
    if (this._listening.value) {
      this.stop();
    } else {
      this.start();
    }
  }

  parseCommand(text: string): VoiceCommand {
    const cleaned = text.toLowerCase().trim().replace(/[.,]/g, '').replace(/\s+/g, ' ');

    let type: VoiceCommand['type'] = null;
    if (/\bincome\b|received|earned|salary|deposit/i.test(cleaned)) {
      type = 'income';
    } else if (/\binvest(ment)?\b|bought|asset|stock|crypto|etf\b/i.test(cleaned)) {
      type = 'investment';
    } else if (/\bexpense\b|spent|paid|bought|purchase|bill/i.test(cleaned)) {
      type = 'expense';
    } else {
      type = 'expense';
    }

    const amountMatch = cleaned.match(/(\d{1,3}(?:[\s,]?\d{3})*(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/\s/g, '').replace(/,/g, '')) : null;

    const date = this.parseDate(cleaned);

    let description = cleaned
      .replace(/\b(expense|income|investment|invest|spent|received|earned|bought|paid|purchase|bill|deposit|salary)\b/gi, '')
      .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .replace(/\d+(?:\.\d{1,2})?/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    description = description.charAt(0).toUpperCase() + description.slice(1);

    return { type, amount, description, date };
  }

  private parseDate(text: string): string | null {
    const today = new Date();

    if (/\btoday\b/.test(text)) {
      return today.toISOString().slice(0, 10);
    }
    if (/\byesterday\b/.test(text)) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }

    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
      let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : today.getFullYear();
      if (year < 100) year += 2000;
      const month = parseInt(slashMatch[1], 10).toString().padStart(2, '0');
      const day = parseInt(slashMatch[2], 10).toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }

    return null;
  }

  private resolveLang(): string {
    if (typeof navigator === 'undefined') return 'en-US';
    const lang = navigator.language || 'en-US';
    return lang;
  }
}
