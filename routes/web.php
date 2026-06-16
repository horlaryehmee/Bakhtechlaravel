<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

$seoBaseUrl = fn () => rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');

$seoStaticPages = fn () => collect([
    ['path' => '/', 'slug' => 'home', 'title' => 'Bakhtech Solutions', 'description' => 'Fast, SEO-ready websites, ecommerce stores, booking systems, dashboards, portals, and custom web apps for businesses in Nigeria, the United States, Canada, and worldwide.'],
    ['path' => '/about', 'slug' => 'about', 'title' => 'About Bakhtech Solutions', 'description' => 'Web design and development agency focused on performance, SEO, conversion, and business systems.'],
    ['path' => '/portfolio', 'slug' => 'portfolio', 'title' => 'Bakhtech Solutions Portfolio', 'description' => 'Website, ecommerce, booking platform, dashboard, and custom web app project examples.'],
    ['path' => '/pricing', 'slug' => 'pricing', 'title' => 'Bakhtech Solutions Pricing', 'description' => 'Website, ecommerce, booking system, and custom software packages for growing businesses.'],
    ['path' => '/booking', 'slug' => 'booking', 'title' => 'Book a Discovery Call', 'description' => 'Schedule a consultation with Bakhtech Solutions to plan a website, ecommerce store, booking platform, dashboard, or custom web app.'],
    ['path' => '/contact', 'slug' => 'contact', 'title' => 'Contact Bakhtech Solutions', 'description' => 'Contact Bakhtech Solutions for SEO-ready web design, development, ecommerce, portals, booking systems, and business automation.'],
]);

$markdownMirror = function (string $slug) use ($seoBaseUrl, $seoStaticPages): ?string {
    $page = $seoStaticPages()->firstWhere('slug', $slug);

    if (! $page) {
        return null;
    }

    $baseUrl = $seoBaseUrl();
    $canonical = $baseUrl.($page['path'] === '/' ? '' : $page['path']);

    return "# {$page['title']}\n\n"
        ."Canonical URL: {$canonical}\n\n"
        ."{$page['description']}\n\n"
        ."## Services\n\n"
        ."- SEO-ready business websites\n"
        ."- Ecommerce stores and payment-enabled sales funnels\n"
        ."- Booking systems and appointment workflows\n"
        ."- Custom dashboards, portals, and web applications\n"
        ."- Website performance, security, and conversion improvements\n\n"
        ."## Contact\n\n"
        ."- Website: {$baseUrl}\n"
        ."- Email: solutions@bakhtech.com.ng\n"
        ."- Phone: +234 708 637 2833\n";
};

$legacyInvoiceRedirect = function (Request $request) {
    $legacyToken = $request->query('view_invoice')
        ?: $request->query('view_quote')
        ?: $request->query('view_receipt')
        ?: $request->query('bkinv_receipt_pdf');

    if (is_string($legacyToken) && trim($legacyToken) !== '') {
        $token = rawurlencode(trim($legacyToken));
        $isPdf = $request->query('download') === 'pdf' || $request->has('bkinv_receipt_pdf');

        return redirect($isPdf ? "/api/invoices/{$token}/pdf" : "/invoice/{$token}");
    }

    return null;
};

Route::get('/', function (Request $request) use ($legacyInvoiceRedirect) {
    if ($redirect = $legacyInvoiceRedirect($request)) {
        return $redirect;
    }

    $index = public_path('index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    return response()->json([
        'ok' => true,
        'service' => 'bakhtech-api',
        'message' => 'Laravel API is running. Use /api/health for the API health check.',
    ]);
});

