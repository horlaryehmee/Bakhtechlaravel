<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MaintenancePageTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = storage_path('framework/testing/maintenance-'.bin2hex(random_bytes(8)));
        config(['site_maintenance.notifications' => $this->directory]);
        $this->app->instance(\Illuminate\Contracts\Foundation\MaintenanceMode::class, new class implements \Illuminate\Contracts\Foundation\MaintenanceMode {
            public function activate(array $payload): void {}
            public function deactivate(): void {}
            public function active(): bool { return true; }
            public function data(): array { return ['retry' => 60]; }
        });
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directory);
        parent::tearDown();
    }

    public function test_browser_gets_designed_page_and_api_remains_json(): void
    {
        $this->get('/')->assertStatus(503)->assertSee("We're making Bakhtech even better.", false)->assertSee('Get an email when');
        $this->getJson('/api/settings')->assertStatus(503)->assertHeader('Content-Type', 'application/json');
    }

    public function test_signup_works_during_maintenance_and_is_encrypted_and_deduplicated(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.71']);
        $this->postJson('/api/maintenance/notify', ['email' => 'visitor@example.com'])->assertStatus(202);
        $this->postJson('/api/maintenance/notify', ['email' => 'visitor@example.com'])->assertStatus(202);
        $files = glob($this->directory.'/*.json');
        $this->assertCount(1, $files);
        $this->assertStringNotContainsString('visitor@example.com', file_get_contents($files[0]));
        $this->assertStringContainsString('visitor@example.com', Crypt::decryptString(file_get_contents($files[0])));
        Mail::fake();
        $this->artisan('site:maintenance-notifications')->assertSuccessful();
        Mail::assertNothingSent();
        $this->assertFileExists($files[0]);
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->postJson('/api/maintenance/notify', ['email' => 'invalid'])->assertUnprocessable();
    }

    public function test_notification_is_sent_after_recovery_and_removed(): void
    {
        File::ensureDirectoryExists($this->directory);
        $file = $this->directory.'/notification.json';
        File::put($file, Crypt::encryptString(json_encode(['email' => 'visitor@example.com', 'createdAt' => now()->toIso8601String()])));
        $mode = \Mockery::mock(\Illuminate\Contracts\Foundation\MaintenanceMode::class);
        $mode->shouldReceive('active')->andReturn(false);
        $this->app->instance(\Illuminate\Contracts\Foundation\MaintenanceMode::class, $mode);
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->once()->withArgs(function ($body, $callback) {
            $message = new \Illuminate\Mail\Message(new \Symfony\Component\Mime\Email);
            $callback($message);
            return str_contains($body, 'back online') && $message->getSymfonyMessage()->getTo()[0]->getAddress() === 'visitor@example.com';
        });
        $this->artisan('site:maintenance-notifications')->assertSuccessful();
        $this->assertFileDoesNotExist($file);
    }
}
