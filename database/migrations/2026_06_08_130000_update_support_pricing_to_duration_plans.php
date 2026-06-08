<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pricing_categories') || !Schema::hasTable('pricing_plans')) {
            return;
        }

        $supportCategories = [
            'website-maintenance' => [
                'plans' => [
                    ['24 Hours', 30000, 50, 40, ['Same-day health check', 'Critical updates', 'Manual backup', 'Minor cleanup', 'Action summary']],
                    ['1 Week', 65000, 110, 88, ['Weekly maintenance window', 'Plugin/theme updates', 'Backup verification', 'Performance check', 'Security scan'], true],
                    ['1 Month', 150000, 250, 200, ['Full month maintenance', 'Weekly update cycle', 'Monthly report', 'Priority support', 'Restore point checks']],
                ],
            ],
            'bug-fixes-issue-resolution' => [
                'plans' => [
                    ['24 Hours', 45000, 75, 60, ['Urgent issue diagnosis', 'Single critical fix', 'Form/layout troubleshooting', 'Same-day update', 'Fix summary']],
                    ['1 Week', 90000, 150, 120, ['Up to 3 related issues', 'Plugin conflict checks', 'Responsive fixes', 'Basic QA', 'Priority queue'], true],
                    ['1 Month', 180000, 300, 240, ['Ongoing issue resolution', 'Multiple fix batches', 'Monitoring', 'Regression checks', 'Monthly repair report']],
                ],
            ],
            'website-management' => [
                'plans' => [
                    ['24 Hours', 35000, 60, 48, ['Rapid content update', 'Up to 3 edits', 'Image replacement', 'Menu/link update', 'Completion summary']],
                    ['1 Week', 85000, 140, 112, ['Weekly update batch', 'Up to 15 edits', 'Product/page publishing', 'Landing page updates', 'Analytics check'], true],
                    ['1 Month', 220000, 365, 292, ['Monthly website management', 'Dedicated task queue', 'Campaign page updates', 'Catalogue support', 'Monthly status report']],
                ],
            ],
            'security-updates-backups' => [
                'plans' => [
                    ['24 Hours', 40000, 70, 56, ['Urgent backup setup', 'Security checklist', 'Manual backup run', 'Login hardening', 'Immediate recommendations']],
                    ['1 Week', 95000, 160, 128, ['Weekly backup plan', 'Security plugin setup', 'Update checks', 'Restore point confirmation', 'Security report'], true],
                    ['1 Month', 200000, 335, 268, ['Daily backup monitoring', 'Restore test', 'Firewall configuration', 'Malware monitoring', 'Emergency recovery support']],
                ],
            ],
        ];

        foreach ($supportCategories as $categorySlug => $category) {
            $categoryRow = DB::table('pricing_categories')
                ->where('slug', $categorySlug)
                ->where('service_type', 'existing_website')
                ->first(['id', 'name']);

            if (!$categoryRow) {
                continue;
            }

            $durationSlugs = collect($category['plans'])
                ->map(fn ($plan) => Str::slug($plan[0]))
                ->all();

            DB::table('pricing_plans')
                ->where('pricing_category_id', $categoryRow->id)
                ->whereNotIn('slug', $durationSlugs)
                ->update([
                    'is_active' => false,
                    'updated_at' => now(),
                ]);

            foreach ($category['plans'] as $planIndex => $plan) {
                [$name, $ngn, $usd, $gbp, $features] = $plan;
                $popular = (bool) ($plan[5] ?? false);
                $planSlug = Str::slug($name);
                $planPayload = [
                    'pricing_category_id' => $categoryRow->id,
                    'name' => $name,
                    'slug' => $planSlug,
                    'description' => $name . ' response window for ' . strtolower($categoryRow->name) . '.',
                    'billing_type' => 'one_time',
                    'monthly_enabled' => false,
                    'prices_json' => json_encode(['NGN' => $ngn, 'USD' => $usd, 'GBP' => $gbp]),
                    'promo_prices_json' => json_encode([]),
                    'discount_percentage' => 0,
                    'is_active' => true,
                    'is_popular' => $popular,
                    'sort_order' => $planIndex + 1,
                    'version' => 1,
                    'updated_at' => now(),
                ];

                $planId = DB::table('pricing_plans')
                    ->where('pricing_category_id', $categoryRow->id)
                    ->where('slug', $planSlug)
                    ->value('id');

                if ($planId) {
                    DB::table('pricing_plans')->where('id', $planId)->update($planPayload);
                } else {
                    $planPayload['created_at'] = now();
                    $planId = DB::table('pricing_plans')->insertGetId($planPayload);
                }

                DB::table('pricing_plan_features')->where('pricing_plan_id', $planId)->delete();
                foreach ($features as $featureIndex => $featureTitle) {
                    DB::table('pricing_plan_features')->insert([
                        'pricing_plan_id' => $planId,
                        'pricing_feature_id' => null,
                        'title' => $featureTitle,
                        'description' => '',
                        'group_name' => 'Support',
                        'is_included' => true,
                        'sort_order' => $featureIndex + 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        //
    }
};
