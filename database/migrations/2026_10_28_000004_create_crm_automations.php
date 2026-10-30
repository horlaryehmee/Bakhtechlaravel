<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_automations', function (Blueprint $t) {
            $t->id(); $t->string('name', 190); $t->boolean('enabled')->default(false);
            $t->string('trigger_type', 30); $t->string('trigger_stage', 30)->nullable();
            $t->string('action_type', 30); $t->foreignId('segment_id')->nullable()->constrained('crm_segments')->nullOnDelete();
            $t->string('task_title', 190)->nullable(); $t->unsignedInteger('task_due_days')->nullable();
            $t->timestamps();
        });
        Schema::create('crm_automation_runs', function (Blueprint $t) {
            $t->id(); $t->foreignId('automation_id')->constrained('crm_automations')->cascadeOnDelete();
            $t->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $t->string('event_key', 100); $t->timestamps();
            $t->unique(['automation_id', 'contact_id', 'event_key']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('crm_automation_runs'); Schema::dropIfExists('crm_automations');
    }
};
