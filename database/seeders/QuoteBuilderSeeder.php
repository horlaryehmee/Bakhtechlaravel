<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QuoteBuilderSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('qb_project_types')->exists()) {
            return;
        }
        $types = [
            ['business', 'Business Website', 350000, 'Introduce your business and turn visitors into enquiries.'],
            ['landing', 'Landing Page', 250000, 'A focused page for a product, campaign or launch.'],
            ['corporate', 'Corporate Website', 600000, 'A structured presence for an established organisation.'],
            ['ecommerce', 'Ecommerce Website', 500000, 'Sell products and manage orders online.'],
            ['booking', 'Booking Website', 450000, 'Let customers book your time or services.'],
            ['portfolio', 'Portfolio / Personal Website', 250000, 'Showcase your work and build your personal brand.'],
            ['restaurant', 'Restaurant Website', 350000, 'Share your menu and welcome more customers.'],
            ['real-estate', 'Real Estate Website', 500000, 'Showcase properties and capture buyer enquiries.'],
            ['education', 'School / Education Website', 500000, 'Connect your school with students and families.'],
            ['application', 'Web Application', 1500000, 'An interactive product with accounts and workflows.'],
            ['custom', 'Custom Business System', 1500000, 'Software tailored to how your organisation works.'],
        ];
        foreach ($types as [$slug, $name, $base, $description]) {
            $id = DB::table('qb_project_types')->insertGetId(['slug' => $slug, 'name' => $name, 'description' => $description, 'base_min' => $base, 'base_max' => (int) ($base * 1.2), 'created_at' => now(), 'updated_at' => now()]);
            $question = function ($label, $options) use ($id) {
                DB::table('qb_questions')->insert(['project_type_id' => $id, 'label' => $label, 'options' => json_encode(array_map(fn ($o) => ['label' => $o[0], 'price' => $o[1], 'complexity' => $o[2]], $options)), 'created_at' => now(), 'updated_at' => now()]);
            };
            if ($slug === 'ecommerce') {
                $question('How many products will you launch with?', [['Up to 20', 0, 0], ['21–100', 50000, 1], ['101–500', 150000, 2], ['More than 500', 300000, 4]]);
                $question('Which payment methods do you need?', [['Bank transfer', 0, 0], ['Online payment gateway', 50000, 1], ['Multiple gateways and currencies', 150000, 3]]);
            } elseif (in_array($slug, ['application', 'custom'])) {
                $question('Who will use the system?', [['Your team', 0, 0], ['Your customers', 100000, 1], ['Multiple businesses or organisations', 400000, 4]]);
                $question('What should the system help you do?', [['Manage records and tasks', 0, 0], ['Run approvals and workflows', 200000, 2], ['Connect several business operations', 500000, 5]]);
            } else {
                $question('What is your main goal?', [['Introduce my work or organisation', 0, 0], ['Generate customer enquiries', 0, 0], ['Publish regular updates', 25000, 1]]);
                $question('How much content do you expect?', [['1–4 content sections/pages', 0, 0], ['5–8 content sections/pages', 25000, 0], ['9–20 content sections/pages', 75000, 1], ['More than 20', 150000, 2]]);
                $question('How large is your organisation?', [['Individual or small team', 0, 0], ['Growing business', 0, 0], ['Multiple departments or branches', 50000, 1]]);
            }
            $features = [
                ['Contact forms', 'Receive enquiries from visitors.', 0, 0, false],
                ['WhatsApp integration', 'Let customers start a conversation.', 0, 0, false],
                ['Content management / blog', 'Update content and publish news yourself.', 50000, 1, false],
                ['Customer accounts', 'Secure registration and customer profiles.', 75000, 2, false],
            ];
            if ($slug !== 'ecommerce') {
                $features[] = ['Online payments', 'Accept payments through a payment gateway.', 50000, 1, false];
            }
            $features[] = ['Booking system', 'Availability, appointments and booking management.', $slug === 'booking' ? 0 : 75000, 2, $slug === 'booking'];
            if ($slug === 'ecommerce') {
                $features = array_merge($features, [
                    ['Order management', 'View and manage incoming orders.', 0, 1, true],
                    ['Product variations', 'Sizes, colours and product options.', 50000, 1, false],
                    ['Delivery and shipping', 'Delivery zones and shipping rates.', 50000, 1, false],
                    ['Inventory management', 'Track stock availability.', 75000, 2, false],
                    ['Discounts and coupons', 'Run offers and promotions.', 35000, 1, false],
                ]);
            }
            if ($slug === 'restaurant') {
                $features[] = ['Online menu', 'An editable food and drinks menu.', 50000, 1, false];
            }
            if ($slug === 'real-estate') {
                $features[] = ['Property catalogue', 'Search and filter property listings.', 100000, 2, false];
            }
            if ($slug === 'education') {
                $features[] = ['Student portal', 'Student accounts and learning records.', 250000, 4, false];
            }
            if (in_array($slug, ['application', 'custom', 'corporate', 'education'])) {
                $features = array_merge($features, [
                    ['User roles and permissions', 'Different access for different teams.', 100000, 3, false],
                    ['Admin dashboard', 'Manage the system in one place.', 100000, 2, false],
                    ['Notifications', 'Email and in-app updates.', 75000, 1, false],
                    ['Reports and analytics', 'Operational reports and data exports.', 150000, 3, false],
                    ['Third-party integrations', 'Connect an external business service.', 200000, 3, false],
                ]);
            }
            $features[] = ['Complex custom functionality', 'Specialist workflows or integrations that need a discovery call.', 0, 5, false];
            foreach ($features as [$title,$desc,$price,$score,$required]) {
                DB::table('qb_features')->insert(['project_type_id' => $id, 'name' => $title, 'description' => $desc, 'price' => $price, 'complexity' => $score, 'optional' => ! $required, 'custom_quote' => $title === 'Complex custom functionality', 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        foreach ([['Basic', 0, 0, 15, false], ['Standard', 5, 10, 20, false], ['Advanced', 12, 20, 30, false], ['Discovery', 20, 0, 0, true]] as [$level,$score,$uplift,$range,$custom]) {
            DB::table('qb_rules')->insert(['level' => $level, 'minimum_score' => $score, 'uplift_percent' => $uplift, 'range_percent' => $range, 'custom_quote' => $custom, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
