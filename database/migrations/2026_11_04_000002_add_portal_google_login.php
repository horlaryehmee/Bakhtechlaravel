<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portal_auth_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('google_enabled')->default(false);
            $table->string('google_client_id')->nullable();
            $table->text('google_client_secret')->nullable();
            $table->timestamps();
        });
        Schema::table('users', fn (Blueprint $table) => $table->string('google_subject')->nullable()->unique());
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('google_subject'));
        Schema::dropIfExists('portal_auth_settings');
    }
};
