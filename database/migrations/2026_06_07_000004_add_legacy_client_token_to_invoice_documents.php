<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_documents', 'legacy_client_token')) {
                $table->string('legacy_client_token', 80)->nullable()->after('public_token')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoice_documents', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_documents', 'legacy_client_token')) {
                $table->dropIndex(['legacy_client_token']);
                $table->dropColumn('legacy_client_token');
            }
        });
    }
};
