import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SidebarComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto">
        <header class="bg-teal-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Investments</h2>
            </div>
          </div>
        </header>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-white p-8 rounded-xl shadow-md text-center">
            <svg class="w-16 h-16 mx-auto text-teal-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Investment Portfolio</h2>
            <p class="text-gray-500">Track your investments and monitor their performance over time.</p>
            <p class="text-gray-400 mt-1 text-sm">Investment tracking interface coming soon...</p>
          </div>
        </div>
      </main>
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
