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
                'prices' => ['NGN' => 350000, 'USD' => 500, 'GBP' => 400],
                'description' => 'A simple sales page that explains your offer and collects enquiries.',
                'features' => [
                    'One sales landing page',
                    'Mobile-friendly design',
                    'Product or service details',
                    'Contact form',
                    'WhatsApp button',
                    'Thank-you page',
                    'Basic visitor tracking',
                    'One round of changes',
                ],
            ],
            'growth' => [
                'prices' => ['NGN' => 650000, 'USD' => 900, 'GBP' => 720],
                'description' => 'More pages and automatic emails to help turn enquiries into bookings.',
                'features' => [
                    'Up to 3 sales pages',
                    'Mobile-friendly design',
                    'Product or service details',
                    'Contact form',
                    'WhatsApp or booking button',
                    'Thank-you page',
                    '3 automatic follow-up emails',
                    'Visitor and enquiry tracking',
                    'Two rounds of changes',
                ],
            ],
            'scale' => [
                'prices' => ['NGN' => 1100000, 'USD' => 1550, 'GBP' => 1250],
                'description' => 'A complete sales flow that can take payments and follow up with customers.',
                'features' => [
                    'Up to 5 sales pages',
                    'Mobile-friendly design',
                    'Product or service details',
                    'Contact or order form',
                    'Online payment integration',
                    'Payment confirmation page',
                    'WhatsApp or booking button',
                    '5 automatic follow-up emails',
                    'Customer management tool connection',
                    'Visitor and enquiry tracking',
                    'Three rounds of changes',
                ],
            ],
        ];

        foreach ($plans as $slug => $package) {
            $planId = DB::table('pricing_plans')
                ->where('pricing_category_id', $categoryId)
                ->where('slug', $slug)
                ->value('id');
            if (! $planId) {
                continue;
            }

            DB::table('pricing_plans')->where('id', $planId)->update([
                'description' => $package['description'],
                'prices_json' => json_encode($package['prices']),
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);
            DB::table('pricing_plan_features')->where('pricing_plan_id', $planId)->delete();

            foreach ($package['features'] as $index => $title) {
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
        // Preserve any later package edits made through the admin dashboard.
    }
};
