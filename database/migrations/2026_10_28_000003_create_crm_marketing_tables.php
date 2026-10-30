<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_contacts', function (Blueprint $t) {
            $t->string('subscription_status', 20)->default('unsubscribed')->index();
            $t->timestamp('subscribed_at')->nullable();
        });
        Schema::create('crm_segments', function (Blueprint $t) {
            $t->id(); $t->string('kind', 10); $t->string('name', 120); $t->string('color', 20)->nullable(); $t->timestamps();
            $t->unique(['kind', 'name']);
        });
        Schema::create('crm_contact_segments', function (Blueprint $t) {
            $t->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $t->foreignId('segment_id')->constrained('crm_segments')->cascadeOnDelete();
            $t->primary(['contact_id', 'segment_id']);
        });
        Schema::create('crm_campaigns', function (Blueprint $t) {
            $t->id(); $t->string('name', 190); $t->string('subject', 190); $t->longText('body');
            $t->string('status', 20)->default('draft'); $t->foreignId('segment_id')->nullable()->constrained('crm_segments')->nullOnDelete();
            $t->timestamp('scheduled_at')->nullable(); $t->timestamp('sent_at')->nullable(); $t->timestamps();
        });
        Schema::create('crm_campaign_deliveries', function (Blueprint $t) {
            $t->id(); $t->foreignId('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
            $t->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
            $t->string('status', 20)->default('pending'); $t->text('error')->nullable();
            $t->timestamp('sent_at')->nullable(); $t->timestamp('opened_at')->nullable();
            $t->timestamps(); $t->unique(['campaign_id', 'contact_id']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('crm_campaign_deliveries'); Schema::dropIfExists('crm_campaigns');
        Schema::dropIfExists('crm_contact_segments'); Schema::dropIfExists('crm_segments');
        Schema::table('crm_contacts', fn (Blueprint $t) => $t->dropColumn(['subscription_status','subscribed_at']));
    }
};
