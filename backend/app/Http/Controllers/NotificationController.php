<?php

namespace App\Http\Controllers;

use App\Services\NotificationGenerator;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private NotificationGenerator $generator) {}

    public function index(Request $request)
    {
        $this->generator->generateFor($request->user());

        $unreadOnly = $request->boolean('unread_only', false);
        $query = $request->user()->notifications()->orderByDesc('created_at');
        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        return response()->json($query->get());
    }

    public function unreadCount(Request $request)
    {
        $count = $request->user()->notifications()->where('is_read', false)->count();
        return response()->json(['count' => $count]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json($notification);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->notifications()->where('is_read', false)->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function destroy(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->delete();
        return response()->json(['message' => 'Notification deleted']);
    }
}
