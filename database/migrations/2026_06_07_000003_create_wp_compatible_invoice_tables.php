<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bk_quotes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('quote_number', 50)->unique();
            $table->enum('type', ['quote', 'invoice'])->default('quote');
            $table->unsignedBigInteger('client_id')->nullable()->comment('WP User ID');
            $table->string('client_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_phone', 50)->nullable();
            $table->text('client_address')->nullable();
            $table->string('client_company')->nullable();

            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->date('valid_until')->nullable();

            $table->enum('status', ['draft', 'sent', 'viewed', 'accepted', 'declined', 'paid', 'partial', 'overdue', 'cancelled'])->default('draft');

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->string('overall_discount_type', 20)->default('fixed');
            $table->decimal('overall_discount_value', 15, 2)->default(0.00);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);

            $table->string('currency', 3)->default('NGN');
            $table->string('currency_symbol')->default('');
            $table->decimal('exchange_rate', 10, 4)->default(1.0000);

            $table->text('service_overview')->nullable();
            $table->text('scope_of_service')->nullable();
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->text('footer')->nullable();
            $table->text('payment_link_url')->nullable();

            $table->string('public_token', 64)->unique();
            $table->string('client_token', 64)->unique();

            $table->unsignedBigInteger('converted_from_id')->nullable()->comment('Quote ID if converted from quote');
            $table->unsignedBigInteger('converted_to_id')->nullable()->comment('Invoice ID if converted to invoice');

            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->index('client_id');
            $table->index('status');
            $table->index(['issue_date', 'due_date']);
            $table->index('type');
            $table->index('created_by');
        });

        Schema::create('bk_line_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('quote_id');
            $table->integer('sort_order')->default(0);
            $table->enum('item_type', ['product', 'service', 'discount', 'text'])->default('product');
            $table->string('sku', 100)->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->enum('discount_type', ['percent', 'fixed'])->default('fixed');
            $table->decimal('discount_value', 10, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
            $table->index(['quote_id', 'sort_order']);
        });

        Schema::create('bk_tax_rates', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 100);
            $table->decimal('rate', 5, 2);
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('bk_audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('quote_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 50);
            $table->text('description')->nullable();
            $table->longText('old_value')->nullable();
            $table->longText('new_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
            $table->index('action');
            $table->index('created_at');
        });

        Schema::create('bk_email_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('quote_id')->nullable();
            $table->string('recipient_email', 255)->nullable();
            $table->string('subject', 255)->nullable();
            $table->string('template_name', 100)->nullable();
            $table->longText('body_html')->nullable();
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
            $table->index('status');
        });

        Schema::create('bk_settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('setting_key', 100)->unique();
            $table->longText('setting_value')->nullable();
            $table->boolean('autoload')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('autoload');
        });

        Schema::create('bk_payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('quote_id');
            $table->enum('type', ['payment', 'refund', 'credit'])->default('payment');
            $table->string('gateway', 50)->nullable();
            $table->string('method', 50)->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 10)->default('');
            $table->string('reference', 191)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed');
            $table->longText('txn_payload')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('quote_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bk_payments');
        Schema::dropIfExists('bk_settings');
        Schema::dropIfExists('bk_email_logs');
        Schema::dropIfExists('bk_audit_logs');
        Schema::dropIfExists('bk_tax_rates');
        Schema::dropIfExists('bk_line_items');
        Schema::dropIfExists('bk_quotes');
    }
};
