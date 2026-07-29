<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visits')) {
            return;
        }

        Schema::table('visits', function (Blueprint $table) {
            $table->index('created_at', 'visits_dashboard_created_at_index');
            $table->index('path', 'visits_dashboard_path_index');

            if (Schema::hasColumn('visits', 'last_seen_at')) {
                $table->index('last_seen_at', 'visits_dashboard_last_seen_at_index');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('visits')) {
            return;
        }

        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex('visits_dashboard_created_at_index');
            $table->dropIndex('visits_dashboard_path_index');

            if (Schema::hasColumn('visits', 'last_seen_at')) {
                $table->dropIndex('visits_dashboard_last_seen_at_index');
            }
        });
    }
};
