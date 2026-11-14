<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreatePortalTestClient extends Command
{
    protected $signature = 'portal:test-client';
    protected $description = 'Create a local-only portal test client without changing existing accounts';

    public function handle(): int
    {
        if (!app()->environment('local')) { $this->error('This command is restricted to the local environment.'); return self::FAILURE; }
        $email = 'portal.test@bakhtech.local';
        if (DB::table('users')->where('email', $email)->exists()) { $this->warn('Test client already exists. Its password was not changed. Use admin client management to set a new password if needed.'); return self::SUCCESS; }
        $password = Str::password(20, symbols: false);
        DB::table('users')->insert(['name' => 'Portal Test Client', 'email' => $email, 'company' => 'Bakhtech — Local Testing', 'portal_active' => true, 'password' => Hash::make($password), 'created_at' => now(), 'updated_at' => now()]);
        $this->line('Email: '.$email);
        $this->line('Password: '.$password);
        $this->info('Local test client created. No existing accounts or project records were changed.');
        return self::SUCCESS;
    }
}
