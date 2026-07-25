<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicProjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_projects_returns_published_backend_projects(): void
    {
        DB::table('projects')->insert([
            [
                'title' => 'Published project',
                'slug' => 'published-project',
                'category' => 'Website',
                'summary' => 'Visible on the frontend',
                'status' => 'published',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Mixed case published project',
                'slug' => 'mixed-case-published-project',
                'category' => 'Website',
                'summary' => 'Visible on the frontend',
                'status' => 'Published',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Legacy status project',
                'slug' => 'legacy-status-project',
                'category' => 'Website',
                'summary' => 'Visible on the frontend',
                'status' => '',
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Draft project',
                'slug' => 'draft-project',
                'category' => 'Website',
                'summary' => 'Hidden from the frontend',
                'status' => 'draft',
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $projects = $this->getJson('/api/projects')
            ->assertOk()
            ->json('projects');

        $titles = collect($projects)->pluck('title');

        $this->assertContains('Published project', $titles);
        $this->assertContains('Mixed case published project', $titles);
        $this->assertContains('Legacy status project', $titles);
        $this->assertNotContains('Draft project', $titles);
    }

    public function test_public_settings_normalizes_founder_desk_upload_url(): void
    {
        $uploadPath = public_path('uploads/founder-test.jpg');
        if (! is_dir(dirname($uploadPath))) {
            mkdir(dirname($uploadPath), 0755, true);
        }
        file_put_contents($uploadPath, 'test image');

        DB::table('settings')->updateOrInsert(
            ['key' => 'founder_desk_image'],
            ['value' => '/api/uploads/founder-test.jpg', 'created_at' => now(), 'updated_at' => now()],
        );

        try {
            $this->getJson('/api/settings')
                ->assertOk()
                ->assertJsonPath('settings.founder_desk_image', '/uploads/founder-test.jpg');
        } finally {
            @unlink($uploadPath);
        }
    }
}
