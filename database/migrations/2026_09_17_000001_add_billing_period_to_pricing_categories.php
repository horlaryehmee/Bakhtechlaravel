<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_categories', function (Blueprint $table) {
            $table->string('billing_period', 20)->default('project')->after('service_type');
        });

        DB::table('pricing_categories')
            ->whereExists(function ($query) {
                $query->selectRaw('1')
                    ->from('pricing_plans')
                    ->whereColumn('pricing_plans.pricing_category_id', 'pricing_categories.id')
                    ->where('pricing_plans.billing_type', 'monthly');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('pricing_plans')
                    ->whereColumn('pricing_plans.pricing_category_id', 'pricing_categories.id')
                    ->where('pricing_plans.billing_type', '!=', 'monthly');
            })
            ->update(['billing_period' => 'month']);
    }

    public function down(): void
    {
        Schema::table('pricing_categories', function (Blueprint $table) {
            $table->dropColumn('billing_period');
        });
    }
};
