import { Component, Input, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { FinancialService, Category } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { MonthPickerComponent } from '../shared/month-picker/month-picker.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoryNamePipe, sortByCategoryName } from '../../pipes/category-name.pipe';

interface RecurrentTransaction {
  id?: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  day_of_month: number;
  category?: Category;
}

@Component({
  selector: 'app-recurrent-transactions',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarComponent,
    MonthPickerComponent,
    CurrencySymbolPipe,
    CategoryNamePipe,
    TranslatePipe,
  ],
  templateUrl: './recurrent-transactions.component.html',
})
export class RecurrentTransactionsComponent implements OnInit {
  @Input() embedded = false;

  private translate = inject(TranslateService);

  form: FormGroup;
  recurrentList: RecurrentTransaction[] = [];
  categories: Category[] = [];
  editing: RecurrentTransaction | null = null;
  errorMessage = '';
  copyTargetMonth = '';
  isCopying = false;
  copyMessage = '';
  copySuccess = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financialService: FinancialService,
    private http: HttpClient,
    private router: Router,
    public currencyService: CurrencyService,
  ) {
    this.form = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      category_id: ['', Validators.required],
      day_of_month: ['', [Validators.required, Validators.min(1), Validators.max(28)]],
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCategories();
    this.loadRecurrent();
    const now = new Date();
    this.copyTargetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  loadCategories(): void {
    forkJoin([
      this.financialService.getCategoriesByType('income').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('expense').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('savings').pipe(catchError(() => of([]))),
    ]).subscribe(([income, expense, savings]) => {
      this.categories = sortByCategoryName([...income, ...expense, ...savings], this.translate);
    });
  }

  loadRecurrent(): void {
    this.http.get<RecurrentTransaction[]>(`${this.apiUrl}/recurrent-transactions`).subscribe({
      next: (data) => {
        this.recurrentList = data;
        this.errorMessage = '';
      },
      error: (err) =>
        (this.errorMessage = err.error?.message || this.translate.instant('recurrent.loadFailed')),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;

    if (this.editing) {
      this.http
        .put<RecurrentTransaction>(
          `${this.apiUrl}/recurrent-transactions/${this.editing.id}`,
          payload,
        )
        .subscribe({
          next: (item) => {
            this.recurrentList = this.recurrentList.map((i) => (i.id === item.id ? item : i));
            this.cancelEdit();
            this.errorMessage = '';
          },
          error: (err) =>
            (this.errorMessage =
              err.error?.message || this.translate.instant('recurrent.updateFailed')),
        });
    } else {
      this.http
        .post<RecurrentTransaction>(`${this.apiUrl}/recurrent-transactions`, payload)
        .subscribe({
          next: (item) => {
            this.recurrentList = [...this.recurrentList, item];
            this.form.reset({ type: 'expense' });
            this.errorMessage = '';
          },
          error: (err) =>
            (this.errorMessage =
              err.error?.message || this.translate.instant('recurrent.addFailed')),
        });
    }
  }

  editItem(item: RecurrentTransaction): void {
    this.editing = item;
    this.form.patchValue({
      ...item,
      category_id: item.category_id ? String(item.category_id) : '',
    });
  }

  cancelEdit(): void {
    this.editing = null;
    this.form.reset({ type: 'expense' });
  }

  deleteItem(id: number): void {
    if (!confirm(this.translate.instant('recurrent.confirmDelete'))) return;
    this.http.delete(`${this.apiUrl}/recurrent-transactions/${id}`).subscribe({
      next: () => this.loadRecurrent(),
      error: (err) =>
        (this.errorMessage =
          err.error?.message || this.translate.instant('recurrent.deleteFailed')),
    });
  }

  copyToMonth(): void {
    this.isCopying = true;
    this.copyMessage = '';
    this.http
      .post<{
        created: number;
        month: string;
      }>(`${this.apiUrl}/recurrent-transactions/copy`, { month: this.copyTargetMonth })
      .subscribe({
        next: (res) => {
          this.isCopying = false;
          this.copySuccess = true;
          this.copyMessage = this.translate.instant('recurrent.copied', {
            count: res.created,
            month: this.copyTargetMonth,
          });
        },
        error: (err) => {
          this.isCopying = false;
          this.copySuccess = false;
          this.copyMessage = err.error?.message || this.translate.instant('recurrent.copyFailed');
        },
      });
  }
}
