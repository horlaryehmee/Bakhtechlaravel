<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_documents')
            || !Schema::hasColumn('invoice_documents', 'service_overview')
            || !Schema::hasColumn('invoice_documents', 'notes')) {
            return;
        }

        DB::table('invoice_documents')
            ->where('service_overview', 'like', '%Generated via Service Selector.%')
            ->orderBy('id')
            ->get(['id', 'service_overview', 'notes'])
            ->each(function ($document) {
                $summary = trim((string) $document->service_overview);
                $notes = trim((string) ($document->notes ?? ''));
                $plainSummary = trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode($summary, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) ?: '');

                if ($summary === '' || !str_starts_with($plainSummary, 'Generated via Service Selector.')) {
                    return;
                }

                if ($notes === '') {
                    $nextNotes = $summary;
                } elseif (str_contains($notes, $summary)) {
                    $nextNotes = $notes;
                } else {
                    $nextNotes = $summary . "\n\n" . $notes;
                }

                DB::table('invoice_documents')->where('id', $document->id)->update([
                    'service_overview' => null,
                    'notes' => $nextNotes,
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        //
    }
};
