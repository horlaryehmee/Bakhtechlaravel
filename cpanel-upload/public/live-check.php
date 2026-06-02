<?php

$basePath = dirname(__DIR__);
$requiredExtensions = ['ctype', 'dom', 'fileinfo', 'filter', 'hash', 'mbstring', 'openssl', 'pdo', 'pdo_mysql', 'session', 'tokenizer', 'xml'];
$requiredWritable = ['storage', 'bootstrap/cache', 'public/uploads'];

$missingExtensions = array_values(array_filter($requiredExtensions, fn ($extension) => !extension_loaded($extension)));
$notWritable = array_values(array_filter($requiredWritable, fn ($path) => !is_writable($basePath . '/' . $path)));

header('Content-Type: application/json');

echo json_encode([
    'ok' => !$missingExtensions && !$notWritable,
    'php' => PHP_VERSION,
    'missing_extensions' => $missingExtensions,
    'not_writable' => $notWritable,
], JSON_PRETTY_PRINT);
