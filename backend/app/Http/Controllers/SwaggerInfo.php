<?php

namespace App\Http\Controllers;

use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *     title="Vendora API",
 *     version="1.0.0",
 *     description="Vendora personal finance API. Use Bearer token authentication on protected endpoints.",
 *     @OA\Contact(email="admin@vendora.com")
 * )
 *
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Local development server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer"
 * )
 *
 * @OA\Tag(name="Admin", description="Admin panel endpoints")
 * @OA\Tag(name="Auth", description="Authentication endpoints")
 * @OA\Tag(name="Budgets", description="Budget management")
 * @OA\Tag(name="Categories", description="Category management")
 * @OA\Tag(name="Financial Records", description="Monthly financial records")
 * @OA\Tag(name="Investments", description="Investment management")
 * @OA\Tag(name="Market Data", description="Stock and crypto market data")
 * @OA\Tag(name="Notifications", description="User notifications")
 * @OA\Tag(name="Recurrent Transactions", description="Monthly recurrent transactions")
 * @OA\Tag(name="Setup", description="Initial user setup")
 * @OA\Tag(name="Tags", description="Transaction tags")
 * @OA\Tag(name="Transactions", description="Transaction management")
 * @OA\Tag(name="Watchlist", description="Market watchlist")
 */
class SwaggerInfo {}
