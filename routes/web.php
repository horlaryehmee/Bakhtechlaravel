<?php

use App\Support\SiteDefaults;
use App\Support\SpaMetadataResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

$seoBaseUrl = fn () => rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');

$seoStaticPages = fn () => collect([
    ['path' => '/', 'slug' => 'home', 'title' => 'Bakhtech Solutions', 'description' => 'Modern websites, online stores, booking systems, dashboards, portals, and custom web apps for businesses that want to look professional and work smarter online.'],
    ['path' => '/about', 'slug' => 'about', 'title' => 'About Bakhtech Solutions', 'description' => 'A practical web design and development team helping businesses turn ideas into clear, reliable digital tools.'],
    ['path' => '/portfolio', 'slug' => 'portfolio', 'title' => 'Bakhtech Solutions Portfolio', 'description' => 'Real examples of websites, ecommerce stores, booking platforms, dashboards, and custom web apps built for business goals.'],
    ['path' => '/pricing', 'slug' => 'pricing', 'title' => 'Bakhtech Solutions Pricing', 'description' => 'Clear website, ecommerce, booking system, and custom software packages for businesses planning their next digital project.'],
    ['path' => '/booking', 'slug' => 'booking', 'title' => 'Book a Discovery Call', 'description' => 'Schedule a consultation with Bakhtech Solutions to talk through your website, online store, booking platform, dashboard, or custom web app.'],
    ['path' => '/contact', 'slug' => 'contact', 'title' => 'Contact Bakhtech Solutions', 'description' => 'Contact Bakhtech Solutions to plan a website, online store, booking system, dashboard, client portal, or custom business web app.'],
]);

$cmsPageResponse = function (string $slug) use ($seoBaseUrl) {
    if (! Schema::hasTable('pages')) {
        return null;
    }

    $page = DB::table('pages')->where('slug', $slug)->where('status', 'published')->first();
    if (! $page) {
        return null;
    }

    $baseUrl = $seoBaseUrl();
    $path = $page->slug === 'home' ? '' : '/'.trim((string) $page->slug, '/');
    $canonical = trim((string) ($page->canonical_url ?? '')) ?: $baseUrl.$path;
    $title = trim((string) ($page->seo_title ?: $page->title));
    $description = trim((string) ($page->seo_description ?: $page->excerpt));
    $image = trim((string) ($page->og_image ?? '')) ?: SiteDefaults::SOCIAL_PREVIEW_IMAGE;
    if (str_starts_with($image, '/')) {
        $image = $baseUrl.$image;
    }
    $twitterImage = trim((string) ($page->twitter_image ?? '')) ?: $image;
    if (str_starts_with($twitterImage, '/')) {
        $twitterImage = $baseUrl.$twitterImage;
    }
    $schema = json_decode((string) ($page->schema_json ?? ''), true);
    if (! is_array($schema)) {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => trim((string) ($page->schema_type ?? 'WebPage')) ?: 'WebPage',
            'name' => $title,
            'description' => $description,
            'url' => $canonical,
        ];
    }

    return SpaMetadataResponse::make([
        'title' => $title,
        'description' => $description,
        'url' => $canonical,
        'image' => $image,
        'imageAlt' => $title,
        'robots' => (string) ($page->meta_robots ?? 'index,follow'),
        'ogTitle' => trim((string) ($page->og_title ?? '')) ?: $title,
        'ogDescription' => trim((string) ($page->og_description ?? '')) ?: $description,
        'twitterTitle' => trim((string) ($page->twitter_title ?? '')) ?: $title,
        'twitterDescription' => trim((string) ($page->twitter_description ?? '')) ?: $description,
        'twitterImage' => $twitterImage,
        'schema' => $schema,
    ]);
};

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
        ."- Professional business websites\n"
        ."- Ecommerce stores and payment-enabled customer journeys\n"
        ."- Booking systems and appointment workflows\n"
        ."- Custom dashboards, portals, and web applications\n"
        ."- Website speed, security, content structure, and conversion improvements\n\n"
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

