import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <ng-container *ngIf="!embedded; else embeddedTpl">
      <div class="min-h-screen bg-gray-100 flex">
        <app-sidebar></app-sidebar>

        <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
          <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
        </main>
      </div>
    </ng-container>

    <ng-template #embeddedTpl>
      <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
    </ng-template>

    <ng-template #contentTpl>
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Transactions</h2>
              <div class="flex items-center gap-2">
                <button (click)="exportCsv()"
                  class="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Export CSV
                </button>
                <button (click)="showForm = !showForm"
                  class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm">
                  {{ showForm && !editingTransaction ? 'Cancel' : '+ Add Transaction' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Add/Edit Form -->
          <div *ngIf="showForm" class="bg-white p-6 rounded-xl shadow-md mb-6 border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">{{ editingTransaction ? 'Edit Transaction' : 'Add New Transaction' }}</h2>
            <form [formGroup]="transactionForm" (ngSubmit)="onSubmit()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Description</label>
                  <input type="text" formControlName="description"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                    placeholder="Enter description" />
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Amount ({{ currencyService.symbol }})</label>
                  <input type="number" step="0.01" formControlName="amount"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                    placeholder="0.00" />
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Type</label>
                  <select formControlName="type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Date</label>
                  <input type="date" formControlName="transaction_date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Category</label>
                  <select formControlName="category_id"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="">Select a category</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Notes <span class="font-normal text-gray-400">(optional)</span></label>
                  <textarea formControlName="notes" rows="2" placeholder="Add any relevant notes…"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"></textarea>
                </div>
                <!-- Tags -->
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Tags <span class="font-normal text-gray-400">(optional)</span></label>
                  <!-- Selected tag chips -->
                  <div class="flex flex-wrap gap-1.5 mb-2" *ngIf="selectedTagIds.length">
                    <span *ngFor="let tagId of selectedTagIds" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      [style.background-color]="getTagById(tagId)?.color || '#6366f1'">
                      {{ getTagById(tagId)?.name }}
                      <button type="button" (click)="removeFormTag(tagId)" class="ml-0.5 hover:opacity-75 transition-opacity">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                  <!-- Tag picker + inline create -->
                  <div class="flex gap-2 flex-wrap">
                    <select (change)="onTagPickerChange($any($event.target))"
                      class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="">+ Add tag…</option>
                      <option *ngFor="let tag of availableTags" [value]="tag.id"
                        [disabled]="selectedTagIds.includes(tag.id)">{{ tag.name }}</option>
                    </select>
                    <div class="flex items-center gap-1">
                      <input type="text" [(ngModel)]="newTagName" [ngModelOptions]="{standalone: true}"
                        placeholder="New tag name"
                        class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-36" />
                      <input type="color" [(ngModel)]="newTagColor" [ngModelOptions]="{standalone: true}"
                        class="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5" title="Tag colour" />
                      <button type="button" (click)="createAndAddTag()"
                        [disabled]="!newTagName.trim() || isCreatingTag"
                        class="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors">
                        {{ isCreatingTag ? '…' : 'Create' }}
                      </button>
                    </div>
                  </div>
                  <p *ngIf="tagError" class="text-red-500 text-xs mt-1">{{ tagError }}</p>
                </div>

                <!-- Attachment -->
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Receipt / Attachment <span class="font-normal text-gray-400">(optional · jpg, png, pdf · max 5 MB)</span></label>

                  <!-- Existing attachment (edit mode) -->
                  <div *ngIf="editingTransaction?.attachment_path && !pendingFile" class="flex items-center gap-3 mb-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                    <svg class="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    <span class="text-sm text-gray-600 flex-1 truncate">Existing attachment</span>
                    <button type="button" (click)="previewAttachment(editingTransaction!)"
                      class="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">View</button>
                    <button type="button" (click)="removeExistingAttachment()"
                      class="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Remove</button>
                  </div>

                  <!-- Pending new file -->
                  <div *ngIf="pendingFile" class="flex items-center gap-3 mb-2 p-2 bg-primary-50 rounded-md border border-primary-200">
                    <svg class="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-sm text-gray-700 flex-1 truncate">{{ pendingFile.name }}</span>
                    <button type="button" (click)="clearPendingFile()"
                      class="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Remove</button>
                  </div>

                  <label *ngIf="!pendingFile" class="flex items-center gap-2 cursor-pointer w-fit">
                    <input #fileInput type="file" accept=".jpg,.jpeg,.png,.pdf" class="hidden" (change)="onFileSelected($event)" />
                    <span class="flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                      Choose file
                    </span>
                  </label>
                  <p *ngIf="attachmentError" class="text-red-500 text-xs mt-1">{{ attachmentError }}</p>
                </div>
              </div>
              <div *ngIf="errorMessage" class="mt-3 text-red-500 text-sm">{{ errorMessage }}</div>
              <div class="mt-4 flex space-x-3">
                <button type="submit" [disabled]="transactionForm.invalid || isSaving"
                  class="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {{ isSaving ? 'Saving...' : (editingTransaction ? 'Update' : 'Add') + ' Transaction' }}
                </button>
                <button type="button" (click)="cancelEdit()"
                  class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Filter Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
            <!-- Filter header -->
            <div class="flex items-center justify-between px-4 py-3 cursor-pointer select-none" (click)="filtersOpen = !filtersOpen">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                </svg>
                <span class="text-sm font-medium text-gray-700">Filters</span>
                <span *ngIf="activeFilterCount > 0"
                  class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold">
                  {{ activeFilterCount }}
                </span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-400">{{ totalItems }} result{{ totalItems !== 1 ? 's' : '' }}</span>
                <button *ngIf="hasActiveFilters()" (click)="$event.stopPropagation(); clearFilters()"
                  class="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors">Clear all</button>
                <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
                  [class.rotate-180]="filtersOpen"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            <!-- Filter body -->
            <div *ngIf="filtersOpen" class="px-4 pb-4 border-t border-gray-50">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">

                <!-- Search (title + notes) -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Search title</label>
                  <div class="relative">
                    <svg class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    <input type="text" placeholder="Description…"
                      [value]="filterSearch"
                      (input)="onSearchInput($event)"
                      class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                </div>

                <!-- Notes search -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Search notes</label>
                  <div class="relative">
                    <svg class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <input type="text" placeholder="Notes…"
                      [value]="filterNotesSearch"
                      (input)="onNotesSearchInput($event)"
                      class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                </div>

                <!-- Type -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select [value]="filterType" (change)="onFilterChange('type', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <!-- Category -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select [value]="filterCategoryId || ''" (change)="onFilterChange('category_id', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="">All categories</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                  </select>
                </div>

                <!-- Date from -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Date from</label>
                  <input type="date" [value]="filterDateFrom"
                    (change)="onFilterChange('date_from', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>

                <!-- Date to -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Date to</label>
                  <input type="date" [value]="filterDateTo"
                    (change)="onFilterChange('date_to', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>

                <!-- Amount min -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Amount min ({{ currencyService.symbol }})</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    [value]="filterAmountMin ?? ''"
                    (input)="onAmountInput('min', $event)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>

                <!-- Amount max -->
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Amount max ({{ currencyService.symbol }})</label>
                  <input type="number" min="0" step="0.01" placeholder="∞"
                    [value]="filterAmountMax ?? ''"
                    (input)="onAmountInput('max', $event)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>

              </div>

              <!-- Tag filter -->
              <div class="mt-3" *ngIf="availableTags.length > 0">
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Tags</label>
                <div class="flex flex-wrap gap-1.5">
                  <button *ngFor="let tag of availableTags" type="button"
                    (click)="toggleFilterTag(tag.id)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    [class.text-white]="filterTagIds.includes(tag.id)"
                    [class.border-transparent]="filterTagIds.includes(tag.id)"
                    [class.text-gray-600]="!filterTagIds.includes(tag.id)"
                    [class.border-gray-300]="!filterTagIds.includes(tag.id)"
                    [class.bg-gray-100]="!filterTagIds.includes(tag.id)"
                    [style.background-color]="filterTagIds.includes(tag.id) ? tag.color : null">
                    {{ tag.name }}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Transactions List -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-6">
              <div *ngIf="isLoading" class="text-gray-400 text-center py-10">
                <svg class="w-8 h-8 mx-auto mb-2 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading...
              </div>

              <div *ngIf="!isLoading && transactions.length === 0" class="text-center py-12">
                <svg class="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                <p class="text-gray-400 text-sm">{{ hasActiveFilters() ? 'No transactions match your filters.' : 'No transactions yet. Add your first one!' }}</p>
              </div>

              <div *ngFor="let transaction of transactions"
                class="flex justify-between items-center py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    [style.background]="transaction.category?.color ? transaction.category.color + '22' : '#e5e7eb'">
                    <span class="text-base">{{ transaction.category?.icon || '💳' }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-gray-800 truncate">{{ transaction.description }}</p>
                    <p class="text-xs text-gray-400">{{ transaction.transaction_date | date:'mediumDate' }} · {{ transaction.category?.name || 'No category' }}</p>
                    <p *ngIf="transaction.notes" class="text-xs text-gray-400 italic truncate mt-0.5">{{ transaction.notes }}</p>
                    <div *ngIf="transaction.tags && transaction.tags.length" class="flex flex-wrap gap-1 mt-1">
                      <span *ngFor="let tag of transaction.tags"
                        class="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                        [style.background-color]="tag.color">{{ tag.name }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-4 shrink-0">
                  <span [class]="transaction.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                    {{ transaction.type === 'income' ? '+' : '-' }}{{ transaction.amount | currencySymbol }}
                  </span>
                  <!-- Attachment icon -->
                  <button *ngIf="transaction.attachment_path"
                    (click)="previewAttachment(transaction)"
                    class="p-1 text-primary-400 hover:text-primary-600 transition-colors" title="View attachment">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                  </button>
                  <button (click)="editTransaction(transaction)" class="p-1 text-gray-400 hover:text-primary-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteTransaction(transaction.id)" class="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Pagination -->
              <div *ngIf="totalPages > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>Page {{ currentPage }} of {{ totalPages }}</span>
                  <span class="text-gray-300">|</span>
                  <span>{{ totalItems }} total</span>
                </div>

                <div class="flex items-center gap-2">
                  <button (click)="onPageChange(currentPage - 1)" [disabled]="currentPage <= 1"
                    class="px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>

                  <button *ngFor="let p of pages" (click)="onPageChange(p)"
                    class="min-w-[2rem] px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                    [class.bg-primary-600]="p === currentPage"
                    [class.text-white]="p === currentPage"
                    [class.text-gray-600]="p !== currentPage"
                    [class.border]="p !== currentPage"
                    [class.border-gray-200]="p !== currentPage"
                    [class.hover:bg-gray-50]="p !== currentPage">
                    {{ p }}
                  </button>

                  <button (click)="onPageChange(currentPage + 1)" [disabled]="currentPage >= totalPages"
                    class="px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>

                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <label for="perPage">Show</label>
                  <select id="perPage" [value]="perPage" (change)="onPerPageChange(+$any($event.target).value)"
                    class="px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option [value]="10">10</option>
                    <option [value]="20">20</option>
                    <option [value]="50">50</option>
                    <option [value]="100">100</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          </div>
        </div>

    <!-- Attachment Preview Modal -->
    <div *ngIf="previewTransaction" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60" (click)="closePreview()">
      <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Modal header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 truncate">{{ previewTransaction.description }}</p>
            <p class="text-xs text-gray-400">{{ previewTransaction.transaction_date | date:'mediumDate' }}</p>
          </div>
          <div class="flex items-center gap-3 ml-4 shrink-0">
            <button (click)="deleteAttachment(previewTransaction)"
              class="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
            <button (click)="closePreview()" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <!-- Modal body -->
        <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
          <div *ngIf="previewLoading" class="text-gray-400 text-center py-12">
            <svg class="w-8 h-8 mx-auto mb-2 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading…
          </div>
          <img *ngIf="!previewLoading && previewIsImage && previewObjectUrl"
            [src]="previewObjectUrl" alt="Receipt"
            class="max-w-full max-h-[70vh] rounded-lg shadow object-contain" />
          <div *ngIf="!previewLoading && !previewIsImage && previewObjectUrl"
            class="text-center">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-gray-500 text-sm mb-3">PDF attachment</p>
            <a [href]="previewObjectUrl" target="_blank"
              class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Open PDF
            </a>
          </div>
          <div *ngIf="!previewLoading && !previewObjectUrl" class="text-gray-400 text-sm">Failed to load attachment.</div>
        </div>
      </div>
    </div>
  </ng-template>
  `
})
export class TransactionsComponent implements OnInit {
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

  filtersOpen = true;

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
    if (this.filterSearch)            n++;
    if (this.filterNotesSearch)       n++;
    if (this.filterType)              n++;
    if (this.filterCategoryId)        n++;
    if (this.filterDateFrom)          n++;
    if (this.filterDateTo)            n++;
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
  newTagColor = '#6366f1';
  isCreatingTag = false;
  tagError = '';

  previewTransaction: Transaction | null = null;
  previewObjectUrl: string | null = null;
  previewIsImage = false;
  previewLoading = false;

  private searchTimeout: any;
  private slowTimeout: any;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private tagService: TagService,
    private financialService: FinancialService,
    private authService: AuthService,
    private router: Router,
    public currencyService: CurrencyService
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
    this.tagService.tags$.subscribe(tags => this.availableTags = tags);
    this.tagService.loadTags();
    this.loadCategories();
    this.loadTransactions();
  }

  private saveFilters(): void {
    sessionStorage.setItem('txFilters', JSON.stringify({
      filtersOpen:      this.filtersOpen,
      filterSearch:     this.filterSearch,
      filterNotesSearch: this.filterNotesSearch,
      filterType:       this.filterType,
      filterCategoryId: this.filterCategoryId,
      filterDateFrom:   this.filterDateFrom,
      filterDateTo:     this.filterDateTo,
      filterAmountMin:  this.filterAmountMin,
      filterAmountMax:  this.filterAmountMax,
      filterTagIds:     this.filterTagIds,
      currentPage:      this.currentPage,
      perPage:          this.perPage,
    }));
  }

  private restoreFilters(): void {
    try {
      const raw = sessionStorage.getItem('txFilters');
      if (!raw) return;
      const f = JSON.parse(raw);
      this.filtersOpen       = f.filtersOpen      ?? true;
      this.filterSearch      = f.filterSearch      ?? '';
      this.filterNotesSearch = f.filterNotesSearch ?? '';
      this.filterType        = f.filterType        ?? '';
      this.filterCategoryId  = f.filterCategoryId  ?? undefined;
      this.filterDateFrom    = f.filterDateFrom    ?? '';
      this.filterDateTo      = f.filterDateTo      ?? '';
      this.filterAmountMin   = f.filterAmountMin   ?? undefined;
      this.filterAmountMax   = f.filterAmountMax   ?? undefined;
      this.filterTagIds      = f.filterTagIds      ?? [];
      this.currentPage       = f.currentPage       ?? 1;
      this.perPage           = f.perPage           ?? 20;
    } catch { /* ignore corrupt state */ }
  }

  onSearchInput(event: Event): void {
    this.filterSearch = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.saveFilters();
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadTransactions(), 350);
  }

  onFilterChange(field: string, value: string): void {
    if (field === 'type')        this.filterType = value;
    if (field === 'category_id') this.filterCategoryId = value ? +value : undefined;
    if (field === 'date_from')   this.filterDateFrom = value;
    if (field === 'date_to')     this.filterDateTo = value;
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
    else                  this.filterAmountMax = val;
    this.currentPage = 1;
    this.saveFilters();
    clearTimeout(this.slowTimeout);
    this.slowTimeout = setTimeout(() => this.loadTransactions(), 500);
  }

  toggleFilterTag(tagId: number): void {
    const idx = this.filterTagIds.indexOf(tagId);
    if (idx === -1) this.filterTagIds = [...this.filterTagIds, tagId];
    else            this.filterTagIds = this.filterTagIds.filter(id => id !== tagId);
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
    this.filterSearch      = '';
    this.filterNotesSearch = '';
    this.filterType        = '';
    this.filterCategoryId  = undefined;
    this.filterDateFrom    = '';
    this.filterDateTo      = '';
    this.filterAmountMin   = undefined;
    this.filterAmountMax   = undefined;
    this.filterTagIds      = [];
    this.currentPage       = 1;
    this.perPage           = 20;
    sessionStorage.removeItem('txFilters');
    this.loadTransactions();
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
    this.transactionService.getTransactions({
      search:        this.filterSearch       || undefined,
      notes_search:  this.filterNotesSearch  || undefined,
      type:          this.filterType         || undefined,
      category_id:   this.filterCategoryId,
      date_from:     this.filterDateFrom     || undefined,
      date_to:       this.filterDateTo       || undefined,
      amount_min:    this.filterAmountMin,
      amount_max:    this.filterAmountMax,
      tag_ids:       this.filterTagIds.length ? this.filterTagIds : undefined,
      page:          this.currentPage,
      per_page:      this.perPage,
    }).subscribe({
      next: (response) => {
        this.transactions = response.data;
        this.currentPage   = response.current_page;
        this.totalItems    = response.total;
        this.totalPages    = response.last_page;
        this.perPage       = response.per_page;
        this.isLoading     = false;
      },
      error: (error) => { this.errorMessage = error.message || 'Failed to load transactions'; this.isLoading = false; }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentError = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.attachmentError = 'Only JPG, PNG, or PDF files are allowed.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.attachmentError = 'File must be under 5 MB.';
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
      this.selectedTagIds.forEach(id => fd.append('tag_ids[]', String(id)));
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
        if (this.removeAttachmentOnSave && this.editingTransaction?.attachment_path && !this.pendingFile) {
          this.transactionService.deleteAttachment(saved.id).subscribe({
            next: () => { this.isSaving = false; this.loadTransactions(); this.cancelEdit(); },
            error: () => { this.isSaving = false; this.loadTransactions(); this.cancelEdit(); }
          });
        } else {
          this.isSaving = false;
          this.loadTransactions();
          this.cancelEdit();
        }
      },
      error: (error) => { this.isSaving = false; this.errorMessage = error.message || 'Failed to save transaction'; }
    });
  }

  editTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.pendingFile = null;
    this.attachmentError = '';
    this.removeAttachmentOnSave = false;
    this.selectedTagIds = (transaction.tags ?? []).map(t => t.id);
    this.tagError = '';
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id ? String(transaction.category_id) : '',
      notes: transaction.notes ?? null,
    });
    this.showForm = true;
  }

  deleteTransaction(id: number): void {
    if (!confirm('Delete this transaction?')) return;
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => this.loadTransactions(),
      error: (error) => this.errorMessage = error.message || 'Failed to delete transaction'
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
      }
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
    if (!confirm('Delete this attachment?')) return;
    this.transactionService.deleteAttachment(transaction.id).subscribe({
      next: () => {
        transaction.attachment_path = null;
        this.closePreview();
        this.loadTransactions();
      },
      error: (error) => this.errorMessage = error.message || 'Failed to delete attachment'
    });
  }

  exportCsv(): void {
    this.transactionService.exportTransactions({
      search:       this.filterSearch       || undefined,
      notes_search: this.filterNotesSearch  || undefined,
      type:         this.filterType         || undefined,
      category_id:  this.filterCategoryId,
      date_from:    this.filterDateFrom     || undefined,
      date_to:      this.filterDateTo       || undefined,
      amount_min:   this.filterAmountMin,
      amount_max:   this.filterAmountMax,
      tag_ids:      this.filterTagIds.length ? this.filterTagIds : undefined,
    });
  }

  getTagById(id: number): Tag | undefined {
    return this.availableTags.find(t => t.id === id);
  }

  removeFormTag(tagId: number): void {
    this.selectedTagIds = this.selectedTagIds.filter(id => id !== tagId);
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
    this.tagService.createTag({ name, color: this.newTagColor }).subscribe({
      next: (tag) => {
        if (!this.selectedTagIds.includes(tag.id)) {
          this.selectedTagIds = [...this.selectedTagIds, tag.id];
        }
        this.newTagName = '';
        this.newTagColor = '#6366f1';
        this.isCreatingTag = false;
      },
      error: (err) => {
        this.tagError = err?.message || 'Failed to create tag';
        this.isCreatingTag = false;
      }
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
    this.newTagColor = '#6366f1';
    this.transactionForm.reset({
      type: 'expense',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: null,
    });
  }
}
