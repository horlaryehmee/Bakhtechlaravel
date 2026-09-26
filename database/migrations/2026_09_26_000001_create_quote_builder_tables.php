<?php

use Database\Seeders\QuoteBuilderSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qb_project_types', function (Blueprint $t) {
            $t->id();
            $t->string('slug')->unique();
            $t->string('name');
            $t->text('description');
            $t->unsignedInteger('base_min');
            $t->unsignedInteger('base_max');
            $t->boolean('enabled')->default(true);
            $t->timestamps();
        });
        Schema::create('qb_questions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_type_id')->constrained('qb_project_types');
            $t->string('label');
            $t->json('options');
            $t->timestamps();
        });
        Schema::create('qb_features', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_type_id')->constrained('qb_project_types');
            $t->string('name');
            $t->text('description');
            $t->unsignedInteger('price');
            $t->unsignedTinyInteger('complexity')->default(1);
            $t->boolean('optional')->default(true);
            $t->boolean('custom_quote')->default(false);
            $t->boolean('enabled')->default(true);
            $t->timestamps();
        });
        Schema::create('qb_rules', function (Blueprint $t) {
            $t->id();
            $t->string('level')->unique();
            $t->unsignedInteger('minimum_score');
            $t->unsignedInteger('uplift_percent');
            $t->unsignedInteger('range_percent');
            $t->boolean('custom_quote')->default(false);
            $t->timestamps();
        });
        Schema::create('qb_quotes', function (Blueprint $t) {
            $t->id();
            $t->uuid('reference')->unique();
            $t->foreignId('project_type_id')->constrained('qb_project_types');
            $t->string('selected_type');
            $t->string('recommended_type');
            $t->string('complexity');
            $t->unsignedBigInteger('estimated_min')->nullable();
            $t->unsignedBigInteger('estimated_max')->nullable();
            $t->json('calculation');
            $t->string('name');
            $t->string('company');
            $t->string('email');
            $t->string('phone');
            $t->text('description')->nullable();
            $t->timestamps();
        });
        Schema::create('qb_quote_answers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('quote_id')->constrained('qb_quotes')->cascadeOnDelete();
            $t->foreignId('question_id')->constrained('qb_questions');
            $t->string('question_label');
            $t->string('answer');
            $t->unsignedInteger('price');
        });
        Schema::create('qb_quote_features', function (Blueprint $t) {
            $t->id();
            $t->foreignId('quote_id')->constrained('qb_quotes')->cascadeOnDelete();
            $t->foreignId('feature_id')->constrained('qb_features');
            $t->string('name');
            $t->unsignedInteger('price');
        });
        (new QuoteBuilderSeeder)->run();
    }

    public function down(): void
    {
        foreach (['qb_quote_features', 'qb_quote_answers', 'qb_quotes', 'qb_rules', 'qb_features', 'qb_questions', 'qb_project_types'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
