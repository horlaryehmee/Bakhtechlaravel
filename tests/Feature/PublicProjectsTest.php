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
                'title' => 'Draft project',
                'slug' => 'draft-project',
                'category' => 'Website',
                'summary' => 'Hidden from the frontend',
                'status' => 'draft',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $projects = $this->getJson('/api/projects')
            ->assertOk()
            ->json('projects');

        $titles = collect($projects)->pluck('title');

        $this->assertContains('Published project', $titles);
        $this->assertNotContains('Draft project', $titles);
    }
}
