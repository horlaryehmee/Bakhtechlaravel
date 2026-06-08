<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_documents')) {
            return;
        }

        Schema::table('invoice_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_documents', 'partial_payment_enabled')) {
                $table->boolean('partial_payment_enabled')->default(true)->after('payment_enabled');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoice_documents')) {
            return;
        }

        Schema::table('invoice_documents', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_documents', 'partial_payment_enabled')) {
                $table->dropColumn('partial_payment_enabled');
            }
        });
    }
};
