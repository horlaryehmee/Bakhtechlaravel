<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CrmDemoService
{
    private const TABLES = [
        'company' => 'crm_companies', 'contact' => 'crm_contacts',
        'deal' => 'crm_deals', 'project' => 'crm_projects',
        'task' => 'crm_tasks', 'activity' => 'crm_activities',
        'segment' => 'crm_segments',
    ];

    public function count(): int
    {
        return DB::table('crm_demo_records')->where('entity', 'contact')->count();
    }

    private function add(string $entity, array $values): int
    {
        $id = DB::table(self::TABLES[$entity])->insertGetId($values + ['created_at' => now(), 'updated_at' => now()]);
        DB::table('crm_demo_records')->insert(['entity' => $entity, 'entity_id' => $id]);
        return $id;
    }

    public function seed(): int
    {
        return DB::transaction(function () {
            if ($this->count()) return $this->count();

            $companies = [
                ['Aster Retail', 'aster.example.test', 'Lagos'],
                ['Cedar Health', 'cedar.example.test', 'Abuja'],
                ['Marina Foods', 'marina.example.test', 'Port Harcourt'],
                ['Northstar Learning', 'northstar.example.test', 'Ibadan'],
            ];
            $companyIds = [];
            foreach ($companies as [$name, $website, $city]) {
                $companyIds[] = $this->add('company', ['name' => "Demo · {$name}", 'website' => "https://{$website}", 'address' => $city.', Nigeria', 'notes' => 'Fictional CRM demo company.']);
            }

            $list = $this->add('segment', ['kind' => 'list', 'name' => 'Demo · Prospects', 'color' => '#2563eb']);
            $tag = $this->add('segment', ['kind' => 'tag', 'name' => 'Demo · Priority', 'color' => '#f59e0b']);
            $people = [
                ['Amara Okafor', 'amara', 0, 'qualified', 'Website redesign', 850000, 'proposal'],
                ['Tunde Bello', 'tunde', 0, 'proposal', 'Online store', 1450000, 'negotiation'],
                ['Zainab Musa', 'zainab', 1, 'contacted', 'Booking portal', 620000, 'qualified'],
                ['Chidi Nwosu', 'chidi', 1, 'won', 'Patient dashboard', 2100000, 'won'],
                ['Bisi Adeyemi', 'bisi', 2, 'new', 'Restaurant website', 480000, 'new'],
                ['Femi Eze', 'femi', 2, 'negotiation', 'Ordering app', 1750000, 'proposal'],
                ['Ngozi Adebayo', 'ngozi', 3, 'qualified', 'Learning platform', 1250000, 'qualified'],
                ['Ibrahim Sani', 'ibrahim', 3, 'lost', 'Course landing page', 390000, 'lost'],
            ];
            foreach ($people as $i => [$name, $email, $company, $stage, $interest, $value, $dealStage]) {
                $contact = $this->add('contact', [
                    'name' => $name, 'email' => "{$email}.demo@example.test", 'company_id' => $companyIds[$company],
                    'company' => $companies[$company][0], 'stage' => $stage, 'source' => 'demo',
                    'service_interest' => $interest, 'notes' => 'Fictional sample contact for exploring the CRM.',
                    'subscription_status' => 'unsubscribed', 'last_interaction_at' => now()->subDays($i + 1),
                ]);
                DB::table('crm_contact_segments')->insert(['contact_id' => $contact, 'segment_id' => $list]);
                if ($i < 3) DB::table('crm_contact_segments')->insert(['contact_id' => $contact, 'segment_id' => $tag]);
                $deal = $this->add('deal', [
                    'contact_id' => $contact, 'company_id' => $companyIds[$company], 'title' => $interest,
                    'stage' => $dealStage, 'estimated_value' => $value,
                    'agreed_value' => $dealStage === 'won' ? $value : null,
                    'expected_close_at' => now()->addDays(14 + $i * 5)->toDateString(),
                    'notes' => 'Fictional demo opportunity.',
                ]);
                $this->add('task', [
                    'contact_id' => $contact, 'deal_id' => $deal, 'title' => $i % 2 ? 'Prepare proposal' : 'Follow up with contact',
                    'due_at' => now()->addDays($i + 1)->toDateString(), 'priority' => $i < 3 ? 'high' : 'normal',
                    'status' => 'pending', 'completed' => false,
                ]);
                $this->add('activity', [
                    'contact_id' => $contact, 'type' => $i % 2 ? 'meeting' : 'call',
                    'subject' => 'Discovery conversation', 'body' => 'Discussed goals and next steps for '.$interest.'.',
                ]);
                if ($dealStage === 'won') $this->add('project', [
                    'contact_id' => $contact, 'deal_id' => $deal, 'title' => $interest.' implementation',
                    'status' => 'active', 'start_at' => now()->subDays(7)->toDateString(),
                    'due_at' => now()->addDays(30)->toDateString(), 'notes' => 'Fictional demo project.',
                ]);
            }
            return $this->count();
        });
    }

    public function clear(): int
    {
        return DB::transaction(function () {
            $count = $this->count();
            foreach (['project', 'task', 'activity', 'deal', 'contact', 'segment', 'company'] as $entity) {
                $ids = DB::table('crm_demo_records')->where('entity', $entity)->pluck('entity_id');
                DB::table(self::TABLES[$entity])->whereIn('id', $ids)->delete();
            }
            DB::table('crm_demo_records')->delete();
            return $count;
        });
    }
}
