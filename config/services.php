<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_calendar' => [
        'calendar_id' => env('GOOGLE_CALENDAR_ID', 'primary'),
        'access_token' => env('GOOGLE_CALENDAR_ACCESS_TOKEN', ''),
        'oauth_client_id' => env('GOOGLE_OAUTH_CLIENT_ID', ''),
        'oauth_client_secret' => env('GOOGLE_OAUTH_CLIENT_SECRET', ''),
    ],

    'zoom' => [
        'account_id' => env('ZOOM_ACCOUNT_ID', ''),
        'client_id' => env('ZOOM_CLIENT_ID', ''),
        'client_secret' => env('ZOOM_CLIENT_SECRET', ''),
        'user_id' => env('ZOOM_USER_ID', 'me'),
    ],

    'paystack' => [
        'secret_key' => env('PAYSTACK_SECRET_KEY', ''),
        'public_key' => env('PAYSTACK_PUBLIC_KEY', ''),
        'callback_url' => env('PAYSTACK_CALLBACK_URL', ''),
    ],

    'flutterwave' => [
        'secret_key' => env('FLUTTERWAVE_SECRET_KEY', ''),
        'public_key' => env('FLUTTERWAVE_PUBLIC_KEY', ''),
    ],

];
