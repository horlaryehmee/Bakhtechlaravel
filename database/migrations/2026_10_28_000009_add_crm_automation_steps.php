<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_automations', function (Blueprint $table) {
            $table->json('steps_json')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('crm_automations', function (Blueprint $table) {
            $table->dropColumn('steps_json');
        });
    }
};
