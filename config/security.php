<?php

return [
    'admin_token_secret' => env('API_TOKEN_SECRET', ''),
    'flutterwave_webhook_secret' => env('FLUTTERWAVE_WEBHOOK_SECRET', ''),
    'bootstrap_admin_email' => env('ADMIN_EMAIL', 'admin@bakhtech.com.ng'),
    'bootstrap_admin_password' => env('ADMIN_PASSWORD', 'ChangeMe123!'),
    'bootstrap_admin_name' => env('ADMIN_NAME', 'Bakhtech Admin'),
];
