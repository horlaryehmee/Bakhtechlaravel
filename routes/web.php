<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    $legacyToken = $request->query('view_invoice')
        ?: $request->query('view_quote')
        ?: $request->query('view_receipt')
        ?: $request->query('bkinv_receipt_pdf');

    if (is_string($legacyToken) && trim($legacyToken) !== '') {
        $token = rawurlencode(trim($legacyToken));
        $isPdf = $request->query('download') === 'pdf' || $request->has('bkinv_receipt_pdf');

        return redirect($isPdf ? "/api/invoices/{$token}/pdf" : "/invoice/{$token}");
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

Route::fallback(function () {
    if (request()->is('api') || request()->is('api/*')) {
        return response()->json(['message' => 'API route not found. Clear Laravel route caches after deployment.'], 404);
    }

    $index = public_path('index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    return response()->json(['message' => 'Not found.'], 404);
});
