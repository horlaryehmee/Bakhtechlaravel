<?php

namespace App\Support;

class SiteDefaults
{
    public static function pages(): array
    {
        return [
            ['title' => 'Home', 'slug' => 'home'],
            ['title' => 'About', 'slug' => 'about'],
            ['title' => 'Portfolio', 'slug' => 'portfolio'],
            ['title' => 'Ebook', 'slug' => 'ebook'],
            ['title' => 'Career', 'slug' => 'career'],
            ['title' => 'Contact', 'slug' => 'contact'],
        ];
    }

    public static function settings(): array
    {
        return [
            'siteName' => 'Bakhtech Solutions',
            'contactEmail' => 'solutions@bakhtech.com.ng',
            'phone' => '+234 708 637 2833',
            'activeHome' => 'home',
            'homePortfolioShowDescriptions' => 'true',
            'theme_light_primary' => '#1261ff',
            'theme_light_secondary' => '#12c8a0',
            'theme_light_active' => '#ef4444',
            'theme_dark_primary' => '#8bb8ff',
            'theme_dark_secondary' => '#67e8cf',
            'theme_dark_active' => '#ef4444',
            'navigation_items' => json_encode([
                ['label' => 'Home', 'href' => '/', 'visible' => true],
                ['label' => 'About', 'href' => '/about', 'visible' => true],
                ['label' => 'Portfolio', 'href' => '/portfolio', 'visible' => true, 'children' => []],
                ['label' => 'Booking', 'href' => '/booking', 'visible' => true],
                ['label' => 'Contact', 'href' => '/contact', 'visible' => true],
            ]),
            'googleReviewUrl' => '',
            'google_business_client_id' => '',
            'google_business_client_secret' => '',
            'trustpilotReviewUrl' => '',
            'facebookUrl' => '',
            'instagramUrl' => '',
            'linkedinUrl' => '',
            'tiktokUrl' => '',
            'twitterUrl' => '',
            'youtubeUrl' => '',
            'bookingIntro' => 'Choose a service, pick an available time, and receive a calendar invitation with reminders.',
            'invoicePaymentEnabled' => 'true',
            'invoiceDefaultPaymentGateway' => 'paystack',
            'invoiceEnabledPaymentGateways' => 'paystack,flutterwave',
            'company_name' => 'Bakhtech Solutions',
            'company_logo' => '/bakhtech-logo-light.png',
            'company_email' => 'solutions@bakhtech.com.ng',
            'company_phone' => '+234 708 637 2833',
            'company_address' => '',
            'company_website' => 'https://bakhtech.com.ng',
            'quote_prefix' => 'QT-',
            'invoice_prefix' => 'INV-',
            'starting_number' => '1000',
            'receipt_starting_number' => '1000',
            'currency' => 'NGN',
            'currency_symbol' => '',
            'pricing_rate_usd' => '0.00067',
            'pricing_rate_gbp' => '0.00053',
            'default_tax_rate' => '7.5',
            'tax_label' => 'VAT',
            'homepage_url' => '/',
            'homepage_label' => 'Homepage',
            'gateway_active' => 'paystack',
            'gateway_mode' => 'test',
            'enable_partial_payments' => '1',
            'paystack_public_test' => '',
            'paystack_secret_test' => '',
            'paystack_public_live' => '',
            'paystack_secret_live' => '',
            'flutter_public_test' => '',
            'flutter_secret_test' => '',
            'flutter_public_live' => '',
            'flutter_secret_live' => '',
            'bank_account_name' => '',
            'bank_account_number' => '',
            'bank_bank_name' => '',
            'bank_instructions' => '',
            'bank_currency_accounts' => '[]',
        ];
    }
}
