<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('admins')->count() <= 1) {
            return;
        }

        DB::table('admins')
            ->where(function ($query) {
                $query->where('email', 'admin@YOUR_DOMAIN_HERE')
                    ->orWhere('email', 'like', '%YOUR_DOMAIN_HERE%');
            })
            ->delete();
    }

    public function down(): void
    {
        //
    }
};
