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

        $plans = [
            'starter' => [
                'One sales landing page',
                'Mobile-friendly design',
                'Clear product or service information',
                'Contact form',
                'WhatsApp button',
                'Thank-you page',
                'Basic visitor tracking',
                'One round of changes',
            ],
            'growth' => [
                'Up to 3 sales pages',
                'Mobile-friendly design',
                'Contact form',
                'WhatsApp or booking button',
                'Thank-you page',
                'Email signup',
                '3 automatic follow-up emails',
                'Visitor and enquiry tracking',
                'Two rounds of changes',
            ],
            'scale' => [
                'Up to 5 sales pages',
                'Mobile-friendly design',
                'Contact form with lead questions',
                'WhatsApp or booking button',
                'Thank-you page',
                'Email signup',
                '5 automatic follow-up emails',
                'Customer management tool connection',
                'Visitor and enquiry tracking',
                'Three rounds of changes',
            ],
        ];

        foreach ($plans as $slug => $features) {
            $planId = DB::table('pricing_plans')
                ->where('pricing_category_id', $categoryId)
                ->where('slug', $slug)
                ->value('id');
            if (! $planId) {
                continue;
            }

            DB::table('pricing_plan_features')->where('pricing_plan_id', $planId)->delete();
            DB::table('pricing_plans')->where('id', $planId)->update([
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);

            foreach ($features as $index => $title) {
                DB::table('pricing_plan_features')->insert([
                    'pricing_plan_id' => $planId,
                    'pricing_feature_id' => null,
                    'title' => $title,
                    'description' => null,
                    'group_name' => 'Included',
                    'is_included' => true,
                    'sort_order' => $index + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        foreach (['NGN', 'USD', 'GBP'] as $currency) {
            Cache::forget("public:pricing:{$currency}");
        }
    }

    public function down(): void
    {
        // Keep any later edits made through the admin dashboard.
    }
};
