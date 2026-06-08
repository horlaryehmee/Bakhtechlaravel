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
        Schema::create('pricing_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('pricing_features', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('group_name')->nullable();
            $table->string('slug')->nullable()->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('pricing_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_category_id')->constrained('pricing_categories')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('billing_type', 20)->default('one_time');
            $table->boolean('monthly_enabled')->default(false);
            $table->json('prices_json')->nullable();
            $table->decimal('discount_percentage', 7, 2)->default(0);
            $table->json('promo_prices_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->unique(['pricing_category_id', 'slug']);
        });

        Schema::create('pricing_plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_plan_id')->constrained('pricing_plans')->cascadeOnDelete();
            $table->foreignId('pricing_feature_id')->nullable()->constrained('pricing_features')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('group_name')->nullable();
            $table->boolean('is_included')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('pricing_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_plan_id')->constrained('pricing_plans')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->json('snapshot_json');
            $table->foreignId('created_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();
            $table->unique(['pricing_plan_id', 'version']);
        });

        if (Schema::hasTable('invoice_documents')) {
            Schema::table('invoice_documents', function (Blueprint $table) {
                if (!Schema::hasColumn('invoice_documents', 'pricing_category_id')) {
                    $table->foreignId('pricing_category_id')->nullable()->after('client_id')->constrained('pricing_categories')->nullOnDelete();
                }
                if (!Schema::hasColumn('invoice_documents', 'pricing_plan_id')) {
                    $table->foreignId('pricing_plan_id')->nullable()->after('pricing_category_id')->constrained('pricing_plans')->nullOnDelete();
                }
                if (!Schema::hasColumn('invoice_documents', 'pricing_version_id')) {
                    $table->foreignId('pricing_version_id')->nullable()->after('pricing_plan_id')->constrained('pricing_versions')->nullOnDelete();
                }
                if (!Schema::hasColumn('invoice_documents', 'pricing_snapshot_json')) {
                    $table->json('pricing_snapshot_json')->nullable()->after('branding_json');
                }
                if (!Schema::hasColumn('invoice_documents', 'selected_features_snapshot_json')) {
                    $table->json('selected_features_snapshot_json')->nullable()->after('pricing_snapshot_json');
                }
            });
        }

        $this->seedDefaults();
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_documents')) {
            Schema::table('invoice_documents', function (Blueprint $table) {
                foreach (['selected_features_snapshot_json', 'pricing_snapshot_json', 'pricing_version_id', 'pricing_plan_id', 'pricing_category_id'] as $column) {
                    if (Schema::hasColumn('invoice_documents', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::dropIfExists('pricing_versions');
        Schema::dropIfExists('pricing_plan_features');
        Schema::dropIfExists('pricing_plans');
        Schema::dropIfExists('pricing_features');
        Schema::dropIfExists('pricing_categories');
    }

    private function seedDefaults(): void
    {
        $categories = [
            ['name' => 'Corporate Websites', 'slug' => 'corporate-websites', 'description' => 'Professional websites for company profiles, service businesses, and brand visibility.', 'icon' => 'building-2'],
            ['name' => 'Ecommerce Websites', 'slug' => 'ecommerce-websites', 'description' => 'Online stores with product catalogues, payments, and order workflows.', 'icon' => 'shopping-cart'],
            ['name' => 'Booking Systems', 'slug' => 'booking-systems', 'description' => 'Appointment, scheduling, calendar, and service booking website systems.', 'icon' => 'calendar-days'],
            ['name' => 'Custom Development', 'slug' => 'custom-development', 'description' => 'Tailored portals, dashboards, integrations, and advanced business workflows.', 'icon' => 'code-2'],
        ];

        foreach ($categories as $index => $category) {
            DB::table('pricing_categories')->insertOrIgnore([
                ...$category,
                'is_active' => true,
                'sort_order' => $index + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $plans = [
            'corporate-websites' => [
                ['Basic', 180000, 250, 200, ['Responsive Design', 'Up to 5 Pages', 'Contact Form', 'Free SSL Certificate', 'Basic SEO Setup']],
                ['Standard', 350000, 450, 360, ['Responsive Design', 'Up to 10 Pages', 'CMS Editing', 'WhatsApp Integration', 'SEO Foundation', 'Analytics Setup'], true],
                ['Premium', 650000, 850, 680, ['Custom UI Design', 'Up to 20 Pages', 'Admin Dashboard', 'Blog Setup', 'Speed Optimization', 'Priority Support']],
            ],
            'ecommerce-websites' => [
                ['Starter', 450000, 650, 520, ['Product Catalogue', 'Cart and Checkout', 'Paystack Integration', 'Order Notifications', 'Admin Dashboard']],
                ['Growth', 850000, 1200, 950, ['Inventory Management', 'Multi-payment Gateway', 'Coupon System', 'Delivery Options', 'SEO Product Pages'], true],
                ['Scale', 1500000, 2200, 1750, ['Advanced Ecommerce Workflow', 'Customer Accounts', 'Reporting Dashboard', 'Automation Integrations', 'Priority Support']],
            ],
            'booking-systems' => [
                ['Basic', 300000, 420, 340, ['Booking Calendar', 'Availability Rules', 'Email Confirmation', 'Admin Dashboard', 'Responsive Design']],
                ['Standard', 600000, 850, 680, ['Multiple Calendars', 'Payment Collection', 'Google Calendar Sync', 'Custom Booking Fields', 'Reminder Emails'], true],
                ['Premium', 950000, 1400, 1100, ['Resource Scheduling', 'Team Availability', 'Advanced Notifications', 'Payment Rules', 'Custom Reporting']],
            ],
            'custom-development' => [
                ['Discovery', 250000, 350, 280, ['Requirements Workshop', 'Technical Specification', 'Architecture Plan', 'Project Estimate']],
                ['Build Sprint', 1200000, 1700, 1350, ['Custom Backend', 'Frontend Implementation', 'API Integrations', 'Testing and Deployment'], true],
                ['Enterprise', 3000000, 4200, 3350, ['Dedicated Architecture', 'Advanced Integrations', 'Security Hardening', 'SLA Support', 'Training']],
            ],
        ];

        foreach ($plans as $categorySlug => $categoryPlans) {
            $categoryId = DB::table('pricing_categories')->where('slug', $categorySlug)->value('id');
            foreach ($categoryPlans as $index => $plan) {
                [$name, $ngn, $usd, $gbp, $features] = $plan;
                $popular = (bool) ($plan[5] ?? false);
                $planId = DB::table('pricing_plans')->insertGetId([
                    'pricing_category_id' => $categoryId,
                    'name' => $name,
                    'slug' => Str::slug($name),
                    'description' => "{$name} package for " . str_replace('-', ' ', $categorySlug) . '.',
                    'billing_type' => 'one_time',
                    'monthly_enabled' => false,
                    'prices_json' => json_encode(['NGN' => $ngn, 'USD' => $usd, 'GBP' => $gbp]),
                    'promo_prices_json' => json_encode([]),
                    'discount_percentage' => 0,
                    'is_active' => true,
                    'is_popular' => $popular,
                    'sort_order' => $index + 1,
                    'version' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($features as $featureIndex => $featureTitle) {
                    $featureId = DB::table('pricing_features')->insertGetId([
                        'title' => $featureTitle,
                        'description' => null,
                        'group_name' => $this->featureGroup($featureTitle),
                        'slug' => Str::slug($featureTitle),
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    DB::table('pricing_plan_features')->insert([
                        'pricing_plan_id' => $planId,
                        'pricing_feature_id' => $featureId,
                        'title' => $featureTitle,
                        'description' => null,
                        'group_name' => $this->featureGroup($featureTitle),
                        'is_included' => true,
                        'sort_order' => $featureIndex + 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    private function featureGroup(string $title): string
    {
        return match (true) {
            str_contains(strtolower($title), 'seo'), str_contains(strtolower($title), 'analytics') => 'SEO',
            str_contains(strtolower($title), 'payment'), str_contains(strtolower($title), 'checkout'), str_contains(strtolower($title), 'order') => 'Payments',
            str_contains(strtolower($title), 'dashboard'), str_contains(strtolower($title), 'backend'), str_contains(strtolower($title), 'cms') => 'Backend',
            str_contains(strtolower($title), 'support'), str_contains(strtolower($title), 'training') => 'Support',
            default => 'Design',
        };
    }
};
