<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_documents')) {
            return;
        }

        Schema::table('invoice_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_documents', 'service_overview')) {
                $table->text('service_overview')->nullable()->after('payment_enabled');
            }

            if (!Schema::hasColumn('invoice_documents', 'scope_of_service')) {
                $table->text('scope_of_service')->nullable()->after('service_overview');
            }
        });

        DB::table('invoice_documents')
            ->where('type', 'quote')
            ->whereNull('service_overview')
            ->whereNotNull('notes')
            ->update(['service_overview' => DB::raw('notes')]);

        DB::table('invoice_documents')
            ->where('type', 'quote')
            ->whereNull('scope_of_service')
            ->whereNotNull('terms')
            ->update(['scope_of_service' => DB::raw('terms')]);

        DB::table('invoice_documents')
            ->where('type', 'quote')
            ->whereNotNull('notes')
            ->whereColumn('notes', 'service_overview')
            ->update(['notes' => null]);

        DB::table('invoice_documents')
            ->where('type', 'quote')
            ->whereNotNull('terms')
            ->whereColumn('terms', 'scope_of_service')
            ->update(['terms' => null]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoice_documents')) {
            return;
        }

        Schema::table('invoice_documents', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_documents', 'scope_of_service')) {
                $table->dropColumn('scope_of_service');
            }

            if (Schema::hasColumn('invoice_documents', 'service_overview')) {
                $table->dropColumn('service_overview');
            }
        });
    }
};
