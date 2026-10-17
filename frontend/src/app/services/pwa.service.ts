import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const UPDATE_CHECK_MS = 30 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal(false);
  readonly updateReady = signal(false);
  // iOS Safari has no beforeinstallprompt, so the UI shows a manual hint instead.
  readonly showIosHint = this.isIos() && !this.isStandalone();

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    });
    // ngsw only checks for a new version on full page loads; an open SPA tab needs a periodic check.
    if (this.swUpdate?.isEnabled) {
      setInterval(() => this.swUpdate?.checkForUpdate().catch(() => undefined), UPDATE_CHECK_MS);
    }
    this.swUpdate?.versionUpdates
      .pipe(filter((e) => e.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    try {
      await this.deferredPrompt.prompt();
    } finally {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    }
  }

  reload(): void {
    location.reload();
  }

  private isStandalone(): boolean {
    return matchMedia('(display-mode: standalone)').matches;
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
}
