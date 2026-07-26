<?php

namespace App\Http\Controllers;

use App\Services\NotificationGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    public function __construct(private NotificationGenerator $generator) {}

    /**
     * @OA\Get(
     *     path="/api/notifications",
     *     tags={"Notifications"},
     *     summary="List user notifications",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="unread_only", in="query", required=false, @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="Array of notifications")
     * )
     */
    public function index(Request $request)
    {
        Cache::remember(
            "notifications:generated:{$request->user()->id}",
            now()->addHour(),
            function () use ($request) {
                $this->generator->generateFor($request->user());
                return true;
            }
        );

        $unreadOnly = $request->boolean('unread_only', false);
        $query = $request->user()->appNotifications()->orderByDesc('created_at');
        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        return response()->json($query->get());
    }

    /**
     * @OA\Get(
     *     path="/api/notifications/unread-count",
     *     tags={"Notifications"},
     *     summary="Get unread notification count",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Unread count")
     * )
     */
    public function unreadCount(Request $request)
    {
        $count = $request->user()->appNotifications()->where('is_read', false)->count();
        return response()->json(['count' => $count]);
    }

    /**
     * @OA\Patch(
     *     path="/api/notifications/{id}/read",
     *     tags={"Notifications"},
     *     summary="Mark a notification as read",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Notification marked as read")
     * )
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->appNotifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json($notification);
    }

    /**
     * @OA\Patch(
     *     path="/api/notifications/read-all",
     *     tags={"Notifications"},
     *     summary="Mark all notifications as read",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="All marked as read")
     * )
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->appNotifications()->where('is_read', false)->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * @OA\Delete(
     *     path="/api/notifications/{id}",
     *     tags={"Notifications"},
     *     summary="Delete a notification",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Notification deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $notification = $request->user()->appNotifications()->findOrFail($id);
        $notification->delete();
        return response()->json(['message' => 'Notification deleted']);
    }
}
