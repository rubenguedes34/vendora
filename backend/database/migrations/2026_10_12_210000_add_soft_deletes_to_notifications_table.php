<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Deleted notifications are kept (hidden) so the generator remembers them and does not recreate them.
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
