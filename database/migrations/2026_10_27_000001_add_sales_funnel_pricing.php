<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        DB::table('pricing_categories')->insertOrIgnore([
            'name' => 'Sales Funnels',
            'slug' => 'sales-funnels',
            'description' => 'Conversion-focused landing pages and follow-up flows that turn visitors into qualified leads and customers.',
            'icon' => 'filter',
            'service_type' => 'new_website',
            'billing_period' => 'project',
            'is_active' => true,
            'sort_order' => 5,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $categoryId = DB::table('pricing_categories')->where('slug', 'sales-funnels')->value('id');
        $plans = [
            ['Starter', 'A focused lead generation funnel for one offer.', 250000, 350, 280, [
                'Strategy and offer planning', 'One responsive landing page', 'Lead capture form',
                'Thank-you page', 'Basic analytics and conversion tracking', 'One revision round',
            ]],
            ['Growth', 'A complete funnel with automated lead follow-up.', 500000, 700, 560, [
                'Strategy and offer planning', 'Up to three funnel pages', 'Lead capture and thank-you flow',
                'Email platform integration', 'Three-email follow-up sequence', 'Analytics and conversion tracking',
                'Two revision rounds',
            ]],
            ['Scale', 'A tailored funnel with testing and advanced integrations.', 900000, 1250, 1000, [
                'Conversion strategy workshop', 'Up to five funnel pages', 'Lead capture and qualification',
                'CRM or booking integration', 'Five-email follow-up sequence', 'A/B test setup',
                'Advanced analytics and conversion tracking', 'Three revision rounds',
            ]],
        ];

        foreach ($plans as $index => [$name, $description, $ngn, $usd, $gbp, $features]) {
            $slug = strtolower($name);
            if (DB::table('pricing_plans')->where('pricing_category_id', $categoryId)->where('slug', $slug)->exists()) {
                continue;
            }

            $planId = DB::table('pricing_plans')->insertGetId([
                'pricing_category_id' => $categoryId,
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'billing_type' => 'one_time',
                'monthly_enabled' => false,
                'prices_json' => json_encode(['NGN' => $ngn, 'USD' => $usd, 'GBP' => $gbp]),
                'promo_prices_json' => json_encode([]),
                'discount_percentage' => 0,
                'is_active' => true,
                'is_popular' => $index === 1,
                'sort_order' => $index + 1,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($features as $featureIndex => $title) {
                DB::table('pricing_plan_features')->insert([
                    'pricing_plan_id' => $planId,
                    'pricing_feature_id' => null,
                    'title' => $title,
                    'description' => null,
                    'group_name' => 'Included',
                    'is_included' => true,
                    'sort_order' => $featureIndex + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        foreach (['NGN', 'USD', 'GBP'] as $currency) {
            Cache::forget("public:pricing:{$currency}");
        }
    }

    public function down(): void
    {
        DB::table('pricing_categories')->where('slug', 'sales-funnels')->delete();
        foreach (['NGN', 'USD', 'GBP'] as $currency) {
            Cache::forget("public:pricing:{$currency}");
        }
    }
};
