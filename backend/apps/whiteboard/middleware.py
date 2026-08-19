from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.hashers import check_password
from apps.whiteboard.models import Room

@database_sync_to_async
def get_and_validate_room(room_id: str, passcode: str | None):
    try:
        room = Room.objects.get(id=room_id)
    except (Room.DoesNotExist, ValueError):
        return {"allowed": False, "reason": "ROOM_NOT_FOUND"}

    if room.is_locked:
        return {"allowed": False, "reason": "ROOM_LOCKED"}

    if room.passcode:
        if not passcode or not check_password(passcode, room.passcode):
            return {"allowed": False, "reason": "INVALID_PASSCODE"}

    return {"allowed": True, "room_name": room.name}

class RoomAuthMiddleWare:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            passcode = params.get("passcode", [None])[0]

            scope["passcode"] = passcode

        return await self.inner(scope, receive, send)