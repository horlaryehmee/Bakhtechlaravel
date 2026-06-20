<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminPostManagementTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        config()->set('security.admin_token_secret', 'post-management-test-secret');

        $id = DB::table('admins')->insertGetId([
            'email' => 'posts@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Post Manager',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return AdminToken::make(DB::table('admins')->where('id', $id)->first());
    }

    public function test_admin_posts_are_paginated_and_filtered_server_side(): void
    {
        $token = $this->adminToken();
        $rows = [];
        for ($index = 1; $index <= 120; $index++) {
            $rows[] = [
                'title' => "Scale Post {$index}",
                'slug' => "scale-post-{$index}",
                'excerpt' => "Practical post {$index}",
                'content' => str_repeat('Useful content ', 30),
                'category' => $index % 3 === 0 ? 'Guides' : 'News',
                'status' => $index % 2 === 0 ? 'published' : 'draft',
                'meta_robots' => 'index,follow',
                'published_at' => $index % 2 === 0 ? now() : null,
                'created_at' => now(),
                'updated_at' => now()->subMinutes($index),
            ];
        }
        DB::table('posts')->insert($rows);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/posts?page=2&perPage=10&search=Scale&status=published&category=Guides&sort=title_asc')
            ->assertOk()
            ->assertJsonPath('meta.currentPage', 2)
            ->assertJsonPath('meta.perPage', 10)
            ->assertJsonPath('meta.total', 20)
            ->assertJsonPath('meta.lastPage', 2)
            ->assertJsonPath('summary.total', 120)
            ->assertJsonPath('summary.published', 60)
            ->assertJsonPath('summary.drafts', 60);

        $this->assertCount(10, $response->json('data'));
        $this->assertContains('Guides', $response->json('categories'));
        $this->assertContains('News', $response->json('categories'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/cms')
            ->assertOk()
            ->assertJsonCount(0, 'posts');
    }

    public function test_admin_can_save_scheduled_post_seo_metadata(): void
    {
        $publishAt = now()->addDay()->seconds(0);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/admin/posts', [
                'title' => 'How to Plan a Better Business Website',
                'slug' => 'plan-a-better-business-website',
                'excerpt' => 'A practical guide for business owners planning a website that customers can understand and trust.',
                'content' => str_repeat('<p>Useful website planning advice.</p>', 40),
                'category' => 'Guides',
                'status' => 'scheduled',
                'publishedAt' => $publishAt->toIso8601String(),
                'seoTitle' => 'How to Plan a Better Business Website',
                'seoDescription' => 'Learn the practical steps for planning a professional business website with clear goals, useful content, and a better customer journey.',
                'focusKeyword' => 'business website planning',
                'canonicalUrl' => 'https://bakhtech.com.ng/blog/plan-a-better-business-website',
                'metaRobots' => 'index,follow',
                'ogTitle' => 'Plan a Business Website Customers Can Trust',
                'ogDescription' => 'A practical website planning guide for business owners.',
                'ogImage' => '/social-preview.png',
            ])
            ->assertCreated()
            ->assertJsonPath('post.status', 'scheduled')
            ->assertJsonPath('post.focusKeyword', 'business website planning')
            ->assertJsonPath('post.metaRobots', 'index,follow');

        $this->assertDatabaseHas('posts', [
            'id' => $response->json('post.id'),
            'slug' => 'plan-a-better-business-website',
            'status' => 'scheduled',
            'seo_title' => 'How to Plan a Better Business Website',
            'focus_keyword' => 'business website planning',
            'og_image' => '/social-preview.png',
        ]);
    }
}
