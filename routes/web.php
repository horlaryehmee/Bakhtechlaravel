<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
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
    $index = public_path('index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    return response()->json(['message' => 'Not found.'], 404);
})->where('any', '^(?!api).*$');
