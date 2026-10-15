<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('qb_project_types')->where('slug', 'author')->exists()) {
            return;
        }

        $now = now();
        $id = DB::table('qb_project_types')->insertGetId([
            'slug' => 'author',
            'name' => 'Author Website',
            'description' => 'Showcase your books, share your story and connect with readers.',
            'base_min' => 250000,
            'base_max' => 300000,
            'enabled' => true,
            'discovery_key' => 'author',
            'discovery_label' => 'Promote my books and connect with readers',
            'sort_order' => (int) DB::table('qb_project_types')->max('sort_order') + 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        foreach ([
            ['How many books would you like to feature?', [['One book', 0, 0], ['2–5 books', 25000, 0], ['6–20 books', 50000, 1], ['More than 20 books', 100000, 2]]],
            ['What is your main goal?', [['Introduce myself and my books', 0, 0], ['Grow my readership and email list', 25000, 1], ['Share regular articles and updates', 25000, 1]]],
        ] as $order => [$label, $options]) {
            DB::table('qb_questions')->insert([
                'project_type_id' => $id,
                'label' => $label,
                'options' => json_encode(array_map(fn ($option) => ['label' => $option[0], 'price' => $option[1], 'complexity' => $option[2]], $options)),
                'sort_order' => $order + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ([
            ['Author biography', 'Introduce yourself and your writing.', 0, 0, false],
            ['Book showcase', 'Display book covers, descriptions and purchase links.', 0, 0, false],
            ['Contact form', 'Let readers and event organisers get in touch.', 0, 0, false],
            ['Blog and updates', 'Publish news, articles and book announcements.', 50000, 1, true],
            ['Events and appearances', 'List readings, signings and upcoming events.', 25000, 1, true],
            ['Newsletter signup', 'Collect subscribers for author updates.', 25000, 1, true],
            ['Direct book sales', 'Sell books through an online checkout.', 75000, 2, true],
        ] as $order => [$name, $description, $price, $complexity, $optional]) {
            DB::table('qb_features')->insert([
                'project_type_id' => $id,
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'complexity' => $complexity,
                'optional' => $optional,
                'custom_quote' => false,
                'enabled' => true,
                'sort_order' => $order + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // Keep existing author quotes and administrator edits intact.
    }
};
