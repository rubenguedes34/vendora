<?php

return [
    'greeting' => 'Olá :name,',
    'open_app' => 'Abrir o Vendora',
    'footer_account' => 'Vendora',
    'footer' => 'Vendora. Podes desligar as notificações por email nas definições da tua Conta.',

    'alerts' => [
        'budget_exceeded' => [
            'subject' => 'Excedeste o orçamento de :category',
            'line' => 'Excedeste o orçamento de :category em :amount este mês.',
        ],
        'alert_rule_category' => [
            'subject' => 'Limite de gastos atingido: :category',
            'line' => 'Gastaste :spent em :category este mês, atingindo o teu limite de :limit.',
        ],
        'alert_rule_total' => [
            'subject' => 'Limite de gastos atingido',
            'line' => 'Gastaste :spent este mês, atingindo o teu limite de :limit.',
        ],
        'recurring_due_today' => [
            'subject' => 'Vence hoje: :description',
            'line' => ':description vence hoje.',
        ],
        'recurring_due_past' => [
            'subject' => 'Pagamento em atraso: :description',
            'line' => ':description venceu a :date.',
        ],
        'monthly_report_ready' => [
            'subject' => 'O teu relatório de :month está pronto',
            'line' => 'O resumo financeiro de :month está pronto para consultar.',
        ],
    ],

    'reset' => [
        'subject' => 'Repõe a tua palavra-passe do Vendora',
        'line' => 'Recebeste este email porque pedimos a reposição da palavra-passe da tua conta.',
        'action' => 'Repor palavra-passe',
        'expires' => 'Esta ligação expira em :count minutos. Se não pediste isto, ignora este email.',
    ],

    'verify' => [
        'subject' => 'Confirma o teu email',
        'line' => 'Confirma o teu email para terminares a configuração da conta.',
        'action' => 'Confirmar email',
        'ignore' => 'Se não criaste uma conta no Vendora, ignora este email.',
    ],
];
