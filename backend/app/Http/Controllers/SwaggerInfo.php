<?php

namespace App\Http\Controllers;

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
 * @OA\Tag(name="Auth", description="Authentication endpoints")
 * @OA\Tag(name="Categories", description="Category management")
 * @OA\Tag(name="Transactions", description="Transaction management")
 * @OA\Tag(name="Budgets", description="Budget management")
 * @OA\Tag(name="Financial Records", description="Monthly financial records")
 * @OA\Tag(name="Recurrent Transactions", description="Monthly recurrent transactions")
 * @OA\Tag(name="Investments", description="Investment management")
 */
class SwaggerInfo {}
