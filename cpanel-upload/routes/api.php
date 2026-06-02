<?php

use App\Http\Controllers\Api\BakhtechApiController;
use App\Http\Middleware\RequireAdminToken;
use Illuminate\Support\Facades\Route;

Route::get('/health', [BakhtechApiController::class, 'health']);
Route::post('/admin/login', [BakhtechApiController::class, 'login']);
Route::get('/projects', [BakhtechApiController::class, 'publicProjects']);
Route::get('/settings', [BakhtechApiController::class, 'publicSettings']);
Route::post('/visits', [BakhtechApiController::class, 'trackVisit']);

Route::middleware(RequireAdminToken::class)->group(function () {
    Route::get('/admin/me', [BakhtechApiController::class, 'me']);
    Route::get('/admin/dashboard', [BakhtechApiController::class, 'dashboard']);
    Route::get('/admin/projects', [BakhtechApiController::class, 'adminProjects']);
    Route::get('/admin/cms', [BakhtechApiController::class, 'cms']);
    Route::put('/admin/pages/{id}', [BakhtechApiController::class, 'updatePage']);
    Route::post('/admin/posts', [BakhtechApiController::class, 'createPost']);
    Route::put('/admin/posts/{id}', [BakhtechApiController::class, 'updatePost']);
    Route::delete('/admin/posts/{id}', [BakhtechApiController::class, 'deletePost']);
    Route::post('/admin/bookings', [BakhtechApiController::class, 'createBooking']);
    Route::put('/admin/bookings/{id}', [BakhtechApiController::class, 'updateBooking']);
    Route::put('/admin/settings', [BakhtechApiController::class, 'updateSettings']);
    Route::get('/admin/media', [BakhtechApiController::class, 'media']);
    Route::post('/admin/media', [BakhtechApiController::class, 'uploadMedia']);
    Route::delete('/admin/media/{id}', [BakhtechApiController::class, 'deleteMedia']);
    Route::post('/admin/projects', [BakhtechApiController::class, 'createProject']);
    Route::put('/admin/projects/{id}', [BakhtechApiController::class, 'updateProject']);
    Route::delete('/admin/projects/{id}', [BakhtechApiController::class, 'deleteProject']);
});

