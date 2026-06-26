import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <button routerLink="/dashboard" class="text-gray-700 hover:text-gray-900 mr-4">← Back</button>
              <h1 class="text-2xl font-bold text-gray-800">Investments</h1>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Investment Portfolio</h2>
          <p class="text-gray-600">Track your investments and monitor their performance over time.</p>
          <p class="text-gray-500 mt-2">Investment tracking interface coming soon...</p>
        </div>
      </div>
    </div>
  `
})
export class InvestmentsComponent implements OnInit {
  investmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.investmentForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      initial_amount: ['', [Validators.required, Validators.min(0)]],
      current_amount: ['', [Validators.required, Validators.min(0)]],
      purchase_date: ['', Validators.required]
    });
  }

  ngOnInit(): void {}
}
