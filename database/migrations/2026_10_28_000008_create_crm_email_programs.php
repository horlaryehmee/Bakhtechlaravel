<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_email_programs', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20)->index();
            $table->string('name', 160);
            $table->boolean('enabled')->default(false);
            $table->foreignId('segment_id')->nullable()->constrained('crm_segments')->nullOnDelete();
            $table->string('frequency', 20)->nullable();
            $table->timestamp('next_run_at')->nullable()->index();
            $table->string('editor_type', 20)->default('default');
            $table->string('subject', 190)->nullable();
            $table->longText('body')->nullable();
            $table->json('steps')->nullable();
            $table->timestamps();
        });
        Schema::create('crm_email_program_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('crm_email_programs')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $table->unsignedInteger('next_step')->default(0);
            $table->timestamp('due_at')->index();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->unique(['program_id', 'contact_id']);
        });
        Schema::create('crm_email_program_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('crm_email_programs')->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('crm_campaigns')->nullOnDelete();
            $table->string('run_key', 100);
            $table->string('status', 20)->default('pending');
            $table->text('error')->nullable();
            $table->timestamps();
            $table->unique(['program_id', 'run_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_email_program_runs');
        Schema::dropIfExists('crm_email_program_enrollments');
        Schema::dropIfExists('crm_email_programs');
    }
};
