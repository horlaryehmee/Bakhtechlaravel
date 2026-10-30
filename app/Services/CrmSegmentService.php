<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class CrmSegmentService
{
    public function apply(Builder $query, array $filters): Builder
    {
        if (!empty($filters['stage'])) $query->where('stage', $filters['stage']);
        if (!empty($filters['subscription_status'])) $query->where('subscription_status', $filters['subscription_status']);
        if (!empty($filters['source'])) $query->where('source', $filters['source']);
        if (!empty($filters['segment_id'])) {
            $query->whereIn('id', DB::table('crm_contact_segments')->where('segment_id', (int) $filters['segment_id'])->select('contact_id'));
        }
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%");
            });
        }
        return $query;
    }
}
