<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_documents', 'source_quote_id')) {
                $table->foreignId('source_quote_id')->nullable()->after('client_id')->constrained('invoice_documents')->nullOnDelete();
                $table->index('source_quote_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoice_documents', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_documents', 'source_quote_id')) {
                $table->dropConstrainedForeignId('source_quote_id');
            }
        });
    }
};