Route::get('/', function (Request $request) use ($legacyInvoiceRedirect, $cmsPageResponse) {
    if ($redirect = $legacyInvoiceRedirect($request)) {
        return $redirect;
    }

    if ($response = $cmsPageResponse('home')) {
        return $response;
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

    return response("# Bakhtech Solutions\n\n> Bakhtech Solutions builds modern websites, online stores, booking systems, dashboards, portals, and custom web applications for businesses that want a stronger online presence.\n\n## Website\n\n- Canonical site: {$baseUrl}\n- Contact email: solutions@bakhtech.com.ng\n- Phone: +234 708 637 2833\n\n## Core Public Pages\n\n{$links}\n\n## Markdown Mirrors\n\n{$mirrors}\n\n## Best Use\n\nUse this site as a source for Bakhtech Solutions services, contact details, pricing entry points, portfolio context, and discovery-call booking routes. Do not use private admin, invoice, receipt, or API routes as public citation sources.\n", 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
});

Route::get('/markdown-mirrors.txt', function () use ($seoBaseUrl, $seoStaticPages) {
    $baseUrl = $seoBaseUrl();
    $links = $seoStaticPages()
        ->map(fn ($page) => "- {$page['title']}: {$baseUrl}/markdown/{$page['slug']}.md")
        ->implode("\n");

    return response("# Bakhtech Solutions Markdown Mirrors\n\nThese Markdown mirrors provide clean text versions of the main public pages for crawlers, assistants, and content indexers.\n\n{$links}\n", 200, [
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

Route::get('/invoice/{token}', function (string $token) use ($seoBaseUrl) {
    $document = Schema::hasTable('invoice_documents')
        ? DB::table('invoice_documents')->where('public_token', $token)->first()
        : null;

    if (! $document) {
        return SpaMetadataResponse::make([
            'title' => 'Secure Document | Bakhtech Solutions',
            'description' => 'View your secure invoice, quote, or receipt from Bakhtech Solutions.',
            'url' => $seoBaseUrl().'/invoice/'.rawurlencode($token),
            'image' => SiteDefaults::SOCIAL_PREVIEW_IMAGE,
        ], true);
    }

    $branding = json_decode((string) ($document->branding_json ?? '{}'), true) ?: [];
    $business = trim((string) ($branding['businessName'] ?? 'Bakhtech Solutions')) ?: 'Bakhtech Solutions';
    $label = match ((string) $document->type) {
        'quote' => 'Quote',
        'receipt' => 'Receipt',
        default => 'Invoice',
    };
    $amount = number_format((float) ($document->type === 'invoice' ? $document->balance_due : $document->total), 2);
    $status = ucfirst(str_replace('_', ' ', (string) $document->status));
    $title = "{$label} {$document->number} from {$business}";
    $description = "Preview {$label} {$document->number} from {$business}. {$document->currency} {$amount}. Status: {$status}.";

    return SpaMetadataResponse::make([
        'title' => $title,
        'description' => $description,
        'url' => $seoBaseUrl().'/invoice/'.rawurlencode($token),
        'image' => SiteDefaults::SOCIAL_PREVIEW_IMAGE,
        'imageAlt' => $title,
    ], true);
})->where('token', '[A-Za-z0-9_-]+');

Route::get('/receipt/{token}', function (string $token) use ($seoBaseUrl) {
    return SpaMetadataResponse::make([
        'title' => 'Payment Receipt | Bakhtech Solutions',
        'description' => 'View your secure Bakhtech Solutions payment receipt and transaction details.',
        'url' => $seoBaseUrl().'/receipt/'.rawurlencode($token),
        'image' => SiteDefaults::SOCIAL_PREVIEW_IMAGE,
    ], true);
})->where('token', '[A-Za-z0-9_-]+');

Route::get('/booking', function () use ($seoBaseUrl) {
    return SpaMetadataResponse::make([
        'title' => 'Book an Appointment | Bakhtech Solutions',
        'description' => 'Choose a service and reserve an available time with Bakhtech Solutions.',
        'url' => $seoBaseUrl().'/booking',
        'image' => SiteDefaults::SOCIAL_PREVIEW_IMAGE,
        'imageAlt' => 'Book an appointment with Bakhtech Solutions',
    ]);
});

Route::get('/book/{slug}', function (string $slug) use ($seoBaseUrl) {
    $calendar = Schema::hasTable('booking_calendars')
        ? DB::table('booking_calendars')->where('slug', $slug)->where('is_active', true)->first()
        : null;
    $name = trim((string) ($calendar->name ?? 'Appointment')) ?: 'Appointment';
    $description = trim(strip_tags((string) ($calendar->description ?? '')))
        ?: "Choose a service and reserve an available time for {$name} with Bakhtech Solutions.";

    return SpaMetadataResponse::make([
        'title' => "Book {$name} | Bakhtech Solutions",
        'description' => str($description)->limit(160, ''),
        'url' => $seoBaseUrl().'/book/'.rawurlencode($slug),
        'image' => SiteDefaults::SOCIAL_PREVIEW_IMAGE,
        'imageAlt' => "Book {$name} with Bakhtech Solutions",
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

Route::fallback(function (Request $request) use ($legacyInvoiceRedirect, $cmsPageResponse) {
    if ($request->isMethod('GET') && $redirect = $legacyInvoiceRedirect($request)) {
        return $redirect;
    }

    if (request()->is('api') || request()->is('api/*')) {
        return response()->json(['message' => 'API route not found. Clear Laravel route caches after deployment.'], 404);
    }

    $slug = trim($request->path(), '/');
    if ($request->isMethod('GET') && ! str_contains($slug, '/') && ($response = $cmsPageResponse($slug))) {
        return $response;
    }

    $index = public_path('index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    return response()->json(['message' => 'Not found.'], 404);
});
