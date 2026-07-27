<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint', 64)->index();
            $table->string('severity', 24)->default('error')->index();
            $table->string('type', 80)->index();
            $table->string('source', 120)->nullable();
            $table->string('message', 1000);
            $table->string('url', 1000)->nullable();
            $table->string('method', 16)->nullable();
            $table->string('file', 1000)->nullable();
            $table->unsignedInteger('line')->nullable();
            $table->string('status', 24)->default('open')->index();
            $table->unsignedInteger('occurrence_count')->default(1);
            $table->timestamp('first_seen_at')->nullable()->index();
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->timestamp('last_notified_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->json('context')->nullable();
            $table->longText('trace')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_incidents');
    }
};
