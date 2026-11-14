<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('crm_contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $t->boolean('portal_password_set')->default(true);
        });
        Schema::create('portal_invitations', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('token_hash', 64)->unique(); $t->timestamp('expires_at');
            $t->timestamp('revoked_at')->nullable(); $t->timestamp('last_used_at')->nullable(); $t->timestamps();
        });
        Schema::create('portal_invitation_mail', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('invitation_id')->nullable()->constrained('portal_invitations')->nullOnDelete();
            $t->text('encrypted_payload')->nullable(); $t->string('status')->default('pending')->index();
            $t->unsignedInteger('attempts')->default(0); $t->timestamp('next_attempt_at')->nullable();
            $t->timestamp('sent_at')->nullable(); $t->string('error')->nullable(); $t->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('portal_invitation_mail'); Schema::dropIfExists('portal_invitations');
        Schema::table('users', function (Blueprint $t) { $t->dropConstrainedForeignId('crm_contact_id'); $t->dropColumn('portal_password_set'); });
    }
};
