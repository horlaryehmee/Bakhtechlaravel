<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_email_logs')) {
            return;
        }

        Schema::table('invoice_email_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_email_logs', 'body_html')) {
                $table->longText('body_html')->nullable()->after('template_key');
            }

            if (!Schema::hasColumn('invoice_email_logs', 'error_message')) {
                $table->text('error_message')->nullable()->after('clicked_at');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoice_email_logs')) {
            return;
        }

        Schema::table('invoice_email_logs', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_email_logs', 'error_message')) {
                $table->dropColumn('error_message');
            }

            if (Schema::hasColumn('invoice_email_logs', 'body_html')) {
                $table->dropColumn('body_html');
            }
        });
    }
};
