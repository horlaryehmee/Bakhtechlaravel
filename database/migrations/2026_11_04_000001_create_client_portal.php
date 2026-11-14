<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) { $t->boolean('portal_active')->default(false); $t->string('company')->nullable(); });
        Schema::create('portal_sessions', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete(); $t->string('token_hash', 64)->unique(); $t->timestamp('expires_at'); $t->timestamps();
        });
        Schema::create('client_projects', function (Blueprint $t) {
            $t->id(); $t->foreignId('client_id')->constrained('users'); $t->string('reference')->unique(); $t->string('title'); $t->string('category'); $t->text('description')->nullable(); $t->string('status')->default('pending')->index(); $t->string('currency', 3)->default('NGN'); $t->date('start_date')->nullable(); $t->date('due_date')->nullable(); $t->unsignedInteger('product_limit')->default(50); $t->unsignedInteger('image_limit')->default(8); $t->unsignedInteger('upload_limit_mb')->default(10); $t->timestamps();
        });
        Schema::create('client_project_members', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->foreignId('admin_id')->constrained('admins'); $t->boolean('can_review')->default(false); $t->boolean('can_manage')->default(false); $t->unique(['project_id', 'admin_id']);
        });
        Schema::create('client_milestones', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->string('title'); $t->text('description')->nullable(); $t->string('status')->default('pending'); $t->date('due_date')->nullable(); $t->timestamp('completed_at')->nullable(); $t->unsignedInteger('sort_order')->default(0); $t->timestamps();
        });
        Schema::create('client_products', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->string('name'); $t->string('sku')->nullable(); $t->text('description')->nullable(); $t->text('short_description')->nullable(); $t->string('category')->nullable(); $t->decimal('price', 14, 2)->nullable(); $t->decimal('sale_price', 14, 2)->nullable(); $t->unsignedInteger('stock')->default(0); $t->string('status')->default('draft')->index(); $t->text('revision_note')->nullable(); $t->string('published_url', 2048)->nullable(); $t->timestamps(); $t->unique(['project_id', 'sku']);
        });
        Schema::create('client_requirements', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->string('title'); $t->text('instructions')->nullable(); $t->string('field_type')->default('long_text'); $t->boolean('required')->default(true); $t->json('options')->nullable(); $t->date('due_date')->nullable(); $t->unsignedInteger('sort_order')->default(0); $t->timestamps();
        });
        Schema::create('client_submissions', function (Blueprint $t) {
            $t->id(); $t->foreignId('requirement_id')->unique()->constrained('client_requirements')->cascadeOnDelete(); $t->text('value')->nullable(); $t->string('status')->default('draft'); $t->text('revision_note')->nullable(); $t->timestamps();
        });
        Schema::create('client_files', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->foreignId('product_id')->nullable()->constrained('client_products')->cascadeOnDelete(); $t->foreignId('user_id')->nullable()->constrained('users'); $t->string('name'); $t->string('path'); $t->string('mime'); $t->unsignedBigInteger('size'); $t->unsignedInteger('sort_order')->default(0); $t->timestamps();
        });
        Schema::create('client_activity', function (Blueprint $t) {
            $t->id(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->string('actor'); $t->string('event'); $t->text('details')->nullable(); $t->timestamps();
        });
        Schema::create('client_notifications', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained('users')->cascadeOnDelete(); $t->foreignId('project_id')->constrained('client_projects')->cascadeOnDelete(); $t->string('message'); $t->timestamp('read_at')->nullable(); $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['client_notifications', 'client_activity', 'client_files', 'client_submissions', 'client_requirements', 'client_products', 'client_milestones', 'client_project_members', 'client_projects', 'portal_sessions'] as $table) Schema::dropIfExists($table);
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['portal_active', 'company']));
    }
};
