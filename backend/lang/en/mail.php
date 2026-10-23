<?php

return [
    'greeting' => 'Hi :name,',
    'open_app' => 'Open Vendora',
    'footer_account' => 'Vendora',
    'footer' => 'Vendora. You can turn email notifications off in your Account settings.',

    'alerts' => [
        'budget_exceeded' => [
            'subject' => 'You exceeded your :category budget',
            'line' => 'You exceeded your :category budget by :amount this month.',
        ],
        'alert_rule_category' => [
            'subject' => 'Spending limit reached: :category',
            'line' => 'You have spent :spent on :category this month, reaching your limit of :limit.',
        ],
        'alert_rule_total' => [
            'subject' => 'Spending limit reached',
            'line' => 'You have spent :spent this month, reaching your limit of :limit.',
        ],
        'recurring_due_today' => [
            'subject' => 'Due today: :description',
            'line' => ':description is due today.',
        ],
        'recurring_due_past' => [
            'subject' => 'Payment due: :description',
            'line' => ':description was due on :date.',
        ],
        'monthly_report_ready' => [
            'subject' => 'Your :month report is ready',
            'line' => 'Your financial summary for :month is ready to view.',
        ],
    ],

    'reset' => [
        'subject' => 'Reset your Vendora password',
        'line' => 'You are receiving this email because we got a password reset request for your account.',
        'action' => 'Reset password',
        'expires' => 'This link expires in :count minutes. If you did not ask for it, you can ignore this email.',
    ],

    'verify' => [
        'subject' => 'Verify your email address',
        'line' => 'Please confirm your email address to finish setting up your account.',
        'action' => 'Verify email',
        'ignore' => 'If you did not create a Vendora account, you can ignore this email.',
    ],
];
