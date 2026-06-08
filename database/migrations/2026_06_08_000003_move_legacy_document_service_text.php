<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_documents')
            || !Schema::hasColumn('invoice_documents', 'service_overview')
            || !Schema::hasColumn('invoice_documents', 'scope_of_service')) {
            return;
        }

        DB::table('invoice_documents')
            ->where(function ($query) {
                $query->whereNull('service_overview')->orWhere('service_overview', '');
            })
            ->whereNotNull('notes')
            ->where('notes', '<>', '')
            ->update(['service_overview' => DB::raw('notes')]);

        DB::table('invoice_documents')
            ->where(function ($query) {
                $query->whereNull('scope_of_service')->orWhere('scope_of_service', '');
            })
            ->whereNotNull('terms')
            ->where('terms', '<>', '')
            ->update(['scope_of_service' => DB::raw('terms')]);

        DB::table('invoice_documents')
            ->whereNotNull('notes')
            ->whereColumn('notes', 'service_overview')
            ->update(['notes' => null]);

        DB::table('invoice_documents')
            ->whereNotNull('terms')
            ->whereColumn('terms', 'scope_of_service')
            ->update(['terms' => null]);
    }

    public function down(): void
    {
        //
    }
};
