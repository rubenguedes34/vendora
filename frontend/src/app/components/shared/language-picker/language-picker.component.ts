import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-language-picker',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [AsyncPipe, TranslatePipe],
  template: `
    <div class="flex items-center justify-between px-1 py-2.5 lg:py-1">
      <span class="text-sm font-semibold">{{ 'common.language' | translate }}</span>
      <div
        class="inline-flex rounded-lg border border-gray-200 overflow-hidden"
        role="group"
        [attr.aria-label]="'common.language' | translate"
      >
        @for (option of language.languages; track option.code) {
          <button
            type="button"
            (click)="language.set(option.code)"
            [attr.aria-pressed]="(language.language$ | async) === option.code"
            class="px-3 py-1 text-xs font-semibold transition-colors"
            [class.bg-gray-100]="(language.language$ | async) === option.code"
          >
            {{ option.label }}
          </button>
        }
      </div>
    </div>
  `,
})
export class LanguagePickerComponent {
  readonly language = inject(LanguageService);
}
