<?php
use App\Http\Controllers\Api\ClientPortalController as Portal;
use App\Http\Middleware\RequirePortalIdentity;
use Illuminate\Support\Facades\Route;

Route::post('portal/login', [Portal::class, 'login'])->middleware('throttle:5,1');
Route::post('portal/invitation/exchange', [\App\Http\Controllers\Api\PortalOnboardingController::class, 'exchange'])->middleware('throttle:10,1');
Route::get('portal/google-availability', [\App\Http\Controllers\Api\PortalGoogleAuthController::class, 'availability'])->middleware('throttle:60,1');
foreach (['portal', 'client-admin'] as $prefix) {
    Route::prefix($prefix)->middleware([RequirePortalIdentity::class, 'throttle:120,1'])->group(function () use ($prefix) {
        Route::get('overview', [Portal::class, 'index']);
        Route::get('projects/{project}', [Portal::class, 'show'])->whereNumber('project');
        Route::get('projects/{project}/products', [Portal::class, 'products']);
        Route::post('projects/{project}/files', [Portal::class, 'upload']);
        Route::get('projects/{project}/files/{id}', [Portal::class, 'download']);
        if ($prefix === 'client-admin') {
            Route::get('google-settings', [\App\Http\Controllers\Api\PortalGoogleAuthController::class, 'settings']);
            Route::post('google-settings', [\App\Http\Controllers\Api\PortalGoogleAuthController::class, 'save']);
            Route::get('clients', [Portal::class, 'clients']);
            Route::get('client-lookup', [\App\Http\Controllers\Api\PortalOnboardingController::class, 'lookup']);
            Route::post('clients/{id}/invite', [\App\Http\Controllers\Api\PortalOnboardingController::class, 'invite'])->middleware('throttle:5,1');
            Route::post('clients/{id}/revoke', [\App\Http\Controllers\Api\PortalOnboardingController::class, 'revoke']);
            Route::post('clients/{id}/copy-link', [\App\Http\Controllers\Api\PortalOnboardingController::class, 'copyLink'])->middleware('throttle:20,1');
            Route::post('clients/{id?}', [Portal::class, 'saveClient']);
            Route::post('projects/{id?}', [Portal::class, 'saveProject'])->whereNumber('id');
            Route::post('projects/{project}/members', [Portal::class, 'member']);
            Route::post('projects/{project}/milestones/{id?}', [Portal::class, 'milestone']);
            Route::post('projects/{project}/requirements', [Portal::class, 'requirement']);
            Route::post('projects/{project}/review/{kind}/{id}', [Portal::class, 'review']);
        } else {
            Route::post('logout', [Portal::class, 'logout']);
            Route::post('account', [Portal::class, 'account']);
            Route::post('notifications/{id}', [Portal::class, 'notification']);
            Route::post('projects/{project}/products/{id?}', [Portal::class, 'product']);
            Route::post('projects/{project}/content/{id}', [Portal::class, 'submitContent']);
        }
    });
}
