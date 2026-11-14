<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientPortalAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PortalGoogleAuthController extends Controller
{
    public function settings(Request $request, ClientPortalAccess $access)
    {
        $access->administrator($request);
        $settings = DB::table('portal_auth_settings')->where('id', 1)->first();
        return ['enabled' => (bool) $settings?->google_enabled, 'client_id' => $settings?->google_client_id ?? '', 'secret_configured' => !empty($settings?->google_client_secret), 'redirect_uri' => $this->redirectUri()];
    }

    public function save(Request $request, ClientPortalAccess $access)
    {
        $access->administrator($request);
        $data = $request->validate(['enabled' => 'required|boolean', 'client_id' => 'nullable|string|max:255|regex:/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/', 'client_secret' => 'nullable|string|max:2000']);
        $existing = DB::table('portal_auth_settings')->where('id', 1)->first();
        $secret = !empty($data['client_secret']) ? Crypt::encryptString($data['client_secret']) : $existing?->google_client_secret;
        abort_if($data['enabled'] && (empty($data['client_id']) || !$secret), 422, 'Enter the Google OAuth Client ID and Client Secret before enabling sign-in.');
        DB::table('portal_auth_settings')->updateOrInsert(['id' => 1], ['google_enabled' => $data['enabled'], 'google_client_id' => $data['client_id'] ?? null, 'google_client_secret' => $secret, 'created_at' => $existing?->created_at ?? now(), 'updated_at' => now()]);
        return $this->settings($request, $access);
    }

    public function availability()
    {
        $s = DB::table('portal_auth_settings')->where('id', 1)->first();
        return response()->json(['enabled' => (bool) ($s?->google_enabled && $s?->google_client_id && $s?->google_client_secret)])->header('Cache-Control', 'no-store');
    }

    private function redirectUri(): string
    {
        return rtrim(config('app.url'), '/').'/auth/google/callback';
    }

    public function start(Request $request)
    {
        $s = DB::table('portal_auth_settings')->where('id', 1)->first();
        if (!$s?->google_enabled || !$s->google_client_id || !$s->google_client_secret) return redirect('/portal?google_error=disabled');
        $state = Str::random(64);
        $verifier = Str::random(80);
        $request->session()->put('portal_google', ['state' => $state, 'verifier' => $verifier, 'expires' => time() + 600]);
        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => $s->google_client_id, 'redirect_uri' => $this->redirectUri(), 'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $state, 'prompt' => 'select_account', 'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='), 'code_challenge_method' => 'S256',
        ]));
    }

    public function callback(Request $request)
    {
        $flow = $request->session()->pull('portal_google');
        if (!$flow || $flow['expires'] < time() || !is_string($request->query('state')) || !hash_equals($flow['state'], $request->query('state'))) return redirect('/portal?google_error=expired');
        if ($request->has('error') || !$request->filled('code')) return redirect('/portal?google_error=cancelled');
        $s = DB::table('portal_auth_settings')->where('id', 1)->first();
        if (!$s?->google_enabled) return redirect('/portal?google_error=disabled');
        try {
            $tokens = Http::asForm()->timeout(15)->post('https://oauth2.googleapis.com/token', ['code' => $request->query('code'), 'client_id' => $s->google_client_id, 'client_secret' => Crypt::decryptString($s->google_client_secret), 'redirect_uri' => $this->redirectUri(), 'grant_type' => 'authorization_code', 'code_verifier' => $flow['verifier']]);
            if (!$tokens->successful() || !$tokens->json('access_token')) return redirect('/portal?google_error=failed');
            $response = Http::withToken($tokens->json('access_token'))->timeout(15)->get('https://openidconnect.googleapis.com/v1/userinfo');
            $identity = $response->json();
            if (!$response->successful() || ($identity['email_verified'] ?? false) !== true || empty($identity['sub']) || empty($identity['email'])) return redirect('/portal?google_error=unverified');
            $userId = DB::transaction(function () use ($identity) {
                $user = DB::table('users')->where('google_subject', $identity['sub'])->lockForUpdate()->first();
                if (!$user) {
                    // Only auto-link email addresses for which Google is authoritative.
                    $email = strtolower($identity['email']);
                    if (!str_ends_with($email, '@gmail.com') && empty($identity['hd'])) return null;
                    $user = DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->whereNull('google_subject')->lockForUpdate()->first();
                }
                if (!$user || !$user->portal_active) return null;
                DB::table('users')->where('id', $user->id)->update(['google_subject' => $identity['sub'], 'updated_at' => now()]);
                return $user->id;
            });
            if (!$userId) return redirect('/portal?google_error=no_account');
            $request->session()->regenerate();
            $request->session()->put('portal_google_identity', ['user_id' => $userId, 'expires' => time() + 60]);
            return redirect('/portal?google_complete=1')->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
        } catch (\Throwable) {
            // OAuth responses may contain credentials: never log their bodies or exception messages.
            return redirect('/portal?google_error=failed');
        }
    }

    public function complete(Request $request)
    {
        $identity = $request->session()->pull('portal_google_identity');
        abort_unless($identity && $identity['expires'] >= time() && DB::table('users')->where('id', $identity['user_id'])->where('portal_active', true)->exists(), 401);
        $token = Str::random(64);
        DB::table('portal_sessions')->insert(['user_id' => $identity['user_id'], 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHours(12), 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['token' => $token])->header('Cache-Control', 'private, no-store')->header('Pragma', 'no-cache');
    }
}
