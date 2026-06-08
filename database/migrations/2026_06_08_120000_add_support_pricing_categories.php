<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('pricing_categories')) {
            return;
        }

        Schema::table('pricing_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('pricing_categories', 'service_type')) {
                $table->string('service_type', 40)->default('new_website')->after('icon')->index();
            }
        });

        DB::table('pricing_categories')
            ->whereNull('service_type')
            ->orWhere('service_type', '')
            ->update(['service_type' => 'new_website']);

        $supportCategories = [
            [
                'name' => 'Website Maintenance',
                'slug' => 'website-maintenance',
                'description' => 'Regular care plans to keep an existing website updated, healthy, backed up, and tidy.',
                'icon' => 'wrench',
                'plans' => [
                    ['24 Hours', 30000, 50, 40, ['Same-day health check', 'Critical updates', 'Manual backup', 'Minor cleanup', 'Action summary']],
                    ['1 Week', 65000, 110, 88, ['Weekly maintenance window', 'Plugin/theme updates', 'Backup verification', 'Performance check', 'Security scan'], true],
                    ['1 Month', 150000, 250, 200, ['Full month maintenance', 'Weekly update cycle', 'Monthly report', 'Priority support', 'Restore point checks']],
                ],
            ],
            [
                'name' => 'Bug Fixes / Issue Resolution',
                'slug' => 'bug-fixes-issue-resolution',
                'description' => 'Fix broken pages, forms, layouts, checkout issues, integrations, and other website problems.',
                'icon' => 'bug',
                'plans' => [
                    ['24 Hours', 45000, 75, 60, ['Urgent issue diagnosis', 'Single critical fix', 'Form/layout troubleshooting', 'Same-day update', 'Fix summary']],
                    ['1 Week', 90000, 150, 120, ['Up to 3 related issues', 'Plugin conflict checks', 'Responsive fixes', 'Basic QA', 'Priority queue'], true],
                    ['1 Month', 180000, 300, 240, ['Ongoing issue resolution', 'Multiple fix batches', 'Monitoring', 'Regression checks', 'Monthly repair report']],
                ],
            ],
            [
                'name' => 'Website Management',
                'slug' => 'website-management',
                'description' => 'Ongoing help with publishing, products, content, landing pages, and website operations.',
                'icon' => 'settings',
                'plans' => [
                    ['24 Hours', 35000, 60, 48, ['Rapid content update', 'Up to 3 edits', 'Image replacement', 'Menu/link update', 'Completion summary']],
                    ['1 Week', 85000, 140, 112, ['Weekly update batch', 'Up to 15 edits', 'Product/page publishing', 'Landing page updates', 'Analytics check'], true],
                    ['1 Month', 220000, 365, 292, ['Monthly website management', 'Dedicated task queue', 'Campaign page updates', 'Catalogue support', 'Monthly status report']],
                ],
            ],
            [
                'name' => 'Security Updates / Backups',
                'slug' => 'security-updates-backups',
                'description' => 'Protect an existing website with updates, backups, restore checks, and security hardening.',
                'icon' => 'shield',
                'plans' => [
                    ['24 Hours', 40000, 70, 56, ['Urgent backup setup', 'Security checklist', 'Manual backup run', 'Login hardening', 'Immediate recommendations']],
                    ['1 Week', 95000, 160, 128, ['Weekly backup plan', 'Security plugin setup', 'Update checks', 'Restore point confirmation', 'Security report'], true],
                    ['1 Month', 200000, 335, 268, ['Daily backup monitoring', 'Restore test', 'Firewall configuration', 'Malware monitoring', 'Emergency recovery support']],
                ],
            ],
        ];

        $baseSort = (int) DB::table('pricing_categories')->max('sort_order');
        foreach ($supportCategories as $categoryIndex => $category) {
            $categoryId = DB::table('pricing_categories')->where('slug', $category['slug'])->value('id');
            $categoryPayload = [
                'name' => $category['name'],
                'slug' => $category['slug'],
                'description' => $category['description'],
                'icon' => $category['icon'],
                'service_type' => 'existing_website',
                'is_active' => true,
                'sort_order' => $baseSort + $categoryIndex + 1,
                'updated_at' => now(),
            ];

            if ($categoryId) {
                DB::table('pricing_categories')->where('id', $categoryId)->update($categoryPayload);
            } else {
                $categoryPayload['created_at'] = now();
                $categoryId = DB::table('pricing_categories')->insertGetId($categoryPayload);
            }

            foreach ($category['plans'] as $planIndex => $plan) {
                [$name, $ngn, $usd, $gbp, $features] = $plan;
                $popular = (bool) ($plan[5] ?? false);
                $slug = Str::slug($name);
                $planId = DB::table('pricing_plans')
                    ->where('pricing_category_id', $categoryId)
                    ->where('slug', $slug)
                    ->value('id');
                $planPayload = [
                    'pricing_category_id' => $categoryId,
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $name . ' package for ' . strtolower($category['name']) . '.',
                    'billing_type' => 'one_time',
                    'monthly_enabled' => false,
                    'prices_json' => json_encode(['NGN' => $ngn, 'USD' => $usd, 'GBP' => $gbp]),
                    'promo_prices_json' => json_encode([]),
                    'discount_percentage' => 0,
                    'is_active' => true,
                    'is_popular' => $popular,
                    'sort_order' => $planIndex + 1,
                    'updated_at' => now(),
                ];

                if ($planId) {
                    DB::table('pricing_plans')->where('id', $planId)->update($planPayload);
                } else {
                    $planPayload['version'] = 1;
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
        if (!Schema::hasTable('pricing_categories')) {
            return;
        }

        DB::table('pricing_categories')->where('service_type', 'existing_website')->delete();

        Schema::table('pricing_categories', function (Blueprint $table) {
            if (Schema::hasColumn('pricing_categories', 'service_type')) {
                $table->dropColumn('service_type');
            }
        });
    }
};
