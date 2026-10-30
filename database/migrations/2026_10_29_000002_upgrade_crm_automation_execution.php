<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_automations', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->unsignedBigInteger('trigger_segment_id')->nullable();
            $table->string('trigger_subscription_status', 30)->nullable();
            $table->json('conditions_json')->nullable();
        });
        Schema::table('crm_automation_runs', function (Blueprint $table) {
            $table->string('status', 20)->default('completed')->index();
            $table->json('snapshot_json')->nullable();
            $table->json('context_json')->nullable();
            $table->json('results_json')->nullable();
            $table->text('error')->nullable();
            $table->unsignedInteger('attempts')->default(1);
            $table->timestamp('finished_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('crm_automation_runs', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'snapshot_json', 'context_json', 'results_json', 'error', 'attempts', 'finished_at']);
        });
        Schema::table('crm_automations', fn (Blueprint $table) => $table->dropColumn(['description', 'trigger_segment_id', 'trigger_subscription_status', 'conditions_json']));
    }
};
