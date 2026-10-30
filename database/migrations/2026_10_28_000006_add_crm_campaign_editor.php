<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_campaigns', function (Blueprint $table) {
            $table->string('editor_type', 20)->default('default');
        });
    }

    public function down(): void
    {
        Schema::table('crm_campaigns', fn (Blueprint $table) => $table->dropColumn('editor_type'));
    }
};
