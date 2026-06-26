<?php

use App\Services\DatabaseSynchronizer;
use Carbon\Carbon;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('database:check {--repair : Insert missing baseline records without overwriting existing data}', function (DatabaseSynchronizer $synchronizer) {
    if ($this->option('repair')) {
        $changes = $synchronizer->repair();
        $this->info('Synchronization changes: '.collect($changes)->map(fn ($count, $name) => "{$name}={$count}")->implode(', '));
    }

    DB::connection()->getPdo();
    $this->info('Database connection: OK ('.DB::connection()->getDriverName().')');

    $requiredTables = [
        'admins', 'pages', 'posts', 'projects', 'settings', 'reviews', 'review_sources',
        'booking_calendars', 'booking_event_types', 'booking_resources', 'booking_availability_rules',
        'booking_settings', 'bookings', 'invoice_clients', 'invoice_documents',
        'invoice_document_items', 'invoice_payments', 'invoice_events', 'invoice_email_logs',
        'pricing_categories', 'pricing_features', 'pricing_plans', 'pricing_plan_features',
        'pricing_versions', 'sessions', 'cache', 'jobs',
    ];
    $missingTables = collect($requiredTables)->reject(fn ($table) => Schema::hasTable($table))->values();

    $migrationFiles = collect(File::files(database_path('migrations')))
        ->map(fn ($file) => pathinfo($file->getFilename(), PATHINFO_FILENAME));
    $ranMigrations = Schema::hasTable('migrations') ? DB::table('migrations')->pluck('migration') : collect();
    $pendingMigrations = $migrationFiles->diff($ranMigrations)->values();

    $relationships = [
        ['pages', 'parent_id', 'pages'],
        ['reviews', 'review_source_id', 'review_sources'],
        ['booking_resources', 'booking_calendar_id', 'booking_calendars'],
        ['booking_availability_rules', 'booking_calendar_id', 'booking_calendars'],
        ['booking_availability_rules', 'booking_event_type_id', 'booking_event_types'],
        ['booking_blackouts', 'booking_calendar_id', 'booking_calendars'],
        ['bookings', 'booking_calendar_id', 'booking_calendars'],
        ['bookings', 'booking_event_type_id', 'booking_event_types'],
        ['bookings', 'booking_resource_id', 'booking_resources'],
        ['booking_history_logs', 'booking_id', 'bookings'],
        ['invoice_documents', 'client_id', 'invoice_clients'],
        ['invoice_document_items', 'document_id', 'invoice_documents'],
        ['invoice_payments', 'document_id', 'invoice_documents'],
        ['invoice_events', 'document_id', 'invoice_documents'],
        ['invoice_email_logs', 'document_id', 'invoice_documents'],
        ['pricing_plans', 'pricing_category_id', 'pricing_categories'],
        ['pricing_plan_features', 'pricing_plan_id', 'pricing_plans'],
        ['pricing_plan_features', 'pricing_feature_id', 'pricing_features'],
        ['pricing_versions', 'pricing_plan_id', 'pricing_plans'],
    ];
    $orphans = collect($relationships)->mapWithKeys(function ($relationship) {
        [$child, $foreignKey, $parent] = $relationship;
        $label = "{$child}.{$foreignKey}";

        if (! Schema::hasTable($child) || ! Schema::hasTable($parent) || ! Schema::hasColumn($child, $foreignKey)) {
            return [$label => 0];
        }

        $count = DB::table($child)
            ->leftJoin("{$parent} as related_parent", 'related_parent.id', '=', "{$child}.{$foreignKey}")
            ->whereNotNull("{$child}.{$foreignKey}")
            ->whereNull('related_parent.id')
            ->count();

        return [$label => $count];
    })->filter();

    $foreignKeyErrors = collect();
    if (DB::connection()->getDriverName() === 'sqlite') {
        $foreignKeyErrors = collect(DB::select('PRAGMA foreign_key_check'));
    }

    $baseline = [
        'admins' => DB::table('admins')->count(),
        'published_pages' => DB::table('pages')->where('status', 'published')->count(),
        'settings' => DB::table('settings')->count(),
        'published_projects' => DB::table('projects')->where('status', 'published')->count(),
        'active_booking_calendars' => DB::table('booking_calendars')->where('is_active', true)->count(),
        'active_booking_event_types' => DB::table('booking_event_types')->where('is_active', true)->count(),
        'active_pricing_categories' => DB::table('pricing_categories')->where('is_active', true)->count(),
        'active_pricing_plans' => DB::table('pricing_plans')->where('is_active', true)->count(),
    ];
    $this->table(['Dataset', 'Rows'], collect($baseline)->map(fn ($count, $name) => [$name, $count])->values()->all());

    $failures = collect();
    if ($missingTables->isNotEmpty()) {
        $failures->push('Missing tables: '.$missingTables->implode(', '));
    }
    if ($pendingMigrations->isNotEmpty()) {
        $failures->push('Pending migrations: '.$pendingMigrations->implode(', '));
    }
    if ($orphans->isNotEmpty()) {
        $failures->push('Orphaned relationships: '.$orphans->map(fn ($count, $name) => "{$name}={$count}")->implode(', '));
    }
    if ($foreignKeyErrors->isNotEmpty()) {
        $failures->push('Database foreign-key check returned '.$foreignKeyErrors->count().' error(s).');
    }
    foreach (['admins', 'published_pages', 'settings', 'active_booking_calendars', 'active_booking_event_types', 'active_pricing_categories', 'active_pricing_plans'] as $requiredDataset) {
        if ($baseline[$requiredDataset] < 1) {
            $failures->push("Required dataset is empty: {$requiredDataset}");
        }
    }

    if ($failures->isNotEmpty()) {
        $failures->each(fn ($failure) => $this->error($failure));

        return 1;
    }

    $this->info('Database integrity: OK');

    return 0;
})->purpose('Check database connectivity, migrations, baseline records, and relationships');

Artisan::command('booking:send-reminders', function () {
    $result = app(\App\Services\BookingNotificationService::class)->sendDueReminders();

    $expired = $result['expired'] ?? 0;

    $this->info("Processed {$result['processed']} reminders: {$result['sent']} sent, {$result['failed']} failed, {$expired} expired.");
})->purpose('Send due booking reminder emails');

Schedule::command('booking:send-reminders')
    ->everyMinute()
    ->withoutOverlapping();
