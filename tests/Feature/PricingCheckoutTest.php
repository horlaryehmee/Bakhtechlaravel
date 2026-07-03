<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PricingCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pricing_checkout_creates_invoice_document(): void
    {
        Mail::fake();

        $categoryId = DB::table('pricing_categories')->insertGetId([
            'name' => 'Web Design',
            'slug' => 'web-design',
            'description' => 'Website design and development.',
            'icon' => 'globe',
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $planId = DB::table('pricing_plans')->insertGetId([
            'pricing_category_id' => $categoryId,
            'name' => 'Starter',
            'slug' => 'starter',
            'description' => 'Starter website plan.',
            'billing_type' => 'one_time',
            'monthly_enabled' => false,
            'prices_json' => json_encode(['NGN' => 150000]),
            'discount_percentage' => 0,
            'promo_prices_json' => json_encode([]),
            'is_active' => true,
            'is_popular' => false,
            'sort_order' => 1,
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('pricing_plan_features')->insert([
            'pricing_plan_id' => $planId,
            'title' => 'Homepage design',
            'description' => 'Responsive homepage implementation.',
            'group_name' => 'Design',
            'is_included' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/pricing/checkout', [
            'planId' => $planId,
            'currency' => 'NGN',
            'documentType' => 'invoice',
            'client' => [
                'name' => 'Pricing Client',
                'email' => 'pricing-client@example.test',
                'phone' => '+234 700 000 0000',
                'companyName' => 'Pricing Co',
                'address' => 'Lagos, Nigeria',
            ],
            'message' => 'Please create this invoice.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('document.type', 'invoice')
            ->assertJsonPath('document.currency', 'NGN')
            ->assertJsonPath('document.total', 150000)
            ->assertJsonPath('document.publicUrl', fn ($url) => is_string($url) && str_starts_with($url, '/invoice/'));

        $documentId = (int) $response->json('document.id');

        $this->assertDatabaseHas('invoice_documents', [
            'id' => $documentId,
            'type' => 'invoice',
            'pricing_category_id' => $categoryId,
            'pricing_plan_id' => $planId,
            'total' => 150000,
        ]);
        $this->assertDatabaseHas('invoice_document_items', [
            'document_id' => $documentId,
            'name' => 'Starter Plan',
        ]);
        $this->assertDatabaseHas('invoice_events', [
            'document_id' => $documentId,
            'event_type' => 'pricing.document_created',
        ]);
        $this->assertDatabaseHas('invoice_email_logs', [
            'document_id' => $documentId,
            'recipient_email' => 'pricing-client@example.test',
        ]);
    }
}
