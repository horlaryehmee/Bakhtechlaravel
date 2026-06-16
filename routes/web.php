<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

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

    return response("User-agent: *\nAllow: /\nSitemap: {$baseUrl}/sitemap.xml\n", 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
});

Route::get('/sitemap.xml', function () {
    $baseUrl = rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');
    $paths = collect(['/', '/about', '/portfolio', '/pricing', '/booking', '/contact']);

    if (Schema::hasTable('pages')) {
        $cmsPaths = DB::table('pages')
            ->where('status', 'published')
            ->where('meta_robots', 'not like', '%noindex%')
            ->pluck('slug')
            ->map(fn ($slug) => $slug === 'home' ? '/' : '/'.trim((string) $slug, '/'));

        $paths = $paths->merge($cmsPaths);
    }

    $urls = $paths
        ->filter()
        ->unique()
        ->map(fn ($path) => '<url><loc>'.e($baseUrl.($path === '/' ? '' : $path)).'</loc><changefreq>weekly</changefreq><priority>'.($path === '/' ? '1.0' : '0.8').'</priority></url>')
        ->implode('');

    return response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.$urls.'</urlset>', 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
    ]);
});

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
