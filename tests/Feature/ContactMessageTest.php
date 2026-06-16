<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_stores_message_and_notifies_admin(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'contactEmail'],
            ['value' => 'admin@example.test', 'created_at' => now(), 'updated_at' => now()]
        );

        $response = $this->postJson('/api/contact', [
            'name' => 'Jane Client',
            'email' => 'jane@example.test',
            'phone' => '+234 800 123 4567',
            'subject' => 'Website redesign',
            'message' => 'I want a secure website redesign with better performance and lead generation.',
            'submittedAt' => now()->subSeconds(10)->timestamp,
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Thanks. Your message has been received.']);

        $this->assertDatabaseHas('contact_messages', [
            'name' => 'Jane Client',
            'email' => 'jane@example.test',
            'subject' => 'Website redesign',
            'status' => 'notified',
        ]);

        $this->assertNotNull(DB::table('contact_messages')->value('notified_at'));
    }

    public function test_contact_form_honeypot_submission_is_stored_as_spam(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'contactEmail'],
            ['value' => 'admin@example.test', 'created_at' => now(), 'updated_at' => now()]
        );

        $response = $this->postJson('/api/contact', [
            'name' => 'Bot Sender',
            'email' => 'bot@example.test',
            'message' => 'This message is long enough to pass validation but it filled a hidden field.',
            'website' => 'https://spam.example',
            'submittedAt' => now()->subSeconds(10)->timestamp,
        ]);

        $response->assertOk()
            ->assertJson(['message' => 'Thanks. Your message has been received.']);

        $this->assertDatabaseHas('contact_messages', [
            'email' => 'bot@example.test',
            'status' => 'spam',
            'spam_reason' => 'honeypot',
        ]);

        $this->assertNull(DB::table('contact_messages')->value('notified_at'));
    }
}
