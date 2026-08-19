from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from apps.whiteboard.models import Room, CanvasState
from apps.whiteboard.middleware import get_and_validate_room

from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from apps.whiteboard.models import CanvasState
from apps.whiteboard.middleware import get_and_validate_room


class WhiteboardConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.room_id = str(self.scope["url_route"]["kwargs"]["room_id"])
        self.room_group = f"whiteboard_{self.room_id}"

        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        passcode = params.get("passcode", [None])[0]

        auth_result = await get_and_validate_room(self.room_id, passcode)

        if not auth_result.get("allowed", False):
            rejection_codes = {
                "ROOM_NOT_FOUND": 4404,
                "ROOM_LOCKED": 4403,
                "INVALID_PASSCODE": 4401,
            }
            code = rejection_codes.get(auth_result.get("reason"), 4403)
            await self.close(code=code)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        user = self.scope.get("user")
        username = getattr(user, "username", getattr(user, "name", f"Guest_{self.channel_name[-6:]}")) if (user and user.is_authenticated) else f"Guest_{self.channel_name[-6:]}"
        
        self.client_identity = {
            "channel": self.channel_name,
            "username": username,
            "user_id": str(user.id) if user and user.is_authenticated else None,
        }
        
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "room_event",
                "sender_channel": self.channel_name,
                "payload": {
                    "type": "user_joined",
                    "user": self.client_identity,
                },
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group"):
            await self.channel_layer.group_send(
                self.room_group,
                {
                    "type": "room_event",
                    "sender_channel": self.channel_name,
                    "payload": {
                        "type": "user_left",
                        "user": getattr(self, "client_identity", {}),
                    },
                },
            )
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive_json(self, content):
        event_type = content.get("type")

        if event_type == "save_canvas":
            await self._persist_canvas_snapshot(content.get("nodes", []), content.get("edges", []))
            return

        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "relay_message",
                "sender_channel": self.channel_name,
                "payload": content,
            },
        )

    async def relay_message(self, event):
        if self.channel_name != event.get("sender_channel"):
            await self.send_json(event["payload"])

    async def room_event(self, event):
        if self.channel_name != event.get("sender_channel"):
            await self.send_json(event["payload"])

    async def generation_completed(self, event):
        await self.send_json(event)

    @database_sync_to_async
    def _persist_canvas_snapshot(self, nodes, edges):
        CanvasState.objects.update_or_create(
            room_id=self.room_id,
            defaults={"nodes": nodes, "edges": edges},
        )