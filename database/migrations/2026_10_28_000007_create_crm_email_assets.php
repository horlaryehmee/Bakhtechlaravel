<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_email_assets', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20)->index();
            $table->string('name', 160);
            $table->string('subject', 190)->default('');
            $table->longText('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_email_assets');
    }
};
