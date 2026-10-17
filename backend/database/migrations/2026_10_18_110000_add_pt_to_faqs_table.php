<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faqs', function (Blueprint $table) {
            $table->string('question_pt')->nullable()->after('answer');
            $table->text('answer_pt')->nullable()->after('question_pt');
        });

        // Seeded FAQs are matched by their English question; custom FAQs keep the English fallback.
        $pt = [
            'How do I add a new transaction?' => ['Como adiciono uma nova transação?', 'Vá a Transações, clique no botão +, escolha uma categoria, introduza o montante e a data e guarde. Os rendimentos são registados com valor positivo e as despesas com valor negativo. Também pode acrescentar notas e um recibo.'],
            'How do budgets work?' => ['Como funcionam os orçamentos?', 'Os orçamentos permitem definir limites de gastos mensais por categoria. Abra Orçamento, crie um orçamento para uma categoria e um mês, e a Vendora compara as suas despesas reais com o limite.'],
            'How do I track my investments?' => ['Como acompanho os meus investimentos?', 'Use a página Investimentos para adicionar posições manualmente. Pode registar o símbolo, a quantidade, o montante inicial e o valor atual. O explorador de mercado ajuda a consultar preços em tempo real.'],
            'What are recurring transactions?' => ['O que são transações recorrentes?', 'As transações recorrentes são rendimentos ou despesas regulares que se repetem, como subscrições ou o salário. Pode agendá-las e copiá-las para um novo mês para gerar a transação real quando ocorrer.'],
            'How can I see my net worth and financial health?' => ['Como vejo o meu património líquido e a minha saúde financeira?', 'O Painel mostra o seu saldo, os rendimentos e despesas mensais e o património líquido. As páginas Património líquido e Saúde financeira apresentam tendências históricas, a distribuição de ativos e a pontuação de saúde financeira.'],
            'How do I export my transactions?' => ['Como exporto as minhas transações?', 'Na página Transações, use a opção Exportar CSV para transferir os seus registos. Pode filtrar por data, categoria ou montante antes de exportar.'],
            'Can I connect my bank or sync investments automatically?' => ['Posso ligar o meu banco ou sincronizar investimentos automaticamente?', 'As ligações bancárias e a sincronização automática ainda não são suportadas. Os investimentos e os preços de mercado são acompanhados manualmente.'],
            'How do I access the admin panel?' => ['Como acedo ao painel de administração?', 'Clique em “Administração” na barra lateral. Só os utilizadores com a função de administrador ou gestor têm acesso. Os administradores podem gerir utilizadores, ver métricas e atribuir funções.'],
            'Who can see my data?' => ['Quem pode ver os meus dados?', 'As suas transações, orçamentos e investimentos pessoais só são visíveis para si. Os administradores podem gerir contas e funções, mas não podem ler os detalhes de cada transação.'],
        ];

        foreach ($pt as $question => [$questionPt, $answerPt]) {
            DB::table('faqs')->where('question', $question)->update(['question_pt' => $questionPt, 'answer_pt' => $answerPt]);
        }
    }

    public function down(): void
    {
        Schema::table('faqs', function (Blueprint $table) {
            $table->dropColumn(['question_pt', 'answer_pt']);
        });
    }
};
