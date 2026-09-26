<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qb_project_types', function (Blueprint $table) {
            $table->string('discovery_key', 100)->nullable()->unique();
            $table->string('discovery_label')->nullable();
        });
        foreach ([
            'business' => ['promote', 'Introduce my business and attract enquiries'],
            'ecommerce' => ['sell', 'Sell products with an online checkout'],
            'booking' => ['book', 'Take appointments or reservations'],
            'application' => ['product', 'Build an online product people can use'],
            'custom' => ['operations', 'Organise how my business works'],
        ] as $slug => [$key, $label]) {
            DB::table('qb_project_types')->where('slug', $slug)->update(['discovery_key' => $key, 'discovery_label' => $label]);
        }
        if (DB::table('qb_project_types')->where('slug', 'catalogue')->exists()) {
            return;
        }
        $id = DB::table('qb_project_types')->insertGetId([
            'slug' => 'catalogue', 'name' => 'One-page Product Catalogue',
            'description' => 'Showcase products on one page and receive enquiries on WhatsApp. A simpler starting point without a cart or online checkout.',
            'base_min' => 250000, 'base_max' => 300000, 'enabled' => true,
            'discovery_key' => 'showcase', 'discovery_label' => 'Showcase products and take enquiries on WhatsApp',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([
            ['How many products would you like to showcase?', [['Up to 10', 0, 0], ['11–30', 25000, 0], ['31–60', 50000, 1], ['More than 60', 100000, 2]]],
            ['Is your product content ready?', [['Photos and descriptions are ready', 0, 0], ['I need help organising my content', 25000, 0], ['I need product copy written', 50000, 1]]],
        ] as [$label, $options]) {
            DB::table('qb_questions')->insert(['project_type_id' => $id, 'label' => $label, 'options' => json_encode(array_map(fn ($o) => ['label' => $o[0], 'price' => $o[1], 'complexity' => $o[2]], $options)), 'created_at' => now(), 'updated_at' => now()]);
        }
        foreach ([
            ['One-page product showcase', 'Product photos, descriptions and optional displayed prices on one responsive page.', 0, 0, false],
            ['WhatsApp product enquiries', 'Customers ask about a product or arrange an order directly with you.', 0, 0, false],
            ['Business contact information', 'Your business details and contact links.', 0, 0, false],
            ['Product categories and filtering', 'Help visitors browse your product groups.', 25000, 1, true],
            ['Manage products yourself', 'An admin area to update your products, photos and prices.', 50000, 1, true],
            ['Enquiry form', 'Collect product enquiries through a contact form.', 15000, 0, true],
        ] as [$name, $description, $price, $score, $optional]) {
            DB::table('qb_features')->insert(['project_type_id' => $id, 'name' => $name, 'description' => $description, 'price' => $price, 'complexity' => $score, 'optional' => $optional, 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Retain the catalogue and its quote history on rollback.
        Schema::table('qb_project_types', function (Blueprint $table) {
            $table->dropUnique(['discovery_key']);
            $table->dropColumn(['discovery_key', 'discovery_label']);
        });
    }
};
