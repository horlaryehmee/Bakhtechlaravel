<?php

return [
    'enabled' => env('SITE_MAINTENANCE_ENABLED', false),
    'directory' => env('SITE_BACKUP_DIRECTORY', dirname(base_path()).'/.bakhtech-system'),
    'source' => env('SITE_UPDATE_SOURCE', dirname(base_path()).'/repositories/Bakhtechlaravel'),
];
