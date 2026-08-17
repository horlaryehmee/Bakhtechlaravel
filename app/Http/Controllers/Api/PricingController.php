<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RedisConfigurationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PricingController extends Controller
{
    public function publicIndex(Request $request)
    {
        $currency = strtoupper((string) $request->query('currency', 'NGN'));

        return $this->rememberPublicPricingCache("public:pricing:{$currency}", function () use ($currency) {
            return [
                'categories' => $this->categoryQuery()
                    ->where('pricing_categories.is_active', true)
                    ->get()
                    ->map(fn ($category) => $this->categoryShape($category, true, $currency))
                    ->values(),
                'currencies' => ['NGN', 'USD', 'GBP'],
            ];
        });
    }

    public function adminIndex()
    {
        return [
            'categories' => $this->categoryQuery()
                ->get()
                ->map(fn ($category) => $this->categoryShape($category, true))
                ->values(),
            'features' => DB::table('pricing_features')
                ->orderBy('group_name')
                ->orderBy('title')
                ->get()
                ->map(fn ($feature) => $this->featureShape($feature))
                ->values(),
        ];
    }

    public function storeCategory(Request $request)
    {
        $data = $this->validatedCategory($request);
        $id = DB::table('pricing_categories')->insertGetId([
            ...$this->categoryPayload($data),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->flushPublicPricingCache();

        return response()->json(['category' => $this->categoryShape($this->categoryRow($id), true)], 201);
    }

    public function updateCategory(Request $request, int $id)
    {
        if (!$this->categoryRow($id)) {
            return response()->json(['message' => 'Pricing category not found.'], 404);
        }

        $data = $this->validatedCategory($request, $id);
        DB::table('pricing_categories')->where('id', $id)->update([
            ...$this->categoryPayload($data),
            'updated_at' => now(),
        ]);
        $this->flushPublicPricingCache();

        return ['category' => $this->categoryShape($this->categoryRow($id), true)];
    }

    public function destroyCategory(int $id)
    {
        DB::table('pricing_categories')->where('id', $id)->delete();
        $this->flushPublicPricingCache();

        return response()->noContent();
    }

    public function storeFeature(Request $request)
    {
        $data = $this->validatedFeature($request);
        $id = DB::table('pricing_features')->insertGetId([
            ...$this->featurePayload($data),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->flushPublicPricingCache();

        return response()->json(['feature' => $this->featureShape(DB::table('pricing_features')->where('id', $id)->first())], 201);
    }

    public function updateFeature(Request $request, int $id)
    {
        if (!DB::table('pricing_features')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Pricing feature not found.'], 404);
        }

        $data = $this->validatedFeature($request);
        DB::table('pricing_features')->where('id', $id)->update([
            ...$this->featurePayload($data),
            'updated_at' => now(),
        ]);
        $this->flushPublicPricingCache();

        return ['feature' => $this->featureShape(DB::table('pricing_features')->where('id', $id)->first())];
    }

    public function destroyFeature(int $id)
    {
        DB::table('pricing_features')->where('id', $id)->delete();
        $this->flushPublicPricingCache();

        return response()->noContent();
    }

    public function storePlan(Request $request)
    {
        $data = $this->validatedPlan($request);
        $planId = DB::transaction(function () use ($data, $request) {
            $planId = DB::table('pricing_plans')->insertGetId([
                ...$this->planPayload($data),
                'version' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->syncPlanFeatures($planId, $data['features'] ?? []);
            $this->writeVersion($planId, $request);

            return $planId;
        });
        $this->flushPublicPricingCache();

        return response()->json(['plan' => $this->planShape($this->planRow($planId), true)], 201);
    }

    public function updatePlan(Request $request, int $id)
    {
        if (!$this->planRow($id)) {
            return response()->json(['message' => 'Pricing plan not found.'], 404);
        }

        $data = $this->validatedPlan($request, $id);
        DB::transaction(function () use ($id, $data, $request) {
            $currentVersion = (int) DB::table('pricing_plans')->where('id', $id)->value('version');
            DB::table('pricing_plans')->where('id', $id)->update([
                ...$this->planPayload($data),
                'version' => $currentVersion + 1,
                'updated_at' => now(),
            ]);
            $this->syncPlanFeatures($id, $data['features'] ?? []);
            $this->writeVersion($id, $request);
        });
        $this->flushPublicPricingCache();

        return ['plan' => $this->planShape($this->planRow($id), true)];
    }

    public function destroyPlan(int $id)
    {
        DB::table('pricing_plans')->where('id', $id)->delete();
        $this->flushPublicPricingCache();

        return response()->noContent();
    }

    public function createDocumentFromPlan(Request $request)
    {
        $data = $request->validate([
            'planId' => ['required', 'integer', 'exists:pricing_plans,id'],
            'currency' => ['required', 'string', 'size:3'],
            'documentType' => ['nullable', Rule::in(['quote', 'invoice'])],
            'client.name' => ['nullable', 'string', 'max:255'],
            'client.email' => ['nullable', 'email', 'max:255'],
            'client.phone' => ['nullable', 'string', 'max:60'],
            'client.companyName' => ['nullable', 'string', 'max:255'],
            'client.address' => ['nullable', 'string'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $plan = $this->planRow((int) $data['planId']);
        if (!$plan || !$plan->is_active) {
            return response()->json(['message' => 'Pricing plan is not available.'], 404);
        }

        $category = $this->categoryRow((int) $plan->pricing_category_id);
        if (!$category || !$category->is_active) {
            return response()->json(['message' => 'Pricing category is not available.'], 404);
        }

        $currency = strtoupper($data['currency']);
        $snapshot = $this->snapshotForPlan($plan, $category, $currency);
        $amount = $snapshot['selectedPrice']['amount'] ?? null;
        if ($amount === null) {
            return response()->json(['message' => 'This plan does not support the selected currency.'], 422);
        }

        $documentId = DB::transaction(function () use ($data, $request, $plan, $category, $snapshot, $currency, $amount) {
            $clientId = $this->saveClient($data['client'] ?? []);
            $documentType = $data['documentType'] ?? 'quote';
            $gateway = $this->gatewayForCurrency($currency);
            $versionId = (int) DB::table('pricing_versions')
                ->where('pricing_plan_id', $plan->id)
                ->where('version', $plan->version)
                ->value('id');

            if (!$versionId) {
                $versionId = $this->writeVersion((int) $plan->id, $request);
            }

            $documentColumns = Schema::getColumnListing('invoice_documents');
            $hasDocumentColumn = static fn (string $column): bool => in_array($column, $documentColumns, true);
            $documentPayload = [
                'client_id' => $clientId,
                'pricing_category_id' => $category->id,
                'pricing_plan_id' => $plan->id,
                'pricing_version_id' => $versionId,
                'type' => $documentType,
                'number' => $this->nextDocumentNumber($documentType),
                'title' => $category->name . ' - ' . $plan->name,
                'public_token' => (string) Str::uuid(),
                'status' => 'draft',
                'currency' => $currency,
                'exchange_rate' => 1,
                'subtotal' => $amount,
                'discount_total' => $snapshot['selectedPrice']['discountAmount'],
                'tax_total' => 0,
                'total' => $amount,
                'amount_paid' => 0,
                'balance_due' => $amount,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'payment_gateway' => $gateway,
                'payment_enabled' => true,
                'pricing_snapshot_json' => json_encode($snapshot),
                'selected_features_snapshot_json' => json_encode($snapshot['features']),
                'branding_json' => json_encode($this->branding([])),
                'notes' => trim((string) ($data['message'] ?? '')),
                'terms' => '',
                'created_by' => $request->attributes->get('admin')->id ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($hasDocumentColumn('service_overview')) {
                $documentPayload['service_overview'] = $category->description;
            }

            if ($hasDocumentColumn('scope_of_service')) {
                $documentPayload['scope_of_service'] = $this->featuresHtml($snapshot['features']);
            }

            $documentPayload = $this->tablePayload('invoice_documents', $documentPayload, $documentColumns);
            $documentId = (int) DB::table('invoice_documents')->insertGetId($documentPayload);

            DB::table('invoice_document_items')->insert($this->tablePayload('invoice_document_items', [
                'document_id' => $documentId,
                'name' => $plan->name . ' Plan',
                'description' => $this->featuresHtml($snapshot['features']),
                'quantity' => 1,
                'unit_price' => $amount,
                'discount_rate' => 0,
                'tax_rate' => 0,
                'line_total' => $amount,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]));

            if (Schema::hasTable('invoice_events')) {
                try {
                    DB::table('invoice_events')->insert($this->tablePayload('invoice_events', [
                        'document_id' => $documentId,
                        'event_type' => 'pricing.document_created',
                        'actor_type' => $request->attributes->get('admin') ? 'owner' : 'anonymous',
                        'actor_id' => $request->attributes->get('admin')->id ?? null,
                        'ip_address' => (string) $request->ip(),
                        'user_agent' => (string) $request->userAgent(),
                        'device_type' => preg_match('/Mobile|Android|iPhone|iPad/i', (string) $request->userAgent()) ? 'mobile' : 'desktop',
                        'metadata_json' => json_encode(['planId' => $plan->id, 'categoryId' => $category->id]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]));
                } catch (\Throwable $exception) {
                    report($exception);
                }
            }

            return $documentId;
        });

        $document = DB::table('invoice_documents')->where('id', $documentId)->first();
        if ($document) {
            app(InvoiceController::class)->sendInvoiceNotification($documentId, $request, ((string) $document->type) . '_created');
        }

        return response()->json([
            'document' => [
                'id' => $document->id,
                'number' => $document->number,
                'type' => $document->type,
                'status' => $document->status,
                'currency' => $document->currency,
                'total' => (float) $document->total,
                'publicUrl' => '/invoice/' . ($document->public_token ?? ''),
            ],
        ], 201);
    }

    private function validatedCategory(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140', Rule::unique('pricing_categories', 'slug')->ignore($id)],
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:80'],
            'serviceType' => ['nullable', Rule::in(['new_website', 'existing_website'])],
            'isActive' => ['nullable', 'boolean'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function validatedFeature(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'groupName' => ['nullable', 'string', 'max:80'],
            'isActive' => ['nullable', 'boolean'],
        ]);
    }

    private function validatedPlan(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'pricingCategoryId' => ['required', 'integer', 'exists:pricing_categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140'],
            'description' => ['nullable', 'string'],
            'billingType' => ['required', Rule::in(['one_time', 'monthly'])],
            'monthlyEnabled' => ['nullable', 'boolean'],
            'prices' => ['required', 'array'],
            'prices.NGN' => ['nullable', 'numeric', 'min:0'],
            'prices.USD' => ['nullable', 'numeric', 'min:0'],
            'prices.GBP' => ['nullable', 'numeric', 'min:0'],
            'discountPercentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'promoPrices' => ['nullable', 'array'],
            'isActive' => ['nullable', 'boolean'],
            'isPopular' => ['nullable', 'boolean'],
            'sortOrder' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*.featureId' => ['nullable', 'integer', 'exists:pricing_features,id'],
            'features.*.title' => ['required', 'string', 'max:180'],
            'features.*.description' => ['nullable', 'string'],
            'features.*.groupName' => ['nullable', 'string', 'max:80'],
            'features.*.isIncluded' => ['nullable', 'boolean'],
            'features.*.sortOrder' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function categoryPayload(array $data): array
    {
        return [
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'description' => $data['description'] ?? '',
            'icon' => $data['icon'] ?? '',
            'service_type' => $data['serviceType'] ?? 'new_website',
            'is_active' => (bool) ($data['isActive'] ?? true),
            'sort_order' => (int) ($data['sortOrder'] ?? 0),
        ];
    }

    private function featurePayload(array $data): array
    {
        return [
            'title' => $data['title'],
            'description' => $data['description'] ?? '',
            'group_name' => $data['groupName'] ?? '',
            'slug' => Str::slug($data['title']),
            'is_active' => (bool) ($data['isActive'] ?? true),
        ];
    }

    private function planPayload(array $data): array
    {
        return [
            'pricing_category_id' => (int) $data['pricingCategoryId'],
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'description' => $data['description'] ?? '',
            'billing_type' => $data['billingType'],
            'monthly_enabled' => (bool) ($data['monthlyEnabled'] ?? false),
            'prices_json' => json_encode($data['prices'] ?? []),
            'discount_percentage' => (float) ($data['discountPercentage'] ?? 0),
            'promo_prices_json' => json_encode($data['promoPrices'] ?? []),
            'is_active' => (bool) ($data['isActive'] ?? true),
            'is_popular' => (bool) ($data['isPopular'] ?? false),
            'sort_order' => (int) ($data['sortOrder'] ?? 0),
        ];
    }

    private function syncPlanFeatures(int $planId, array $features): void
    {
        DB::table('pricing_plan_features')->where('pricing_plan_id', $planId)->delete();
        foreach ($features as $index => $feature) {
            DB::table('pricing_plan_features')->insert([
                'pricing_plan_id' => $planId,
                'pricing_feature_id' => $feature['featureId'] ?? null,
                'title' => $feature['title'],
                'description' => $feature['description'] ?? '',
                'group_name' => $feature['groupName'] ?? '',
                'is_included' => (bool) ($feature['isIncluded'] ?? true),
                'sort_order' => (int) ($feature['sortOrder'] ?? ($index + 1)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function writeVersion(int $planId, Request $request): int
    {
        $plan = $this->planRow($planId);
        $category = $this->categoryRow((int) $plan->pricing_category_id);
        $snapshot = $this->snapshotForPlan($plan, $category, 'NGN', false);

        DB::table('pricing_versions')->updateOrInsert(
            ['pricing_plan_id' => $planId, 'version' => $plan->version],
            [
                'snapshot_json' => json_encode($snapshot),
                'created_by' => $request->attributes->get('admin')->id ?? null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return (int) DB::table('pricing_versions')
            ->where('pricing_plan_id', $planId)
            ->where('version', $plan->version)
            ->value('id');
    }

    private function snapshotForPlan(object $plan, object $category, string $currency, bool $applyCurrency = true): array
    {
        $prices = json_decode($plan->prices_json ?: '{}', true) ?: [];
        $promoPrices = json_decode($plan->promo_prices_json ?: '{}', true) ?: [];
        $basePrice = array_key_exists($currency, $prices) ? (float) $prices[$currency] : null;
        $discountPercentage = (float) $plan->discount_percentage;
        $discountAmount = $basePrice ? round($basePrice * ($discountPercentage / 100), 2) : 0;
        $discounted = $basePrice !== null ? max(0, round($basePrice - $discountAmount, 2)) : null;
        $promo = array_key_exists($currency, $promoPrices) && $promoPrices[$currency] !== null && $promoPrices[$currency] !== ''
            ? (float) $promoPrices[$currency]
            : null;

        return [
            'category' => $this->categoryShape($category, false),
            'plan' => $this->planShape($plan, false),
            'version' => (int) $plan->version,
            'prices' => $prices,
            'promoPrices' => $promoPrices,
            'selectedPrice' => [
                'currency' => $currency,
                'baseAmount' => $basePrice,
                'discountPercentage' => $discountPercentage,
                'discountAmount' => $discountAmount,
                'amount' => $promo ?? $discounted,
                'promoApplied' => $promo !== null,
            ],
            'features' => $this->planFeatures((int) $plan->id),
            'capturedAt' => now()->toISOString(),
        ];
    }

    private function categoryShape(object $category, bool $includePlans = false, string $currency = 'NGN'): array
    {
        return [
            'id' => (int) $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description ?: '',
            'icon' => $category->icon ?: '',
            'serviceType' => $category->service_type ?? 'new_website',
            'isActive' => (bool) $category->is_active,
            'sortOrder' => (int) $category->sort_order,
            'plans' => $includePlans
                ? DB::table('pricing_plans')
                    ->where('pricing_category_id', $category->id)
                    ->when(request()->is('api/pricing'), fn ($query) => $query->where('is_active', true))
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get()
                    ->map(fn ($plan) => $this->planShape($plan, true, $currency))
                    ->values()
                : [],
        ];
    }

    private function planShape(object $plan, bool $includeFeatures = true, string $currency = 'NGN'): array
    {
        $prices = json_decode($plan->prices_json ?: '{}', true) ?: [];
        $promoPrices = json_decode($plan->promo_prices_json ?: '{}', true) ?: [];
        $basePrice = array_key_exists($currency, $prices) ? (float) $prices[$currency] : null;
        $discount = (float) $plan->discount_percentage;
        $discounted = $basePrice !== null ? max(0, round($basePrice - ($basePrice * ($discount / 100)), 2)) : null;
        $promo = array_key_exists($currency, $promoPrices) && $promoPrices[$currency] !== null && $promoPrices[$currency] !== ''
            ? (float) $promoPrices[$currency]
            : null;

        return [
            'id' => (int) $plan->id,
            'pricingCategoryId' => (int) $plan->pricing_category_id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description ?: '',
            'billingType' => $plan->billing_type,
            'monthlyEnabled' => (bool) $plan->monthly_enabled,
            'prices' => $prices,
            'promoPrices' => $promoPrices,
            'discountPercentage' => $discount,
            'displayPrice' => [
                'currency' => $currency,
                'baseAmount' => $basePrice,
                'amount' => $promo ?? $discounted,
                'promoApplied' => $promo !== null,
            ],
            'isActive' => (bool) $plan->is_active,
            'isPopular' => (bool) $plan->is_popular,
            'sortOrder' => (int) $plan->sort_order,
            'version' => (int) $plan->version,
            'features' => $includeFeatures ? $this->planFeatures((int) $plan->id) : [],
            'createdAt' => (string) $plan->created_at,
            'updatedAt' => (string) $plan->updated_at,
        ];
    }

    private function featureShape(object $feature): array
    {
        return [
            'id' => (int) $feature->id,
            'title' => $feature->title,
            'description' => $feature->description ?: '',
            'groupName' => $feature->group_name ?: '',
            'isActive' => (bool) $feature->is_active,
        ];
    }

    private function planFeatures(int $planId): array
    {
        return DB::table('pricing_plan_features')
            ->where('pricing_plan_id', $planId)
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn ($feature) => [
                'id' => (int) $feature->id,
                'featureId' => $feature->pricing_feature_id ? (int) $feature->pricing_feature_id : null,
                'title' => $feature->title,
                'description' => $feature->description ?: '',
                'groupName' => $feature->group_name ?: '',
                'isIncluded' => (bool) $feature->is_included,
                'sortOrder' => (int) $feature->sort_order,
            ])
            ->values()
            ->all();
    }

    private function categoryQuery()
    {
        return DB::table('pricing_categories')
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    private function categoryRow(int $id): ?object
    {
        return DB::table('pricing_categories')->where('id', $id)->first();
    }

    private function planRow(int $id): ?object
    {
        return DB::table('pricing_plans')->where('id', $id)->first();
    }

    private function saveClient(array $client): int
    {
        $name = trim((string) ($client['name'] ?? 'Website Client')) ?: 'Website Client';
        $email = trim((string) ($client['email'] ?? ''));
        $clientColumns = Schema::getColumnListing('invoice_clients');
        $hasClientColumn = static fn (string $column): bool => in_array($column, $clientColumns, true);
        $payload = $this->tablePayload('invoice_clients', [
            'name' => $name,
            'email' => $email,
            'phone' => $client['phone'] ?? '',
            'company_name' => $client['companyName'] ?? '',
            'address' => $client['address'] ?? '',
            'updated_at' => now(),
        ], $clientColumns);

        $existing = $email && $hasClientColumn('email') ? DB::table('invoice_clients')->where('email', $email)->first() : null;
        if ($existing) {
            DB::table('invoice_clients')->where('id', $existing->id)->update($payload);
            return (int) $existing->id;
        }

        if ($hasClientColumn('created_at')) {
            $payload['created_at'] = now();
        }
        return (int) DB::table('invoice_clients')->insertGetId($payload);
    }

    private function tablePayload(string $table, array $payload, ?array $columns = null): array
    {
        $columns ??= Schema::getColumnListing($table);

        return array_intersect_key($payload, array_flip($columns));
    }

    private function nextDocumentNumber(string $type): string
    {
        $prefix = $type === 'invoice' ? 'INV-' : 'QT-';
        $count = DB::table('invoice_documents')->where('type', $type)->count();

        $next = 1000 + $count + 1;

        do {
            $number = $prefix . $next;
            $next++;
        } while (DB::table('invoice_documents')->where('number', $number)->exists());

        return $number;
    }

    private function gatewayForCurrency(string $currency): string
    {
        return match (strtoupper($currency)) {
            'NGN' => 'paystack',
            default => 'flutterwave',
        };
    }

    private function featuresHtml(array $features): string
    {
        $items = collect($features)
            ->filter(fn ($feature) => (bool) ($feature['isIncluded'] ?? true))
            ->map(fn ($feature) => '<li><strong>' . e($feature['title']) . '</strong>' . (!empty($feature['description']) ? ': ' . e($feature['description']) : '') . '</li>')
            ->implode('');

        return '<ul>' . $items . '</ul>';
    }

    private function branding(array $branding): array
    {
        $settings = $this->siteSettings();
        $defaults = [
            'businessName' => 'Bakhtech Solutions',
            'logoUrl' => '/bakhtech-logo-light.png',
            'primaryColor' => '#ef4444',
            'accentColor' => '#12c8a0',
            'email' => 'solutions@bakhtech.com.ng',
            'phone' => '+234 708 637 2833',
            'address' => '',
        ];
        $settingsMap = [
            'businessName' => 'company_name',
            'logoUrl' => 'company_logo',
            'email' => 'company_email',
            'phone' => 'company_phone',
            'address' => 'company_address',
        ];

        foreach ($settingsMap as $brandingKey => $settingsKey) {
            if (!empty($settings[$settingsKey])) {
                $defaults[$brandingKey] = $settings[$settingsKey];
            }
        }

        foreach ($defaults as $key => $defaultValue) {
            if (!array_key_exists($key, $branding) || trim((string) $branding[$key]) === '') {
                $branding[$key] = $defaultValue;
            }
        }

        return array_merge($defaults, $branding);
    }

    private function siteSettings(): array
    {
        if (!Schema::hasTable('settings')) {
            return [];
        }

        return DB::table('settings')->pluck('value', 'key')->all();
    }

    private function flushPublicPricingCache(): void
    {
        try {
            app(RedisConfigurationService::class)->apply();
            Cache::forget('public:pricing:NGN');
            Cache::forget('public:pricing:USD');
            Cache::forget('public:pricing:GBP');
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function rememberPublicPricingCache(string $key, callable $callback): array
    {
        try {
            app(RedisConfigurationService::class)->apply();

            return Cache::remember($key, now()->addMinutes(10), $callback);
        } catch (\Throwable $exception) {
            report($exception);

            return $callback();
        }
    }
}
