<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuoteBuilder
{
    public function catalog(bool $admin = false): array
    {
        $types = DB::table('qb_project_types')->when(! $admin, fn ($q) => $q->where('enabled', true))->orderBy('sort_order')->orderBy('id')->get();
        foreach ($types as $type) {
            $type->questions = DB::table('qb_questions')->where('project_type_id', $type->id)->orderBy('sort_order')->orderBy('id')->get()->map(function ($q) {
                $q->options = json_decode($q->options, true);

                return $q;
            });
            $type->features = DB::table('qb_features')->where('project_type_id', $type->id)->when(! $admin, fn ($q) => $q->where('enabled', true))->orderBy('sort_order')->orderBy('id')->get();
        }

        return ['types' => $types, 'rules' => DB::table('qb_rules')->orderBy('minimum_score')->get()];
    }

    public function estimate(array $input, bool $complete = false): array
    {
        $slug = $input['project_type'];
        if ($slug === 'unsure') {
            $slug = DB::table('qb_project_types')->where('enabled', true)->whereNotNull('discovery_label')->where('discovery_key', $input['discovery'] ?? '')->value('slug');
            if (! $slug) {
                throw ValidationException::withMessages(['discovery' => 'Choose an available project goal.']);
            }
        }
        $type = collect($this->catalog()['types'])->firstWhere('slug', $slug);
        if (! $type) {
            throw ValidationException::withMessages(['project_type' => 'Choose an available project type.']);
        }
        $answers = $input['answers'] ?? [];
        $features = $input['features'] ?? [];
        $validQuestions = $type->questions->pluck('id')->map(fn ($id) => (string) $id)->all();
        foreach (array_keys($answers) as $id) {
            if (! in_array((string) $id, $validQuestions, true)) {
                throw ValidationException::withMessages(['answers' => 'A question does not belong to this project.']);
            }
        }
        if (array_diff($features, $type->features->pluck('id')->all())) {
            throw ValidationException::withMessages(['features' => 'A selected feature is unavailable for this project.']);
        }
        $score = 0;
        $extra = 0;
        $custom = false;
        $answerRows = [];
        $featureRows = [];
        foreach ($type->questions as $question) {
            $value = $answers[$question->id] ?? null;
            if ($value === null) {
                if ($complete) {
                    throw ValidationException::withMessages(['answers.'.$question->id => 'Please answer: '.$question->label]);
                }

                continue;
            }
            $option = collect($question->options)->firstWhere('label', $value);
            if (! $option) {
                throw ValidationException::withMessages(['answers.'.$question->id => 'Choose one of the available answers.']);
            }
            $score += $option['complexity'];
            $extra += $option['price'];
            $answerRows[] = ['question_id' => $question->id, 'question_label' => $question->label, 'answer' => $value, 'price' => $option['price']];
        }
        foreach ($type->features as $feature) {
            if ($feature->optional && ! in_array($feature->id, $features)) {
                continue;
            }
            $score += $feature->complexity;
            $extra += $feature->price;
            $custom = $custom || $feature->custom_quote;
            $featureRows[] = ['feature_id' => $feature->id, 'name' => $feature->name, 'price' => $feature->price];
        }
        $rule = DB::table('qb_rules')->where('minimum_score', '<=', $score)->orderByDesc('minimum_score')->first();
        $custom = $custom || $rule->custom_quote;
        $subtotal = $type->base_min + $extra;
        $uplift = (int) ceil($subtotal * $rule->uplift_percent / 100);
        $minimum = (int) (ceil(max($type->base_min, $subtotal + $uplift) / 5000) * 5000);
        $maximum = (int) (ceil(max($type->base_max + $extra + $uplift, $minimum * (1 + $rule->range_percent / 100)) / 5000) * 5000);
        $recommendation = $type->name;
        if ($score >= 12 && ! in_array($slug, ['application', 'custom', 'ecommerce'])) {
            $recommendation = 'Web Application';
        }

        return ['project_type_id' => $type->id, 'selected_type' => $input['project_type'], 'recommended_type' => $recommendation,
            'recommendation' => 'Based on your requirements, '.($recommendation === $type->name ? $recommendation.' appears to be a suitable fit.' : 'your project would benefit from a custom web application. We will review the scope with you.'),
            'complexity' => $rule->level, 'custom_quote' => (bool) $custom, 'estimated_min' => $custom ? null : $minimum, 'estimated_max' => $custom ? null : $maximum,
            'answers' => $answerRows, 'features' => $featureRows,
            'calculation' => ['project' => $type->name, 'base_min' => $type->base_min, 'base_max' => $type->base_max, 'additional' => $extra, 'score' => $score, 'uplift_percent' => $rule->uplift_percent, 'uplift' => $uplift, 'range_percent' => $rule->range_percent, 'discovery' => $input['discovery'] ?? null, 'rounding' => 5000],
        ];
    }
}
