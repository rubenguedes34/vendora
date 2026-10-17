import {
  Component,
  Input,
  OnInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { TagService, Tag } from '../../services/tag.service';
import { FinancialService, Category } from '../../services/financial.service';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { ApiError } from '../../models/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoryNamePipe } from '../../pipes/category-name.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarComponent,
    CurrencySymbolPipe,
    CategoryNamePipe,
    TranslatePipe,
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  readonly language = inject(LanguageService);

  @Input() embedded = false;

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  transactions: Transaction[] = [];
  categories: Category[] = [];
  transactionForm: FormGroup;
  showForm = false;
  editingTransaction: Transaction | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  filtersOpen = false;

  filterSearch = '';
  filterNotesSearch = '';
  filterType = '';
  filterCategoryId: number | undefined;
  filterDateFrom = '';
  filterDateTo = '';
  filterAmountMin: number | undefined;
  filterAmountMax: number | undefined;

  currentPage = 1;
  perPage = 20;
  totalItems = 0;
  totalPages = 0;

  get activeFilterCount(): number {
    let n = 0;
    if (this.filterSearch) n++;
    if (this.filterNotesSearch) n++;
    if (this.filterType) n++;
    if (this.filterCategoryId) n++;
    if (this.filterDateFrom) n++;
    if (this.filterDateTo) n++;
    if (this.filterAmountMin != null) n++;
    if (this.filterAmountMax != null) n++;
    n += this.filterTagIds.length;
    return n;
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  pendingFile: File | null = null;
  attachmentError = '';
  removeAttachmentOnSave = false;

  availableTags: Tag[] = [];
  selectedTagIds: number[] = [];
  filterTagIds: number[] = [];
  newTagName = '';
  isCreatingTag = false;
  tagError = '';

  previewTransaction: Transaction | null = null;
  previewObjectUrl: string | null = null;
  previewIsImage = false;
  previewLoading = false;

  private searchTimeout?: ReturnType<typeof setTimeout>;
  private slowTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private tagService: TagService,
    private financialService: FinancialService,
    private authService: AuthService,
    private router: Router,
    public currencyService: CurrencyService,
    private cdr: ChangeDetectorRef,
  ) {
    this.transactionForm = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      transaction_date: [new Date().toISOString().split('T')[0], Validators.required],
      category_id: ['', Validators.required],
      notes: [null],
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.restoreFilters();
    this.tagService.tags$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags) => (this.availableTags = tags));
    this.tagService.loadTags();
    this.loadCategories();
    this.loadTransactions();
  }

  saveFilters(): void {
    sessionStorage.setItem(
      'txFilters',
      JSON.stringify({
        filtersOpen: this.filtersOpen,
        filterSearch: this.filterSearch,
        filterNotesSearch: this.filterNotesSearch,
        filterType: this.filterType,
        filterCategoryId: this.filterCategoryId,
        filterDateFrom: this.filterDateFrom,
        filterDateTo: this.filterDateTo,
        filterAmountMin: this.filterAmountMin,
        filterAmountMax: this.filterAmountMax,
        filterTagIds: this.filterTagIds,
        currentPage: this.currentPage,
        perPage: this.perPage,
      }),
    );
  }

  private restoreFilters(): void {
    try {
      const raw = sessionStorage.getItem('txFilters');
      if (!raw) return;
      const f = JSON.parse(raw);
      this.filtersOpen = f.filtersOpen ?? false;
      this.filterSearch = f.filterSearch ?? '';
      this.filterNotesSearch = f.filterNotesSearch ?? '';
      this.filterType = f.filterType ?? '';
      this.filterCategoryId = f.filterCategoryId ? +f.filterCategoryId : undefined;
      this.filterDateFrom = f.filterDateFrom ?? '';
      this.filterDateTo = f.filterDateTo ?? '';
      this.filterAmountMin = f.filterAmountMin != null ? +f.filterAmountMin : undefined;
      this.filterAmountMax = f.filterAmountMax != null ? +f.filterAmountMax : undefined;
      this.filterTagIds = Array.isArray(f.filterTagIds) ? f.filterTagIds : [];
      this.currentPage = f.currentPage ? +f.currentPage : 1;
      this.perPage = f.perPage ? +f.perPage : 20;
    } catch {
      /* ignore corrupt state */
    }
  }

  onSearchInput(event: Event): void {
    this.filterSearch = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.saveFilters();
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadTransactions(), 350);
  }

  onFilterChange(field: string, value: string): void {
    if (field === 'type') this.filterType = value;
    if (field === 'category_id') this.filterCategoryId = value ? +value : undefined;
    if (field === 'date_from') this.filterDateFrom = value;
    if (field === 'date_to') this.filterDateTo = value;
    this.currentPage = 1;
    this.saveFilters();
    this.loadTransactions();
  }

  onNotesSearchInput(event: Event): void {
    this.filterNotesSearch = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.saveFilters();
    clearTimeout(this.slowTimeout);
    this.slowTimeout = setTimeout(() => this.loadTransactions(), 500);
  }

  onAmountInput(which: 'min' | 'max', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const val = raw === '' ? undefined : parseFloat(raw);
    if (which === 'min') this.filterAmountMin = val;
    else this.filterAmountMax = val;
    this.currentPage = 1;
    this.saveFilters();
    clearTimeout(this.slowTimeout);
    this.slowTimeout = setTimeout(() => this.loadTransactions(), 500);
  }

  toggleFilterTag(tagId: number): void {
    const idx = this.filterTagIds.indexOf(tagId);
    if (idx === -1) this.filterTagIds = [...this.filterTagIds, tagId];
    else this.filterTagIds = this.filterTagIds.filter((id) => id !== tagId);
    this.currentPage = 1;
    this.saveFilters();
    this.loadTransactions();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.saveFilters();
    this.loadTransactions();
  }

  onPerPageChange(perPage: number): void {
    this.perPage = perPage;
    this.currentPage = 1;
    this.saveFilters();
    this.loadTransactions();
  }

  hasActiveFilters(): boolean {
    return this.activeFilterCount > 0;
  }

  clearFilters(): void {
    this.filterSearch = '';
    this.filterNotesSearch = '';
    this.filterType = '';
    this.filterCategoryId = undefined;
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterAmountMin = undefined;
    this.filterAmountMax = undefined;
    this.filterTagIds = [];
    this.currentPage = 1;
    this.perPage = 20;
    sessionStorage.removeItem('txFilters');
    this.loadTransactions();
  }

  isImageIcon(icon?: string): boolean {
    return Boolean(icon?.startsWith('http://') || icon?.startsWith('https://'));
  }

  loadCategories(): void {
    forkJoin([
      this.financialService.getCategoriesByType('income').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('expense').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('savings').pipe(catchError(() => of([]))),
    ]).subscribe(([income, expense, savings]) => {
      this.categories = [...income, ...expense, ...savings];
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    try {
      this.transactionService
        .getTransactions({
          search: this.filterSearch || undefined,
          notes_search: this.filterNotesSearch || undefined,
          type: this.filterType || undefined,
          category_id: this.filterCategoryId,
          date_from: this.filterDateFrom || undefined,
          date_to: this.filterDateTo || undefined,
          amount_min: this.filterAmountMin,
          amount_max: this.filterAmountMax,
          tag_ids: this.filterTagIds.length ? this.filterTagIds : undefined,
          page: this.currentPage,
          per_page: this.perPage,
        })
        .subscribe({
          next: (response) => {
            this.transactions = response.data;
            this.currentPage = response.current_page;
            this.totalItems = response.total;
            this.totalPages = response.last_page;
            this.perPage = response.per_page;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.errorMessage = error.message || this.translate.instant('transactions.loadFailed');
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
    } catch (caught: unknown) {
      const err = caught as ApiError;
      this.errorMessage = err?.message || this.translate.instant('transactions.loadFailed');
      this.isLoading = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentError = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.attachmentError = this.translate.instant('transactions.attachmentType');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.attachmentError = this.translate.instant('transactions.attachmentSize');
      input.value = '';
      return;
    }
    this.pendingFile = file;
    this.removeAttachmentOnSave = false;
  }

  clearPendingFile(): void {
    this.pendingFile = null;
    this.attachmentError = '';
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  removeExistingAttachment(): void {
    this.removeAttachmentOnSave = true;
  }

  private buildPayload(): FormData | Record<string, any> {
    const v = this.transactionForm.value;

    if (this.pendingFile) {
      const fd = new FormData();
      fd.append('category_id', v.category_id);
      fd.append('description', v.description);
      fd.append('amount', v.amount);
      fd.append('type', v.type);
      fd.append('transaction_date', v.transaction_date);
      if (v.notes) fd.append('notes', v.notes);
      fd.append('attachment', this.pendingFile, this.pendingFile.name);
      this.selectedTagIds.forEach((id) => fd.append('tag_ids[]', String(id)));
      return fd;
    }

    return { ...v, tag_ids: this.selectedTagIds };
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) return;
    this.isSaving = true;
    this.errorMessage = '';

    const payload = this.buildPayload();

    const saveObs = this.editingTransaction
      ? this.transactionService.updateTransaction(this.editingTransaction.id, payload)
      : this.transactionService.createTransaction(payload);

    saveObs.subscribe({
      next: (saved) => {
        if (
          this.removeAttachmentOnSave &&
          this.editingTransaction?.attachment_path &&
          !this.pendingFile
        ) {
          this.transactionService.deleteAttachment(saved.id).subscribe({
            next: () => {
              this.isSaving = false;
              this.loadTransactions();
              this.cancelEdit();
            },
            error: () => {
              this.isSaving = false;
              this.loadTransactions();
              this.cancelEdit();
            },
          });
        } else {
          this.isSaving = false;
          this.loadTransactions();
          this.cancelEdit();
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error.message || this.translate.instant('transactions.saveFailed');
      },
    });
  }

  editTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.pendingFile = null;
    this.attachmentError = '';
    this.removeAttachmentOnSave = false;
    this.selectedTagIds = (transaction.tags ?? []).map((t) => t.id);
    this.tagError = '';
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.transaction_date.slice(0, 10),
      category_id: transaction.category_id ? String(transaction.category_id) : '',
      notes: transaction.notes ?? null,
    });
    this.showForm = true;
  }

  deleteTransaction(id: number): void {
    if (!confirm(this.translate.instant('transactions.confirmDelete'))) return;
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => this.loadTransactions(),
      error: (error) =>
        (this.errorMessage = error.message || this.translate.instant('transactions.deleteFailed')),
    });
  }

  previewAttachment(transaction: Transaction): void {
    this.previewTransaction = transaction;
    this.previewObjectUrl = null;
    this.previewIsImage = false;
    this.previewLoading = true;

    this.transactionService.getAttachment(transaction.id).subscribe({
      next: (blob) => {
        const mime = blob.type ?? '';
        this.previewIsImage = mime.startsWith('image/');
        this.previewObjectUrl = URL.createObjectURL(blob);
        this.previewLoading = false;
      },
      error: () => {
        this.previewObjectUrl = null;
        this.previewLoading = false;
      },
    });
  }

  closePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewTransaction = null;
    this.previewObjectUrl = null;
    this.previewIsImage = false;
  }

  deleteAttachment(transaction: Transaction): void {
    if (!confirm(this.translate.instant('transactions.confirmDeleteAttachment'))) return;
    this.transactionService.deleteAttachment(transaction.id).subscribe({
      next: () => {
        transaction.attachment_path = null;
        this.closePreview();
        this.loadTransactions();
      },
      error: (error) =>
        (this.errorMessage =
          error.message || this.translate.instant('transactions.deleteAttachmentFailed')),
    });
  }

  exportCsv(): void {
    this.transactionService.exportTransactions({
      search: this.filterSearch || undefined,
      notes_search: this.filterNotesSearch || undefined,
      type: this.filterType || undefined,
      category_id: this.filterCategoryId,
      date_from: this.filterDateFrom || undefined,
      date_to: this.filterDateTo || undefined,
      amount_min: this.filterAmountMin,
      amount_max: this.filterAmountMax,
      tag_ids: this.filterTagIds.length ? this.filterTagIds : undefined,
    });
  }

  getTagById(id: number): Tag | undefined {
    return this.availableTags.find((t) => t.id === id);
  }

  removeFormTag(tagId: number): void {
    this.selectedTagIds = this.selectedTagIds.filter((id) => id !== tagId);
  }

  onTagPickerChange(select: HTMLSelectElement): void {
    const id = parseInt(select.value, 10);
    if (id && !this.selectedTagIds.includes(id)) {
      this.selectedTagIds = [...this.selectedTagIds, id];
    }
    select.value = '';
  }

  createAndAddTag(): void {
    const name = this.newTagName.trim();
    if (!name) return;
    this.isCreatingTag = true;
    this.tagError = '';
    this.tagService.createTag({ name }).subscribe({
      next: (tag) => {
        if (!this.selectedTagIds.includes(tag.id)) {
          this.selectedTagIds = [...this.selectedTagIds, tag.id];
        }
        this.newTagName = '';
        this.isCreatingTag = false;
      },
      error: (err) => {
        this.tagError = err?.message || this.translate.instant('transactions.createTagFailed');
        this.isCreatingTag = false;
      },
    });
  }

  cancelEdit(): void {
    this.editingTransaction = null;
    this.showForm = false;
    this.errorMessage = '';
    this.pendingFile = null;
    this.attachmentError = '';
    this.removeAttachmentOnSave = false;
    this.selectedTagIds = [];
    this.tagError = '';
    this.newTagName = '';
    this.transactionForm.reset({
      type: 'expense',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: null,
    });
  }
}
