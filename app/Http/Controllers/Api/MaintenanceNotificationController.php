<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class MaintenanceNotificationController extends Controller
{
    public function store(Request $request)
    {
        abort_unless(app()->isDownForMaintenance(), 409, 'The website is already online.');
        $data = $request->validate(['email' => 'required|email:rfc|max:254']);
        $cache = Cache::store('file');
        $key = 'maintenance-notify:'.hash('sha256', (string) $request->ip());
        $cache->add($key, 0, 600);
        abort_if($cache->increment($key) > 5, 429, 'Please try again later.');
        $email = strtolower(trim($data['email']));
        $directory = config('site_maintenance.notifications', storage_path('app/private/maintenance-notifications'));
        if (! is_dir($directory)) mkdir($directory, 0700, true);
        $file = $directory.'/'.hash_hmac('sha256', $email, config('app.key')).'.json';
        $lock = fopen($directory.'/.lock', 'c+');
        flock($lock, LOCK_EX);
        try {
            if (! is_file($file)) {
                file_put_contents($file, Crypt::encryptString(json_encode(['email' => $email, 'createdAt' => now()->toIso8601String()], JSON_THROW_ON_ERROR)), LOCK_EX);
                chmod($file, 0600);
            }
        } finally { flock($lock, LOCK_UN); fclose($lock); }
        return response()->json(['message' => 'Notification requested.'], 202)->header('Cache-Control', 'no-store');
    }
}