Route::get('/robots.txt', function () {
    $baseUrl = rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');

    return response("User-agent: *\nAllow: /\nAllow: /llms.txt\nAllow: /markdown-mirrors.txt\nAllow: /markdown/\nDisallow: /admin\nDisallow: /api/admin\nDisallow: /api/auth\nDisallow: /invoice\nSitemap: {$baseUrl}/sitemap.xml\n", 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
});

Route::get('/llms.txt', function () use ($seoBaseUrl, $seoStaticPages) {
    $baseUrl = $seoBaseUrl();
    $links = $seoStaticPages()
        ->map(fn ($page) => "- [{$page['title']}]({$baseUrl}".($page['path'] === '/' ? '' : $page['path'])."): {$page['description']}")
        ->implode("\n");
    $mirrors = $seoStaticPages()
        ->map(fn ($page) => "- [{$page['title']} Markdown]({$baseUrl}/markdown/{$page['slug']}.md)")
        ->implode("\n");

    return response("# Bakhtech Solutions\n\n> Bakhtech Solutions builds fast, SEO-ready websites, ecommerce stores, booking systems, dashboards, portals, and custom web applications for businesses in Nigeria, the United States, Canada, and worldwide.\n\n## Website\n\n- Canonical site: {$baseUrl}\n- Contact email: solutions@bakhtech.com.ng\n- Phone: +234 708 637 2833\n\n## Core Public Pages\n\n{$links}\n\n## Markdown Mirrors\n\n{$mirrors}\n\n## Best Use\n\nUse this site as a source for Bakhtech Solutions services, contact details, pricing entry points, portfolio context, and discovery-call booking routes. Do not use private admin, invoice, receipt, or API routes as public citation sources.\n", 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
});

Route::get('/markdown-mirrors.txt', function () use ($seoBaseUrl, $seoStaticPages) {
    $baseUrl = $seoBaseUrl();
    $links = $seoStaticPages()
        ->map(fn ($page) => "- {$page['title']}: {$baseUrl}/markdown/{$page['slug']}.md")
        ->implode("\n");

    return response("# Bakhtech Solutions Markdown Mirrors\n\nThese Markdown mirrors provide clean text versions of the main public pages for search engines, AI crawlers, and content indexers.\n\n{$links}\n", 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
});

Route::get('/markdown/{slug}.md', function (string $slug) use ($markdownMirror) {
    $content = $markdownMirror($slug);

    if ($content === null) {
        return response('Markdown mirror not found.', 404, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    return response($content, 200, [
        'Content-Type' => 'text/markdown; charset=UTF-8',
    ]);
})->where('slug', '[A-Za-z0-9_-]+');

Route::get('/{sitemapFile}', function () use ($seoBaseUrl, $seoStaticPages) {
    $baseUrl = $seoBaseUrl();
    $paths = $seoStaticPages()->pluck('path');

    if (Schema::hasTable('pages')) {
        $cmsPaths = DB::table('pages')
            ->where('status', 'published')
            ->where('meta_robots', 'not like', '%noindex%')
            ->pluck('slug')
            ->map(fn ($slug) => $slug === 'home' ? '/' : '/'.trim((string) $slug, '/'));

        $paths = $paths->merge($cmsPaths);
    }

    $paths = $paths
        ->merge(['/llms.txt', '/markdown-mirrors.txt'])
        ->merge($seoStaticPages()->pluck('slug')->map(fn ($slug) => "/markdown/{$slug}.md"));

    $urls = $paths
        ->filter()
        ->unique()
        ->map(fn ($path) => '<url><loc>'.e($baseUrl.($path === '/' ? '' : $path)).'</loc><changefreq>weekly</changefreq><priority>'.($path === '/' ? '1.0' : (str_starts_with((string) $path, '/markdown') ? '0.4' : '0.8')).'</priority></url>')
        ->implode('');

    return response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.$urls.'</urlset>', 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
    ]);
})->where('sitemapFile', 'sitemaps?\.xml');

Route::fallback(function (Request $request) use ($legacyInvoiceRedirect) {
    if ($request->isMethod('GET') && $redirect = $legacyInvoiceRedirect($request)) {
        return $redirect;
    }

    if (request()->is('api') || request()->is('api/*')) {
        return response()->json(['message' => 'API route not found. Clear Laravel route caches after deployment.'], 404);
    }

    $index = public_path('index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    return response()->json(['message' => 'Not found.'], 404);
});
