<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_email_open_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_log_id')->constrained('invoice_email_logs')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('invoice_documents')->cascadeOnDelete();
            $table->string('ip_address', 80)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_type', 30)->nullable();
            $table->string('browser', 60)->nullable();
            $table->string('operating_system', 60)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->timestamp('opened_at');
            $table->timestamps();
            $table->index(['email_log_id', 'opened_at']);
            $table->index(['document_id', 'opened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_email_open_events');
    }
};
