<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('email', 190)->nullable()->unique();
            $table->string('name', 190);
            $table->string('phone', 60)->nullable();
            $table->string('company', 190)->nullable();
            $table->string('stage', 30)->default('new')->index();
            $table->string('source', 40)->default('manual');
            $table->text('notes')->nullable();
            $table->timestamp('last_interaction_at')->nullable();
            $table->timestamps();
        });
        Schema::create('crm_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('subject', 190);
            $table->text('body')->nullable();
            $table->string('source_type', 40)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->timestamps();
            $table->unique(['source_type', 'source_id']);
            $table->index(['contact_id', 'created_at']);
        });
        Schema::create('crm_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $table->string('title', 190);
            $table->date('due_at')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamps();
            $table->index(['completed', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_tasks');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_contacts');
    }
};
