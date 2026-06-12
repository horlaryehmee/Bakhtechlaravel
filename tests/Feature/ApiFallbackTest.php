<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiFallbackTest extends TestCase
{
    public function test_unknown_api_routes_return_json_404_instead_of_frontend_html(): void
    {
        $this->getJson('/api/route-that-does-not-exist')
            ->assertNotFound()
            ->assertJson([
                'message' => 'API route not found. Clear Laravel route caches after deployment.',
            ]);
    }
}
