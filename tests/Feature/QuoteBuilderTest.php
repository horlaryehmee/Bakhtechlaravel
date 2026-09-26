<?php

namespace Tests\Feature;

use App\Services\QuoteBuilder;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class QuoteBuilderTest extends TestCase
{
    use RefreshDatabase;

    private function configuration(string $slug = 'business'): array
    {
        $type = collect(app(QuoteBuilder::class)->catalog()['types'])->firstWhere('slug', $slug);

        return ['project_type' => $slug, 'answers' => $type->questions->mapWithKeys(fn ($q) => [$q->id => $q->options[0]['label']])->all(), 'features' => []];
    }

    private function token(string $role = 'admin'): string
    {
        config()->set('security.admin_token_secret', 'quote-builder-test-secret');
        $id = DB::table('admins')->insertGetId(['email' => $role.'@example.test', 'password_hash' => bcrypt('password'), 'name' => 'Estimator test', 'role' => $role, 'created_at' => now(), 'updated_at' => now()]);

        return AdminToken::make(DB::table('admins')->where('id', $id)->first());
    }

    public function test_every_project_type_has_relevant_questions_and_a_valid_range(): void
    {
        $types = $this->getJson('/api/quote-builder/catalog')->assertOk()->json('types');
        $this->assertCount(12, $types);
        foreach ($types as $type) {
            $this->assertNotEmpty($type['questions']);
            $estimate = $this->postJson('/api/quote-builder/estimate', $this->configuration($type['slug']))->assertOk()->json();
            $this->assertGreaterThanOrEqual(250000, $estimate['estimated_min']);
            $this->assertGreaterThan($estimate['estimated_min'], $estimate['estimated_max']);
            $this->assertSame($type['base_min'], $estimate['estimated_min']);
        }
    }

    public function test_features_and_complexity_change_the_range_and_custom_features_suppress_it(): void
    {
        $config = $this->configuration();
        $type = DB::table('qb_project_types')->where('slug', 'business')->first();
        $config['features'] = DB::table('qb_features')->where('project_type_id', $type->id)->whereIn('name', ['Booking system', 'Online payments', 'Content management / blog', 'Customer accounts'])->pluck('id')->all();
        $this->postJson('/api/quote-builder/estimate', $config)->assertOk()->assertJsonPath('estimated_min', 660000)->assertJsonPath('estimated_max', 795000)->assertJsonPath('calculation.additional', 250000)->assertJsonPath('complexity', 'Standard');
        $config['features'][] = DB::table('qb_features')->where('project_type_id', $type->id)->where('custom_quote', true)->value('id');
        $this->postJson('/api/quote-builder/estimate', $config)->assertOk()->assertJsonPath('custom_quote', true)->assertJsonPath('estimated_min', null)->assertJsonPath('estimated_max', null);
        $advanced = $this->configuration('custom');
        $customId = DB::table('qb_project_types')->where('slug', 'custom')->value('id');
        $advanced['features'] = DB::table('qb_features')->where('project_type_id', $customId)->where('custom_quote', false)->pluck('id')->all();
        $advanced['answers'] = collect(app(QuoteBuilder::class)->catalog()['types'])->firstWhere('slug', 'custom')->questions->mapWithKeys(fn ($q) => [$q->id => last($q->options)['label']])->all();
        $this->postJson('/api/quote-builder/estimate', $advanced)->assertOk()->assertJsonPath('custom_quote', true);
    }

    public function test_discovery_recommends_the_matching_solution_and_rejects_missing_goals(): void
    {
        foreach (['promote' => 'business', 'sell' => 'ecommerce', 'book' => 'booking', 'product' => 'application', 'operations' => 'custom'] as $goal => $slug) {
            $input = $this->configuration($slug);
            $input['project_type'] = 'unsure';
            $input['discovery'] = $goal;
            $name = DB::table('qb_project_types')->where('slug', $slug)->value('name');
            $this->postJson('/api/quote-builder/estimate', $input)->assertOk()->assertJsonPath('recommended_type', $name);
        }
        $this->postJson('/api/quote-builder/estimate', ['project_type' => 'unsure', 'answers' => [], 'features' => []])->assertUnprocessable();
    }

    public function test_validation_rejects_foreign_features_answers_and_disabled_types(): void
    {
        $input = $this->configuration();
        $other = DB::table('qb_project_types')->where('slug', 'ecommerce')->value('id');
        $input['features'] = [DB::table('qb_features')->where('project_type_id', $other)->value('id')];
        $this->postJson('/api/quote-builder/estimate', $input)->assertUnprocessable();
        $input = $this->configuration();
        $input['answers'][array_key_first($input['answers'])] = 'Invented answer';
        $this->postJson('/api/quote-builder/estimate', $input)->assertUnprocessable();
        DB::table('qb_project_types')->where('slug', 'business')->update(['enabled' => false]);
        $this->postJson('/api/quote-builder/estimate', $this->configuration('landing') + ['estimated_min' => 1])->assertOk()->assertJsonPath('estimated_min', 250000);
        $this->postJson('/api/quote-builder/estimate', ['project_type' => 'business', 'answers' => [], 'features' => []])->assertUnprocessable();
    }

    public function test_submission_stores_contact_relations_and_price_snapshots_and_rejects_incomplete_leads(): void
    {
        $input = $this->configuration('booking') + ['name' => 'Test Client', 'company' => 'Test Company', 'email' => 'quote@example.test', 'phone' => '+234 700 000 0000', 'description' => 'A test project', 'estimated_min' => 1];
        $this->postJson('/api/quote-builder/quotes', array_replace($input, ['email' => 'bad']))->assertUnprocessable();
        $this->postJson('/api/quote-builder/quotes', array_replace($input, ['answers' => []]))->assertUnprocessable();
        $reference = $this->postJson('/api/quote-builder/quotes', $input)->assertCreated()->json('reference');
        $quote = DB::table('qb_quotes')->where('reference', $reference)->first();
        $this->assertSame(450000, $quote->estimated_min);
        $this->assertDatabaseHas('qb_quote_features', ['quote_id' => $quote->id, 'name' => 'Booking system', 'price' => 0]);
        $this->assertSame(count($input['answers']), DB::table('qb_quote_answers')->where('quote_id', $quote->id)->count());
        DB::table('qb_project_types')->where('slug', 'booking')->update(['base_min' => 900000]);
        $this->assertDatabaseHas('qb_quotes', ['reference' => $reference, 'estimated_min' => 450000, 'email' => 'quote@example.test']);
        $this->withToken($this->token())->getJson('/api/admin/quote-builder/quotes')->assertOk()->assertJsonPath('data.0.reference', $reference)->assertJsonPath('data.0.calculation.base_min', 450000)->assertJsonCount(count($input['answers']), 'data.0.answers');
    }

    public function test_admin_can_manage_separate_prices_without_changing_existing_pricing(): void
    {
        $before = DB::table('pricing_categories')->get()->toJson();
        $this->getJson('/api/admin/quote-builder/catalog')->assertUnauthorized();
        $this->withToken($this->token('viewer'))->getJson('/api/admin/quote-builder/catalog')->assertForbidden();
        $this->withToken($this->token());
        $catalog = $this->getJson('/api/admin/quote-builder/catalog')->assertOk()->json();
        $type = $catalog['types'][0];
        $type['base_min'] = 700000;
        $type['base_max'] = 850000;
        $this->postJson('/api/admin/quote-builder/project_types/'.$type['id'], $type)->assertOk();
        $this->postJson('/api/quote-builder/estimate', $this->configuration())->assertOk()->assertJsonPath('estimated_min', 700000);
        $feature = $type['features'][0];
        $feature['price'] = 100000;
        $feature['optional'] = false;
        $this->postJson('/api/admin/quote-builder/features/'.$feature['id'], $feature)->assertOk();
        $this->postJson('/api/quote-builder/estimate', $this->configuration())->assertOk()->assertJsonPath('estimated_min', 800000);
        $question = $type['questions'][0];
        $question['options'][0]['price'] = 50000;
        $this->postJson('/api/admin/quote-builder/questions/'.$question['id'], $question)->assertOk();
        $this->postJson('/api/quote-builder/estimate', $this->configuration())->assertOk()->assertJsonPath('estimated_min', 850000);
        $rule = $catalog['rules'][0];
        $rule['uplift_percent'] = 10;
        $this->postJson('/api/admin/quote-builder/rules/'.$rule['id'], $rule)->assertOk();
        $this->postJson('/api/quote-builder/estimate', $this->configuration())->assertOk()->assertJsonPath('estimated_min', 935000);
        $rule['minimum_score'] = 3;
        $this->postJson('/api/admin/quote-builder/rules/'.$rule['id'], $rule)->assertUnprocessable();
        $this->postJson('/api/admin/quote-builder/project_types', array_replace($type, ['slug' => 'new-service', 'name' => 'New service', 'discovery_key' => 'new-goal', 'discovery_label' => 'A new customer goal']))->assertOk();
        $this->assertSame($before, DB::table('pricing_categories')->get()->toJson());
    }

    public function test_all_project_types_can_be_submitted_and_custom_quotes_store_null_amounts(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        foreach (app(QuoteBuilder::class)->catalog()['types'] as $type) {
            $input = $this->configuration($type->slug) + ['name' => 'Flow Test', 'company' => 'Flow Test Company', 'email' => 'flow@example.test', 'phone' => '+234 700 123 4567'];
            if ($type->slug === 'custom') {
                $input['features'] = [$type->features->firstWhere('custom_quote', true)->id];
            }
            $reference = $this->postJson('/api/quote-builder/quotes', $input)->assertCreated()->json('reference');
            $this->assertDatabaseHas('qb_quotes', ['reference' => $reference, 'project_type_id' => $type->id, 'estimated_min' => $type->slug === 'custom' ? null : $type->base_min]);
        }
        $this->assertDatabaseCount('qb_quotes', 12);
    }

    public function test_catalogue_is_a_simpler_editable_offer_and_discovery_survives_renaming(): void
    {
        $type = collect(app(QuoteBuilder::class)->catalog()['types'])->firstWhere('slug', 'catalogue');
        $this->assertNotNull($type);
        $this->assertFalse($type->features->contains('name', 'Online payments'));
        $input = $this->configuration('catalogue');
        $this->postJson('/api/quote-builder/estimate', $input)->assertOk()->assertJsonPath('estimated_min', 250000)->assertJsonCount(3, 'features');
        $this->withToken($this->token());
        $data = (array) $type;
        $data['name'] = 'Starter Product Showcase';
        $data['slug'] = 'starter-showcase';
        $data['base_min'] = 150000;
        $data['base_max'] = 180000;
        $this->postJson('/api/admin/quote-builder/project_types/'.$type->id, $data)->assertOk();
        $this->getJson('/api/quote-builder/catalog')->assertOk()->assertJsonFragment(['name' => 'Starter Product Showcase', 'base_min' => 150000]);
        $input['project_type'] = 'unsure';
        $input['discovery'] = 'showcase';
        $this->postJson('/api/quote-builder/estimate', $input)->assertOk()->assertJsonPath('recommended_type', 'Starter Product Showcase')->assertJsonPath('estimated_min', 150000)->assertJsonPath('estimated_max', 180000);
        $input['features'] = [$type->features->firstWhere('name', 'Manage products yourself')->id];
        $this->postJson('/api/quote-builder/estimate', $input)->assertOk()->assertJsonPath('estimated_min', 200000);
        $data['base_min'] = 0;
        $this->postJson('/api/admin/quote-builder/project_types/'.$type->id, $data)->assertUnprocessable();
        $data['base_min'] = 150000;
        $data['enabled'] = false;
        $this->postJson('/api/admin/quote-builder/project_types/'.$type->id, $data)->assertOk();
        $this->postJson('/api/quote-builder/estimate', $input)->assertUnprocessable();
    }

    public function test_admin_order_is_persisted_for_projects_questions_and_features(): void
    {
        $this->withToken($this->token());
        $types = app(QuoteBuilder::class)->catalog(true)['types'];
        $ids = $types->pluck('id')->reverse()->values()->all();
        $this->postJson('/api/admin/quote-builder/order/project_types', ['ids' => $ids])->assertOk();
        $this->assertSame($ids, array_column($this->getJson('/api/quote-builder/catalog')->assertOk()->json('types'), 'id'));
        $type = $types->firstWhere('slug', 'business');
        $before = app(QuoteBuilder::class)->estimate($this->configuration());
        foreach (['questions', 'features'] as $entity) {
            $ordered = $type->{$entity}->pluck('id')->reverse()->values()->all();
            $this->postJson('/api/admin/quote-builder/order/'.$entity, ['ids' => $ordered, 'project_type_id' => $type->id])->assertOk();
            $public = collect($this->getJson('/api/quote-builder/catalog')->assertOk()->json('types'))->firstWhere('id', $type->id);
            $this->assertSame($ordered, array_column($public[$entity], 'id'));
            $this->postJson('/api/admin/quote-builder/order/'.$entity, ['ids' => array_slice($ordered, 1), 'project_type_id' => $type->id])->assertUnprocessable();
            $otherId = $types->firstWhere('slug', 'ecommerce')->{$entity}->first()->id;
            $invalid = $ordered;
            $invalid[0] = $otherId;
            $this->postJson('/api/admin/quote-builder/order/'.$entity, ['ids' => $invalid, 'project_type_id' => $type->id])->assertUnprocessable();
        }
        $this->assertSame($before['estimated_min'], app(QuoteBuilder::class)->estimate($this->configuration())['estimated_min']);
        $this->postJson('/api/admin/quote-builder/order/project_types', ['ids' => [$ids[0], $ids[0]]])->assertUnprocessable();
        $hidden = $ids[1];
        DB::table('qb_project_types')->where('id', $hidden)->update(['enabled' => false]);
        $visible = array_column($this->getJson('/api/quote-builder/catalog')->assertOk()->json('types'), 'id');
        $this->assertSame(array_values(array_diff($ids, [$hidden])), $visible);
    }

    public function test_ordering_requires_an_administrator(): void
    {
        $this->postJson('/api/admin/quote-builder/order/project_types', ['ids' => [1]])->assertUnauthorized();
        $this->withToken($this->token('viewer'))->postJson('/api/admin/quote-builder/order/project_types', ['ids' => [1]])->assertForbidden();
    }

    public function test_browsing_limits_do_not_block_a_completed_quote_submission(): void
    {
        for ($i = 0; $i < 250; $i++) {
            RateLimiter::hit(sha1('|127.0.0.1'), 60);
            RateLimiter::hit(md5('public-read127.0.0.1'), 60);
        }
        $input = $this->configuration() + ['name' => 'Rate Limit Test', 'company' => 'Test Company', 'email' => 'rate-test@example.test', 'phone' => '+234 700 123 4567'];
        $this->postJson('/api/quote-builder/quotes', $input)->assertCreated();
        $this->assertDatabaseHas('qb_quotes', ['email' => 'rate-test@example.test']);
    }

    public function test_quote_submission_still_limits_repeated_requests_with_a_useful_message(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/quote-builder/quotes', [])->assertUnprocessable();
        }
        $this->postJson('/api/quote-builder/quotes', [])->assertStatus(429)->assertHeader('Retry-After')
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'Please wait') && str_contains($message, 'Your selections'));
    }

    public function test_quote_builder_has_its_own_public_page_and_metadata(): void
    {
        $this->get('/quote-builder')->assertOk()->assertSee('Website &amp; Web Application Quote Builder', false);
    }
}
