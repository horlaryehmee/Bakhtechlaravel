<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('projects')) {
            return;
        }

        $projects = [
            ['Sanctuary Aesthetics & Spa', 'Booking Website', 'https://sanctuaryaestheticsandspa.com', 'https://bakhtech.com.ng/wp-content/uploads/2026/05/sanctuaryaestheticsandspa-1024x576.jpg'],
            ['5th Perfumer Bar', 'Booking Website, Ecommerce Website', 'https://5thperfumery.com', 'https://bakhtech.com.ng/wp-content/uploads/2026/03/5thperfumeryBakhtech-1024x576.jpg'],
            ['Carmana', 'Automobile', 'https://carmanallc.com', 'https://bakhtech.com.ng/wp-content/uploads/2026/02/CarmanaLLC-1024x576.jpg'],
            ['Bougie Hair', 'Ecommerce Website', 'https://bougiehairuk.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/12/ThumbnailBougieHair-1024x576.jpg'],
            ['Celeb Beauty Clinic', 'Beauty, Booking Website', 'https://celebbeautyclinic.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/12/BookBekeeCelebBEautyBakhtech-1024x576.jpg'],
            ['Karlha', 'Ecommerce Website', 'https://karlha.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/12/ThumbnailBakhtech-Solutions-1024x576.jpg'],
            ['Premier Hair Transplant', 'Health & Wellness', 'https://premierhairtransplant.com.ng', 'https://bakhtech.com.ng/wp-content/uploads/2026/05/PremiumHairTreatment-1024x576.jpg'],
            ['Book Bekee', 'Booking Website', 'https://bookbekee.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/06/BookBekee_byBakhtechSolutions-1024x576.jpg'],
            ['Faret', 'Ecommerce Website', 'https://faretonline.com', 'https://bakhtech.com.ng/wp-content/uploads/2026/03/FaretonlineBakhtech-1024x576.jpg'],
            ['Maple Education Canada Inc', 'Corporate Website', 'https://mapleeducation.ca', 'https://bakhtech.com.ng/wp-content/uploads/2025/06/Bakhtech_-Solutions_MapleEducation-1024x576.jpg'],
            ['Island Supermarket', 'Ecommerce Website', 'https://islandsupermarket.ng', 'https://bakhtech.com.ng/wp-content/uploads/2025/04/Island-Supermarket-1024x576.jpg'],
            ['Beautypreneur Hub', 'Business & Directory', 'https://beautypreneurhub.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/04/Beautypreneur-1024x576.jpg'],
            ['Bayara NG', 'Ecommerce Website', 'https://bayara.ng', 'https://bakhtech.com.ng/wp-content/uploads/2025/04/Bayara-Bakhtech-1024x576.jpg'],
            ['Spazio Label', 'Ecommerce Website', 'https://spaziolabel.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/03/spaziolabel_bakhtech-1024x576.jpg'],
            ['MJ Beauty Shop', 'Ecommerce Website', 'https://shopmjbeauty.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/12/Bakhtech-Solutions-1-1024x576.jpg'],
            ['House Of Xtyna', 'Ecommerce Website', 'https://houseofxtyna.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/12/Bakhtech-Solutions-1024x576.jpg'],
            ['Fifi Collections', 'Ecommerce Website', 'https://fificollections.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/11/fificollections_bakhtech-1024x576.jpg'],
            ['MindTality Plus', 'Health & Wellness', 'https://mindtalityplus.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/11/MindTality_Bakhtech-1024x576.jpg'],
            ['Avilla Mag', 'News & Magazine Websites', 'https://avillamag.com', 'https://bakhtech.com.ng/wp-content/uploads/2025/08/AvillaMAG-1024x576.jpg'],
            ['Avanista & Co', 'Corporate Website', 'https://avanistaandco.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/09/Avanista-by-Bakhtech-Solutions-1024x576.jpg'],
            ['Hatchmann Human', 'Corporate Website', 'https://hatchmann.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/09/hatchmann-by-Bakhtech-Solutions-1024x576.jpg'],
            ['Press Cabal', 'PR & Communications', 'https://presscabal.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/09/presscabal-bakhtech-solution-1024x576.jpg'],
            ['Prestige Flower Shop', 'Ecommerce Website', 'https://prestigeflowershop.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/06/Thumbnailensdhcc-1024x576.jpg'],
            ['Think Canada', 'Event Website', 'https://thinkcanadafair.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/06/Bakhtech_ThinkCanadaFair-1024x576.jpg'],
            ['Inclusicare Solution', 'Nonprofit Website', 'https://inclusicaresolution.ca', 'https://bakhtech.com.ng/wp-content/uploads/2024/02/Thumbnailensdh-1-1024x576.jpg'],
            ['Bakh Event Services', 'Event Planning', 'https://bakhevents.com.ng', 'https://bakhtech.com.ng/wp-content/uploads/2024/02/Thumbnailensdh-2-1024x576.jpg'],
            ['Sole Ledger', 'Accounting', 'https://soleledger.com', 'https://bakhtech.com.ng/wp-content/uploads/2024/01/Thumbnaile-1024x576.jpg'],
            ['Rapid Launch', 'Corporate Website', 'https://rapidlaunch.co', 'https://bakhtech.com.ng/wp-content/uploads/2024/01/Thumbnailc-1024x576.jpg'],
            ['Insight Tours', 'Travel', 'https://insighttours.com.ng', 'https://bakhtech.com.ng/wp-content/uploads/2024/01/Thumbnail-5-1024x576.jpg'],
            ['Mobility Options LTD', 'Immigration', 'https://moptions.org', 'https://bakhtech.com.ng/wp-content/uploads/2024/01/Thumbnail-1-1024x576.jpg'],
            ['Hyperculture', 'Agriculture', 'https://www.behance.net', 'https://bakhtech.com.ng/wp-content/uploads/2024/01/Thumbnail-2-1024x576.jpg'],
        ];

        $now = now();

        foreach ($projects as $index => [$title, $category, $url, $image]) {
            $slug = Str::slug($title);
            $services = collect(preg_split('/,|&/', $category))
                ->map(fn ($item) => trim($item))
                ->filter()
                ->values()
                ->all();

            DB::table('projects')->updateOrInsert(
                ['slug' => $slug],
                [
                    'title' => $title,
                    'category' => $category,
                    'summary' => $category,
                    'description' => $title . ' is a Bakhtech Solutions portfolio project in the ' . $category . ' category.',
                    'image' => $image,
                    'cover_image' => $image,
                    'video_url' => '',
                    'website_url' => $url,
                    'services_json' => json_encode($services),
                    'metrics_json' => json_encode(['Source' => 'Imported from bakhtech.com.ng/projects']),
                    'is_featured' => $index < 6,
                    'status' => 'published',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('projects')) {
            return;
        }

        $slugs = [
            'sanctuary-aesthetics-spa',
            '5th-perfumer-bar',
            'carmana',
            'bougie-hair',
            'celeb-beauty-clinic',
            'karlha',
            'premier-hair-transplant',
            'book-bekee',
            'faret',
            'maple-education-canada-inc',
            'island-supermarket',
            'beautypreneur-hub',
            'bayara-ng',
            'spazio-label',
            'mj-beauty-shop',
            'house-of-xtyna',
            'fifi-collections',
            'mindtality-plus',
            'avilla-mag',
            'avanista-co',
            'hatchmann-human',
            'press-cabal',
            'prestige-flower-shop',
            'think-canada',
            'inclusicare-solution',
            'bakh-event-services',
            'sole-ledger',
            'rapid-launch',
            'insight-tours',
            'mobility-options-ltd',
            'hyperculture',
        ];

        DB::table('projects')->whereIn('slug', $slugs)->delete();
    }
};
