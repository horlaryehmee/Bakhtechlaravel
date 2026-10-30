<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_companies', function (Blueprint $t) {
            $t->id(); $t->string('name', 190)->unique(); $t->string('website')->nullable();
            $t->string('phone', 60)->nullable(); $t->text('address')->nullable(); $t->text('notes')->nullable(); $t->timestamps();
        });
        Schema::table('crm_contacts', function (Blueprint $t) {
            $t->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $t->string('service_interest', 190)->nullable(); $t->foreignId('owner_id')->nullable()->constrained('admins')->nullOnDelete();
        });
        Schema::create('crm_deals', function (Blueprint $t) {
            $t->id(); $t->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $t->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $t->foreignId('owner_id')->nullable()->constrained('admins')->nullOnDelete();
            $t->string('title', 190); $t->string('stage', 30)->default('new')->index();
            $t->decimal('estimated_value', 14, 2)->nullable(); $t->decimal('agreed_value', 14, 2)->nullable();
            $t->date('expected_close_at')->nullable(); $t->text('lost_reason')->nullable(); $t->text('notes')->nullable();
            $t->string('source_type', 40)->nullable(); $t->unsignedBigInteger('source_id')->nullable();
            $t->timestamps(); $t->unique(['source_type', 'source_id']);
        });
        Schema::create('crm_projects', function (Blueprint $t) {
            $t->id(); $t->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $t->foreignId('deal_id')->nullable()->constrained('crm_deals')->nullOnDelete();
            $t->string('title', 190); $t->string('status', 30)->default('planned');
            $t->date('start_at')->nullable(); $t->date('due_at')->nullable(); $t->text('notes')->nullable(); $t->timestamps();
        });
        Schema::table('crm_tasks', function (Blueprint $t) {
            $t->foreignId('deal_id')->nullable()->constrained('crm_deals')->nullOnDelete();
            $t->foreignId('owner_id')->nullable()->constrained('admins')->nullOnDelete();
            $t->string('priority', 20)->default('normal'); $t->string('status', 20)->default('pending');
        });
    }
    public function down(): void
    {
        Schema::table('crm_tasks', fn (Blueprint $t) => $t->dropConstrainedForeignId('deal_id'));
        Schema::table('crm_tasks', fn (Blueprint $t) => $t->dropConstrainedForeignId('owner_id'));
        Schema::table('crm_tasks', fn (Blueprint $t) => $t->dropColumn(['priority', 'status']));
        Schema::dropIfExists('crm_projects'); Schema::dropIfExists('crm_deals');
        Schema::table('crm_contacts', fn (Blueprint $t) => $t->dropConstrainedForeignId('company_id'));
        Schema::table('crm_contacts', fn (Blueprint $t) => $t->dropConstrainedForeignId('owner_id'));
        Schema::table('crm_contacts', fn (Blueprint $t) => $t->dropColumn('service_interest'));
        Schema::dropIfExists('crm_companies');
    }
};
