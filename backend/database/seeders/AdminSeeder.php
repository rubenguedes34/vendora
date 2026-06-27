<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@vendora.com'],
            [
                'name' => 'Admin',
                'email' => 'admin@vendora.com',
                'password' => Hash::make('Guedes13'),
            ]
        );
    }
}
