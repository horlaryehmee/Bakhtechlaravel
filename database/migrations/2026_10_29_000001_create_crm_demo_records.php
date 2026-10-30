<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_demo_records', function (Blueprint $table) {
            $table->id();
            $table->string('entity', 40);
            $table->unsignedBigInteger('entity_id');
            $table->unique(['entity', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_demo_records');
    }
};
