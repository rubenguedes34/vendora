import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <button routerLink="/dashboard" class="text-gray-700 hover:text-gray-900 mr-4">← Back</button>
              <h1 class="text-2xl font-bold text-gray-800">Transactions</h1>
            </div>
            <button 
              (click)="showForm = !showForm"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {{ showForm ? 'Cancel' : 'Add Transaction' }}
            </button>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Add/Edit Form -->
        <div *ngIf="showForm" class="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">{{ editingTransaction ? 'Edit Transaction' : 'Add New Transaction' }}</h2>
          
          <form [formGroup]="transactionForm" (ngSubmit)="onSubmit()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <input 
                  type="text" 
                  formControlName="description"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  formControlName="amount"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Type</label>
                <select 
                  formControlName="type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Date</label>
                <input 
                  type="date" 
                  formControlName="transaction_date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="md:col-span-2">
                <label class="block text-gray-700 text-sm font-bold mb-2">Category ID</label>
                <input 
                  type="number" 
                  formControlName="category_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category ID"
                />
              </div>
            </div>

            <div class="mt-4 flex space-x-3">
              <button 
                type="submit"
                [disabled]="transactionForm.invalid"
                class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {{ editingTransaction ? 'Update' : 'Add' }} Transaction
              </button>
              <button 
                type="button"
                (click)="cancelEdit()"
                class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Transactions List -->
        <div class="bg-white rounded-lg shadow-md">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Transaction History</h2>
            
            <div *ngIf="transactions.length === 0" class="text-gray-500 text-center py-8">
              No transactions found. Add your first transaction!
            </div>

            <div *ngFor="let transaction of transactions" class="flex justify-between items-center py-4 border-b last:border-b-0">
              <div class="flex-1">
                <p class="font-medium text-gray-800">{{ transaction.description }}</p>
                <p class="text-sm text-gray-500">{{ transaction.transaction_date | date:'mediumDate' }}</p>
                <p class="text-sm text-gray-500">{{ transaction.category?.name || 'No category' }}</p>
              </div>
              <div class="flex items-center space-x-4">
                <p [class]="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'" class="font-semibold text-lg">
                  {{ transaction.type === 'income' ? '+' : '-' }}€{{ transaction.amount }}
                </p>
                <button 
                  (click)="editTransaction(transaction)"
                  class="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button 
                  (click)="deleteTransaction(transaction.id)"
                  class="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TransactionsComponent implements OnInit {
  transactions: any[] = [];
  transactionForm: FormGroup;
  showForm = false;
  editingTransaction: any = null;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private router: Router
  ) {
    this.transactionForm = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      type: ['expense', Validators.required],
      transaction_date: [new Date().toISOString().split('T')[0], Validators.required],
      category_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.transactionService.getTransactions().subscribe({
      next: (data) => {
        this.transactions = data;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) return;

    if (this.editingTransaction) {
      this.transactionService.updateTransaction(this.editingTransaction.id, this.transactionForm.value).subscribe({
        next: () => {
          this.loadTransactions();
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Error updating transaction:', error);
        }
      });
    } else {
      this.transactionService.createTransaction(this.transactionForm.value).subscribe({
        next: () => {
          this.loadTransactions();
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Error creating transaction:', error);
        }
      });
    }
  }

  editTransaction(transaction: any): void {
    this.editingTransaction = transaction;
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id
    });
    this.showForm = true;
  }

  deleteTransaction(id: number): void {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.transactionService.deleteTransaction(id).subscribe({
        next: () => {
          this.loadTransactions();
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingTransaction = null;
    this.showForm = false;
    this.transactionForm.reset({
      type: 'expense',
      transaction_date: new Date().toISOString().split('T')[0]
    });
  }
}
