<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Services\TokenService;

class TransactionControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        /** @var User $user */
        $user = User::factory()->create();
        $this->user = $user;
        $this->token = TokenService::issue($this->user);
        $this->category = $this->user->categories()->create([
            'name' => 'Salary',
            'type' => 'income',
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/transactions')
            ->assertStatus(401);
    }

    public function test_index_returns_empty_list_initially(): void
    {
        $this->getJson('/api/transactions', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('data', [])
            ->assertJsonPath('total', 0);
    }

    public function test_store_creates_transaction(): void
    {
        $response = $this->postJson('/api/transactions', [
            'category_id' => $this->category->id,
            'description' => 'Monthly salary',
            'amount' => 3000,
            'type' => 'income',
            'transaction_date' => '2025-07-01',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'description', 'amount', 'type', 'category'])
            ->assertJsonPath('description', 'Monthly salary')
            ->assertJsonPath('amount', '3000.00');

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->user->id,
            'description' => 'Monthly salary',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->postJson('/api/transactions', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_id', 'description', 'amount', 'type', 'transaction_date']);
    }

    public function test_store_rejects_category_belonging_to_another_user(): void
    {
        $other = User::factory()->create();
        $otherCategory = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);

        $this->postJson('/api/transactions', [
            'category_id' => $otherCategory->id,
            'description' => 'Hack attempt',
            'amount' => 100,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ], $this->authHeader())
            ->assertStatus(403);
    }

    public function test_update_modifies_transaction(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id' => $this->category->id,
            'description' => 'Old description',
            'amount' => 100,
            'type' => 'income',
            'transaction_date' => '2025-07-01',
        ]);

        $this->putJson("/api/transactions/{$tx->id}", [
            'description' => 'New description',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('description', 'New description');
    }

    public function test_destroy_deletes_transaction(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id' => $this->category->id,
            'description' => 'To delete',
            'amount' => 50,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ]);

        $this->deleteJson("/api/transactions/{$tx->id}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('transactions', ['id' => $tx->id]);
    }

    public function test_cannot_access_another_users_transaction(): void
    {
        $other = User::factory()->create();
        $otherCategory = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);
        $tx = $other->transactions()->create([
            'category_id' => $otherCategory->id,
            'description' => 'Private',
            'amount' => 99,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ]);

        $this->getJson("/api/transactions/{$tx->id}", $this->authHeader())
            ->assertStatus(404);
    }

    public function test_store_saves_notes(): void
    {
        $response = $this->postJson('/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Bonus payment',
            'amount'           => 500,
            'type'             => 'income',
            'transaction_date' => '2025-07-15',
            'notes'            => 'Q2 performance bonus',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonPath('notes', 'Q2 performance bonus');

        $this->assertDatabaseHas('transactions', [
            'description' => 'Bonus payment',
            'notes'       => 'Q2 performance bonus',
        ]);
    }

    public function test_store_without_notes_stores_null(): void
    {
        $response = $this->postJson('/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'No notes transaction',
            'amount'           => 100,
            'type'             => 'income',
            'transaction_date' => '2025-07-15',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonPath('notes', null);
    }

    public function test_update_can_set_notes(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'Grocery run',
            'amount'           => 45,
            'type'             => 'income',
            'transaction_date' => '2025-07-10',
        ]);

        $this->putJson("/api/transactions/{$tx->id}", [
            'notes' => 'Weekly shop at Lidl',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('notes', 'Weekly shop at Lidl');
    }

    public function test_update_can_clear_notes(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'With notes',
            'amount'           => 20,
            'type'             => 'income',
            'transaction_date' => '2025-07-10',
            'notes'            => 'Some note',
        ]);

        $this->putJson("/api/transactions/{$tx->id}", [
            'notes' => null,
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('notes', null);
    }

    public function test_search_matches_notes(): void
    {
        $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'Regular expense',
            'amount'           => 30,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
            'notes'            => 'reimbursement from John',
        ]);

        $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'Another transaction',
            'amount'           => 50,
            'type'             => 'income',
            'transaction_date' => '2025-07-02',
            'notes'            => null,
        ]);

        $response = $this->getJson('/api/transactions?search=reimbursement', $this->authHeader());

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Regular expense', $data[0]['description']);
    }

    public function test_search_matches_description_and_notes(): void
    {
        $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'electric bill',
            'amount'           => 80,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ]);

        $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'Other',
            'amount'           => 25,
            'type'             => 'income',
            'transaction_date' => '2025-07-02',
            'notes'            => 'paid electric bill with card',
        ]);

        $response = $this->getJson('/api/transactions?search=electric', $this->authHeader());

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_notes_rejects_string_over_1000_characters(): void
    {
        $this->postJson('/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Too long notes',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
            'notes'            => str_repeat('a', 1001),
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }

    public function test_store_uploads_attachment(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('receipt.jpg', 100, 'image/jpeg');

        $response = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Receipt test',
            'amount'           => 50,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $response->assertStatus(201);
        $path = $response->json('attachment_path');
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_store_without_attachment_stores_null(): void
    {
        $response = $this->postJson('/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'No attachment',
            'amount'           => 20,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonPath('attachment_path', null);
    }

    public function test_update_replaces_attachment_and_deletes_old(): void
    {
        Storage::fake('local');

        $oldFile = UploadedFile::fake()->create('old.jpg', 100, 'image/jpeg');
        $storeResponse = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'With attachment',
            'amount'           => 30,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $oldFile], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $txId    = $storeResponse->json('id');
        $oldPath = $storeResponse->json('attachment_path');
        Storage::disk('local')->assertExists($oldPath);

        $newFile = UploadedFile::fake()->create('new.png', 100, 'image/png');
        $this->call('POST', "/api/transactions/{$txId}", [
            'description' => 'Updated',
            '_method'     => 'PUT',
        ], [], ['attachment' => $newFile], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json'])
            ->assertStatus(200);

        Storage::disk('local')->assertMissing($oldPath);
        $newPath = \App\Models\Transaction::find($txId)->attachment_path;
        $this->assertNotNull($newPath);
        Storage::disk('local')->assertExists($newPath);
    }

    public function test_destroy_deletes_attachment_from_storage(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');
        $storeResponse = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'PDF receipt',
            'amount'           => 99,
            'type'             => 'expense',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $txId = $storeResponse->json('id');
        $path = $storeResponse->json('attachment_path');
        Storage::disk('local')->assertExists($path);

        $this->deleteJson("/api/transactions/{$txId}", [], $this->authHeader())
            ->assertStatus(200);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('transactions', ['id' => $txId]);
    }

    public function test_serve_attachment_returns_file(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('receipt.png', 100, 'image/png');
        $storeResponse = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Serve test',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $txId = $storeResponse->json('id');

        $this->getJson("/api/transactions/{$txId}/attachment", $this->authHeader())
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_serve_attachment_blocked_for_other_user(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('private.jpg', 100, 'image/jpeg');
        $storeResponse = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Private',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $txId = $storeResponse->json('id');

        $other      = User::factory()->create();
        $otherToken = TokenService::issue($other);

        $this->getJson("/api/transactions/{$txId}/attachment", [
            'Authorization' => 'Bearer ' . $otherToken,
        ])->assertStatus(404);
    }

    public function test_delete_attachment_endpoint_removes_file(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('to-delete.jpg', 100, 'image/jpeg');
        $storeResponse = $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Delete attachment',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json']);

        $txId = $storeResponse->json('id');
        $path = $storeResponse->json('attachment_path');

        $this->deleteJson("/api/transactions/{$txId}/attachment", [], $this->authHeader())
            ->assertStatus(200);

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'attachment_path' => null]);
    }

    public function test_attachment_rejects_invalid_mime(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('script.exe', 10, 'application/octet-stream');

        $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Bad file',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attachment']);
    }

    public function test_attachment_rejects_oversized_file(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('big.jpg', 6000, 'image/jpeg');

        $this->call('POST', '/api/transactions', [
            'category_id'      => $this->category->id,
            'description'      => 'Big file',
            'amount'           => 10,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ], [], ['attachment' => $file], ['HTTP_Authorization' => 'Bearer ' . $this->token, 'HTTP_ACCEPT' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attachment']);
    }

    // ── Filter tests ────────────────────────────────────────────────────────

    private function makeTransaction(array $overrides = []): void
    {
        $this->user->transactions()->create(array_merge([
            'category_id'      => $this->category->id,
            'description'      => 'Test',
            'amount'           => 100,
            'type'             => 'expense',
            'transaction_date' => '2025-07-01',
        ], $overrides));
    }

    public function test_filter_by_amount_min(): void
    {
        $this->makeTransaction(['amount' => 50]);
        $this->makeTransaction(['amount' => 150]);
        $this->makeTransaction(['amount' => 200]);

        $response = $this->getJson('/api/transactions?amount_min=100', $this->authHeader())
            ->assertStatus(200);

        $amounts = collect($response->json('data'))->pluck('amount')->map(fn ($a) => (float) $a);
        $this->assertTrue($amounts->every(fn ($a) => $a >= 100));
        $this->assertCount(2, $amounts);
    }

    public function test_filter_by_amount_max(): void
    {
        $this->makeTransaction(['amount' => 50]);
        $this->makeTransaction(['amount' => 150]);
        $this->makeTransaction(['amount' => 200]);

        $response = $this->getJson('/api/transactions?amount_max=100', $this->authHeader())
            ->assertStatus(200);

        $amounts = collect($response->json('data'))->pluck('amount')->map(fn ($a) => (float) $a);
        $this->assertTrue($amounts->every(fn ($a) => $a <= 100));
        $this->assertCount(1, $amounts);
    }

    public function test_filter_by_amount_range(): void
    {
        $this->makeTransaction(['amount' => 30]);
        $this->makeTransaction(['amount' => 75]);
        $this->makeTransaction(['amount' => 150]);

        $response = $this->getJson('/api/transactions?amount_min=50&amount_max=100', $this->authHeader())
            ->assertStatus(200);

        $amounts = collect($response->json('data'))->pluck('amount')->map(fn ($a) => (float) $a);
        $this->assertCount(1, $amounts);
        $this->assertEquals(75.0, $amounts->first());
    }

    public function test_filter_by_notes_search(): void
    {
        $this->makeTransaction(['notes' => 'quarterly bonus payment']);
        $this->makeTransaction(['notes' => 'regular grocery run']);
        $this->makeTransaction(['notes' => null]);

        $response = $this->getJson('/api/transactions?notes_search=bonus', $this->authHeader())
            ->assertStatus(200);

        $this->assertCount(1, $response->json('data'));
        $this->assertStringContainsString('bonus', $response->json('data')[0]['notes']);
    }

    public function test_search_does_not_match_notes_when_only_description_differs(): void
    {
        $this->makeTransaction(['description' => 'Groceries', 'notes' => null]);
        $this->makeTransaction(['description' => 'Bonus salary', 'notes' => null]);

        $response = $this->getJson('/api/transactions?search=bonus', $this->authHeader())
            ->assertStatus(200);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Bonus salary', $response->json('data')[0]['description']);
    }

    public function test_combined_filters_work_together(): void
    {
        $this->makeTransaction(['description' => 'Coffee', 'amount' => 5,   'type' => 'expense', 'transaction_date' => '2025-07-01']);
        $this->makeTransaction(['description' => 'Salary', 'amount' => 3000,'type' => 'income',  'transaction_date' => '2025-07-01']);
        $this->makeTransaction(['description' => 'Lunch',  'amount' => 15,  'type' => 'expense', 'transaction_date' => '2025-07-15']);

        $response = $this->getJson(
            '/api/transactions?type=expense&amount_min=10&date_from=2025-07-01&date_to=2025-07-15',
            $this->authHeader()
        )->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Lunch', $data[0]['description']);
    }

    public function test_filter_by_tag(): void
    {
        $tag = $this->user->tags()->create(['name' => 'Work', 'color' => '#ff0000']);

        $t1 = $this->user->transactions()->create([
            'category_id'      => $this->category->id,
            'description'      => 'Tagged',
            'amount'           => 100,
            'type'             => 'income',
            'transaction_date' => '2025-07-01',
        ]);
        $t1->tags()->attach($tag->id);

        $this->makeTransaction(['description' => 'Untagged']);

        $response = $this->getJson("/api/transactions?tag_ids={$tag->id}", $this->authHeader())
            ->assertStatus(200);

        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Tagged', $response->json('data')[0]['description']);
    }

    public function test_index_paginates_transactions(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            $this->user->transactions()->create([
                'category_id'      => $this->category->id,
                'description'      => "Tx $i",
                'amount'           => 10,
                'type'             => 'expense',
                'transaction_date' => '2025-07-01',
            ]);
        }

        $this->getJson('/api/transactions', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('per_page', 20)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('total', 25)
            ->assertJsonPath('last_page', 2)
            ->assertJsonPath('to', 20);

        $page2 = $this->getJson('/api/transactions?page=2&per_page=10', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 25);
        $this->assertCount(10, $page2->json('data'));
    }
}
