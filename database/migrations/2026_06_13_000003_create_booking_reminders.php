<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('recipient_type', 20);
            $table->string('recipient_email');
            $table->unsignedInteger('minutes_before');
            $table->dateTime('scheduled_for');
            $table->string('status', 20)->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['booking_id', 'recipient_type', 'minutes_before']);
            $table->index(['status', 'scheduled_for']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_reminders');
    }
};
