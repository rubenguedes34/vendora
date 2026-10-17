import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  it('enables install after beforeinstallprompt and prompts on install()', async () => {
    const service = TestBed.inject(PwaService);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
    });

    expect(service.canInstall()).toBe(false);
    window.dispatchEvent(event);
    expect(service.canInstall()).toBe(true);
    expect(event.defaultPrevented).toBe(true);

    await service.install();
    expect(prompt).toHaveBeenCalled();
    expect(service.canInstall()).toBe(false);
  });

  it('hides install after appinstalled', () => {
    const service = TestBed.inject(PwaService);
    window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }));
    window.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
  });

  it('sets updateReady on VERSION_READY', () => {
    const versionUpdates = new Subject<{ type: string }>();
    TestBed.configureTestingModule({
      providers: [{ provide: SwUpdate, useValue: { versionUpdates } }],
    });
    const service = TestBed.inject(PwaService);

    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(service.updateReady()).toBe(false);
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.updateReady()).toBe(true);
  });

  it('checks for updates periodically when the service worker is enabled', () => {
    vi.useFakeTimers();
    const checkForUpdate = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates: new Subject(), checkForUpdate },
        },
      ],
    });
    TestBed.inject(PwaService);

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
