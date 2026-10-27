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

        $packages = [
            'starter' => [
                'description' => 'Launch one clear offer and capture enquiries from a single landing page.',
                'features' => [
                    'One offer and audience planning call',
                    'One mobile-friendly landing page (up to 6 sections)',
                    'Headline, section copy, and call-to-action writing',
                    'One lead form with email notifications',
                    'One thank-you page',
                    'WhatsApp or calendar booking link',
                    'Google Analytics 4 and one conversion event',
                    'Basic search and social sharing metadata',
                    'Form and mobile-device testing before launch',
                    'One revision round and handover walkthrough',
                ],
            ],
            'growth' => [
                'description' => 'Move leads from the first click to a booked call with automated follow-up.',
                'features' => [
                    'Offer, audience, and funnel planning workshop',
                    'Up to 3 mobile-friendly pages (landing, thank-you, booking or offer)',
                    'Conversion copy for all 3 pages',
                    'Lead form with qualification questions',
                    'Email platform connection and lead list setup',
                    '3 automated follow-up emails',
                    'Calendar or WhatsApp booking integration',
                    'Google Analytics 4 and key conversion events',
                    'Form, email, and mobile-device testing',
                    'Two revision rounds and handover walkthrough',
                ],
            ],
            'scale' => [
                'description' => 'Build a fuller acquisition flow with lead routing, testing, and reporting.',
                'features' => [
                    'Conversion strategy and customer journey workshop',
                    'Up to 5 mobile-friendly funnel pages',
                    'Conversion copy for all 5 pages',
                    'Lead capture form with qualification and routing',
                    'One CRM or email platform integration',
                    '5 automated follow-up emails',
                    'Calendar or payment checkout integration',
                    'A/B test setup for one landing-page element',
                    'Google Analytics 4, key events, and reporting dashboard',
                    'End-to-end form, automation, and mobile testing',
                    'Three revision rounds and team handover session',
                ],
            ],
        ];

        foreach ($packages as $slug => $package) {
            $planId = DB::table('pricing_plans')
                ->where('pricing_category_id', $categoryId)
                ->where('slug', $slug)
                ->value('id');
            if (! $planId) {
                continue;
            }

            DB::table('pricing_plans')->where('id', $planId)->update([
                'description' => $package['description'],
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
        // Package copy may have been edited in the admin dashboard after this migration.
    }
};
