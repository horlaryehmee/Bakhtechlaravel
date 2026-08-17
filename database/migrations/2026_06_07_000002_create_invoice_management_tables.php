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
        Schema::create('invoice_clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('company_name')->nullable();
            $table->text('address')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained('invoice_clients')->nullOnDelete();
            $table->string('type', 20)->default('invoice');
            $table->string('number')->unique();
            $table->string('title')->nullable();
            $table->string('public_token', 80)->unique();
            $table->string('status', 30)->default('draft');
            $table->string('currency', 3)->default('NGN');
            $table->decimal('exchange_rate', 14, 6)->default(1);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('discount_total', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->decimal('balance_due', 14, 2)->default(0);
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->string('payment_gateway', 30)->nullable();
            $table->boolean('payment_enabled')->default(false);
            $table->json('branding_json')->nullable();
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();
            $table->index(['type', 'status']);
            $table->index(['currency', 'created_at']);
        });

        Schema::create('invoice_document_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('invoice_documents')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('discount_rate', 7, 2)->default(0);
            $table->decimal('tax_rate', 7, 2)->default(0);
            $table->decimal('line_total', 14, 2)->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('invoice_documents')->cascadeOnDelete();
            $table->string('gateway', 30);
            $table->string('reference')->unique();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3);
            $table->string('status', 30)->default('pending');
            $table->string('authorization_url')->nullable();
            $table->json('gateway_response_json')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['gateway', 'status']);
        });

        Schema::create('invoice_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->nullable()->constrained('invoice_documents')->cascadeOnDelete();
            $table->string('event_type', 60);
            $table->string('session_id', 80)->nullable();
            $table->string('actor_type', 30)->default('anonymous');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('ip_address', 80)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_type', 30)->nullable();
            $table->string('country', 80)->nullable();
            $table->string('city', 80)->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
            $table->index(['document_id', 'event_type']);
            $table->index(['created_at']);
        });

        Schema::create('invoice_email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('invoice_documents')->cascadeOnDelete();
            $table->string('recipient_email');
            $table->string('subject');
            $table->string('template_key')->default('invoice_sent');
            $table->string('status', 30)->default('queued');
            $table->string('open_token', 80)->unique();
            $table->string('click_token', 80)->unique();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->timestamps();
        });

        DB::table('invoice_clients')->insert([
            'name' => 'Sample Client',
            'email' => 'client@example.com',
            'company_name' => 'Example Company',
            'address' => '123 Business Street',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $clientId = (int) DB::table('invoice_clients')->where('email', 'client@example.com')->value('id');
        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-' . now()->format('Y') . '-0001',
            'title' => 'Website Strategy Package',
            'public_token' => (string) Str::uuid(),
            'status' => 'sent',
            'currency' => 'NGN',
            'subtotal' => 250000,
            'discount_total' => 0,
            'tax_total' => 18750,
            'total' => 268750,
            'balance_due' => 268750,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'payment_gateway' => 'paystack',
            'payment_enabled' => true,
            'branding_json' => json_encode([
                'businessName' => 'Bakhtech Solutions',
                'logoUrl' => '/bakhtech-logo-light.png',
                'primaryColor' => '#ef4444',
                'accentColor' => '#12c8a0',
                'email' => 'solutions@bakhtech.com.ng',
                'phone' => '+234 708 637 2833',
            ]),
            'notes' => 'Thank you for choosing Bakhtech Solutions.',
            'terms' => 'Payment is due within 14 days.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_document_items')->insert([
            [
                'document_id' => $documentId,
                'name' => 'Discovery and strategy',
                'description' => 'Planning, sitemap, and conversion strategy.',
                'quantity' => 1,
                'unit_price' => 100000,
                'tax_rate' => 7.5,
                'line_total' => 107500,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'document_id' => $documentId,
                'name' => 'Landing page design',
                'description' => 'High-conversion page UI and frontend implementation.',
                'quantity' => 1,
                'unit_price' => 150000,
                'tax_rate' => 7.5,
                'line_total' => 161250,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_email_logs');
        Schema::dropIfExists('invoice_events');
        Schema::dropIfExists('invoice_payments');
        Schema::dropIfExists('invoice_document_items');
        Schema::dropIfExists('invoice_documents');
        Schema::dropIfExists('invoice_clients');
    }
};
