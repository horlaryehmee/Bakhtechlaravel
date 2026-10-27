<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categoryId = DB::table('pricing_categories')->where('slug', 'sales-funnels')->value('id');
        if (! $categoryId) {
            return;
        }

        foreach ([
            'growth' => ['NGN' => 550000, 'USD' => 780, 'GBP' => 620],
            'scale' => ['NGN' => 850000, 'USD' => 1200, 'GBP' => 960],
        ] as $slug => $prices) {
            DB::table('pricing_plans')
                ->where('pricing_category_id', $categoryId)
                ->where('slug', $slug)
                ->update([
                    'prices_json' => json_encode($prices),
                    'version' => DB::raw('version + 1'),
                    'updated_at' => now(),
                ]);
        }

        foreach (['NGN', 'USD', 'GBP'] as $currency) {
            Cache::forget("public:pricing:{$currency}");
        }
    }

    public function down(): void
    {
        // Preserve any later price changes made through the admin dashboard.
    }
};
