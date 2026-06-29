<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BookingCalendarFormFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        config()->set('security.admin_token_secret', 'booking-calendar-fields-secret');

        $id = DB::table('admins')->insertGetId([
            'email' => 'booking-calendar@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Booking Manager',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return AdminToken::make(DB::table('admins')->where('id', $id)->first());
    }

    public function test_admin_can_add_custom_booking_form_field_to_calendar(): void
    {
        $calendarId = DB::table('booking_calendars')->insertGetId([
            'name' => 'Discovery Call',
            'slug' => 'discovery-call',
            'description' => 'Book a discovery call.',
            'timezone' => 'Africa/Lagos',
            'color' => '#3b82f6',
            'settings_json' => json_encode([
                'form' => [
                    'fields' => [
                        ['key' => 'name', 'label' => 'Your Name', 'type' => 'name', 'enabled' => true, 'required' => true, 'system' => true],
                        ['key' => 'email', 'label' => 'Your Email', 'type' => 'email', 'enabled' => true, 'required' => true, 'system' => true],
                    ],
                    'customFields' => [],
                ],
            ]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->putJson("/api/admin/booking/calendars/{$calendarId}", [
                'id' => $calendarId,
                'name' => 'Discovery Call',
                'slug' => 'discovery-call',
                'description' => 'Book a discovery call.',
                'timezone' => 'Africa/Lagos',
                'color' => '#3b82f6',
                'bookingCount' => 0,
                'publicUrl' => '/book/discovery-call',
                'isActive' => true,
                'settings' => [
                    'form' => [
                        'fields' => [
                            ['key' => 'name', 'label' => 'Your Name', 'type' => 'name', 'enabled' => true, 'required' => true, 'system' => true],
                            ['key' => 'email', 'label' => 'Your Email', 'type' => 'email', 'enabled' => true, 'required' => true, 'system' => true],
                        ],
                        'customFields' => [
                            [
                                'key' => 'project_type',
                                'label' => 'Project Type',
                                'type' => 'dropdown',
                                'enabled' => true,
                                'required' => true,
                                'helpMessage' => 'Choose the closest option.',
                                'options' => ['Website', 'Store', 'Portal'],
                            ],
                        ],
                    ],
                ],
                'resources' => [],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('calendar.settings.form.customFields.0.key', 'project_type')
            ->assertJsonPath('calendar.settings.form.customFields.0.options.1', 'Store');

        $settings = json_decode(DB::table('booking_calendars')->where('id', $calendarId)->value('settings_json'), true);

        $this->assertSame('Project Type', $settings['form']['customFields'][0]['label']);
        $this->assertSame(['Website', 'Store', 'Portal'], $settings['form']['customFields'][0]['options']);
    }
}
