<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['qb_project_types', 'qb_questions', 'qb_features'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->unsignedInteger('sort_order')->default(0)->index());
            DB::table($name)->update(['sort_order' => DB::raw('id')]);
        }
    }

    public function down(): void
    {
        foreach (['qb_project_types', 'qb_questions', 'qb_features'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('sort_order'));
        }
    }
};
