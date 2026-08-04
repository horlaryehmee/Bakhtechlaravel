<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SeoToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_seo_audit_reports_saved_page_issues(): void
    {
        DB::table('pages')->where('slug', 'home')->update([
            'seo_title' => '',
            'seo_description' => '',
            'excerpt' => '',
            'focus_keyword' => '',
            'content' => 'Short copy.',
            'og_image' => '',
            'updated_at' => now(),
        ]);
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'seo-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'SEO Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->getJson('/api/admin/seo/audit')
            ->assertOk()
            ->assertJsonStructure([
                'summary' => ['score', 'audited', 'indexable', 'critical', 'warnings'],
                'documents',
                'recommendations',
                'technical',
                'generatedAt',
            ]);

        $home = collect($response->json('documents'))->firstWhere('path', '/');
        $this->assertNotNull($home);
        $this->assertLessThan(80, $home['score']);
        $this->assertContains('meta_description', collect($home['issues'])->pluck('code')->all());
        $this->assertContains('focus_keyword', collect($home['issues'])->pluck('code')->all());
    }

    public function test_cms_page_metadata_is_present_in_initial_html(): void
    {
        DB::table('pages')->where('slug', 'about')->update([
            'seo_title' => 'Professional About Page SEO Title',
            'seo_description' => 'A complete and crawler-visible description for the professional about page used in this SEO response test.',
            'canonical_url' => 'https://bakhtech.com.ng/about-us',
            'meta_robots' => 'index,follow,max-image-preview:large',
            'og_title' => 'About Bakhtech on Social Media',
            'schema_json' => json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'AboutPage',
                'name' => 'About Bakhtech',
            ]),
            'updated_at' => now(),
        ]);

        $html = $this->get('/about')->assertOk()->getContent();

        $this->assertStringContainsString('<title>Professional About Page SEO Title</title>', $html);
        $this->assertStringContainsString('https://bakhtech.com.ng/about-us', $html);
        $this->assertStringContainsString('index,follow,max-image-preview:large', $html);
        $this->assertStringContainsString('About Bakhtech on Social Media', $html);
        $this->assertStringContainsString('application/ld+json', $html);
        $this->assertStringContainsString('AboutPage', $html);
    }

    public function test_suspicious_homepage_query_urls_are_removed_from_indexing(): void
    {
        $this->get('/?r=2866354602daf')
            ->assertGone()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

        $this->get('/?items%2FM222528597%2F=')
            ->assertGone()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    public function test_allowed_tracking_query_urls_redirect_to_canonical_path(): void
    {
        $this->get('/?utm_source=google&utm_campaign=test')
            ->assertMovedPermanently()
            ->assertRedirect(rtrim((string) config('app.url'), '/').'/');
    }

    public function test_unknown_public_paths_do_not_return_indexable_homepage_html(): void
    {
        $this->get('/shop')
            ->assertNotFound()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    public function test_admin_spa_shell_is_not_indexable(): void
    {
        $this->get('/admin/login')
            ->assertOk()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
}
