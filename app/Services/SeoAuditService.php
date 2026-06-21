<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SeoAuditService
{
    public function audit(): array
    {
        if (! Schema::hasTable('pages')) {
            return $this->emptyAudit();
        }

        $baseUrl = rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');
        $documents = DB::table('pages')->orderBy('sort_order')->orderBy('title')->get()
            ->map(fn (object $page) => $this->auditPage($page, $baseUrl));
        $published = $documents->where('status', 'published');
        $issues = $documents->flatMap(fn (array $document) => $document['issues']);

        return [
            'summary' => [
                'score' => $published->isEmpty() ? 0 : (int) round($published->avg('score')),
                'audited' => $documents->count(),
                'published' => $published->count(),
                'indexable' => $published->where('indexable', true)->count(),
                'critical' => $issues->where('severity', 'critical')->count(),
                'warnings' => $issues->where('severity', 'warning')->count(),
                'passedChecks' => $documents->sum('passedChecks'),
                'totalChecks' => $documents->sum('totalChecks'),
            ],
            'documents' => $documents->values()->all(),
            'recommendations' => $this->recommendations($issues),
            'technical' => [
                ['label' => 'XML sitemap', 'url' => $baseUrl.'/sitemap.xml', 'status' => 'active'],
                ['label' => 'Robots.txt', 'url' => $baseUrl.'/robots.txt', 'status' => 'active'],
                ['label' => 'Crawler metadata', 'url' => $baseUrl, 'status' => 'active'],
                ['label' => 'LLM discovery file', 'url' => $baseUrl.'/llms.txt', 'status' => 'active'],
            ],
            'generatedAt' => now()->toIso8601String(),
        ];
    }

    private function auditPage(object $page, string $baseUrl): array
    {
        $title = trim((string) ($page->seo_title ?: $page->title));
        $description = trim((string) ($page->seo_description ?: $page->excerpt));
        $keyword = trim((string) ($page->focus_keyword ?? ''));
        $plainContent = Str::lower(trim(strip_tags((string) ($page->content ?? ''))));
        $searchCopy = Str::lower($title.' '.$description.' '.$plainContent);
        $path = $page->slug === 'home' ? '/' : '/'.trim((string) $page->slug, '/');
        $expectedCanonical = $baseUrl.($path === '/' ? '' : $path);
        $canonical = trim((string) ($page->canonical_url ?? '')) ?: $expectedCanonical;
        $schema = trim((string) ($page->schema_json ?? ''));
        $schemaValid = $schema === '' || $this->validSchema($schema);
        $wordCount = str_word_count(strip_tags((string) ($page->content ?? '')));
        $checks = collect([
            $this->check('seo_title', 'SEO title', $title !== '', 15, 'critical', 'Add a unique SEO title.', strlen($title) >= 30 && strlen($title) <= 60, 'Keep the SEO title between 30 and 60 characters.'),
            $this->check('meta_description', 'Meta description', $description !== '', 15, 'critical', 'Add a compelling meta description.', strlen($description) >= 120 && strlen($description) <= 160, 'Keep the meta description between 120 and 160 characters.'),
            $this->check('focus_keyword', 'Focus keyword', $keyword !== '', 10, 'warning', 'Choose one primary search phrase for this page.'),
            $this->check('keyword_usage', 'Keyword usage', $keyword !== '' && str_contains($searchCopy, Str::lower($keyword)), 10, 'warning', 'Use the focus keyword naturally in the title, description, or body.'),
            $this->check('content_depth', 'Content depth', $wordCount >= 250, 15, 'warning', 'Expand the page to at least 250 useful words.'),
            $this->check('social_image', 'Social image', trim((string) ($page->og_image ?? '')) !== '', 10, 'warning', 'Add an Open Graph image for link previews.'),
            $this->check('canonical', 'Canonical URL', filter_var($canonical, FILTER_VALIDATE_URL) !== false, 10, 'critical', 'Add a valid canonical URL.'),
            $this->check('structured_data', 'Structured data', $schemaValid, 10, 'critical', 'Fix the invalid JSON-LD structured data.'),
            $this->check('slug', 'Clean URL', $page->slug === 'home' || preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', (string) $page->slug) === 1, 5, 'warning', 'Use a short lowercase URL slug with hyphens.'),
        ]);
        $issues = $checks->where('passed', false)->map(fn (array $check) => [
            'code' => $check['code'],
            'label' => $check['label'],
            'message' => $check['message'],
            'severity' => $check['severity'],
            'documentId' => (int) $page->id,
            'documentTitle' => (string) $page->title,
        ])->values();

        return [
            'id' => (int) $page->id,
            'type' => 'page',
            'title' => (string) $page->title,
            'path' => $path,
            'status' => (string) $page->status,
            'indexable' => $page->status === 'published' && ! str_contains((string) ($page->meta_robots ?? ''), 'noindex'),
            'score' => $checks->where('passed', true)->sum('weight'),
            'wordCount' => $wordCount,
            'titleLength' => strlen($title),
            'descriptionLength' => strlen($description),
            'canonicalUrl' => $canonical,
            'passedChecks' => $checks->where('passed', true)->count(),
            'totalChecks' => $checks->count(),
            'checks' => $checks->values()->all(),
            'issues' => $issues->all(),
        ];
    }

    private function check(string $code, string $label, bool $requiredPassed, int $weight, string $severity, string $requiredMessage, ?bool $qualityPassed = null, string $qualityMessage = ''): array
    {
        $passed = $requiredPassed && ($qualityPassed ?? true);

        return [
            'code' => $code,
            'label' => $label,
            'passed' => $passed,
            'weight' => $weight,
            'severity' => $severity,
            'message' => ! $requiredPassed ? $requiredMessage : ($passed ? 'Passed' : $qualityMessage),
        ];
    }

    private function validSchema(string $schema): bool
    {
        $decoded = json_decode($schema, true);

        return is_array($decoded) && isset($decoded['@context'], $decoded['@type']);
    }

    private function recommendations(Collection $issues): array
    {
        return $issues->groupBy('code')->map(function (Collection $group) {
            $issue = $group->first();

            return [
                'code' => $issue['code'],
                'label' => $issue['label'],
                'message' => $issue['message'],
                'severity' => $issue['severity'],
                'affected' => $group->count(),
            ];
        })->sortBy(fn (array $item) => ($item['severity'] === 'critical' ? 0 : 1).str_pad((string) (99 - $item['affected']), 2, '0', STR_PAD_LEFT))->values()->all();
    }

    private function emptyAudit(): array
    {
        return [
            'summary' => ['score' => 0, 'audited' => 0, 'published' => 0, 'indexable' => 0, 'critical' => 0, 'warnings' => 0, 'passedChecks' => 0, 'totalChecks' => 0],
            'documents' => [],
            'recommendations' => [],
            'technical' => [],
            'generatedAt' => now()->toIso8601String(),
        ];
    }
}
