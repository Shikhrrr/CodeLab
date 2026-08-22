from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from langchain_core.messages import HumanMessage, AIMessage

from apps.whiteboard.models import Room, CanvasState, ProjectFile
from apps.whiteboard.middleware import get_and_validate_room
from apps.orchestrator.graph import app_graph


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
        username = (
            getattr(user, "username", getattr(user, "name", f"Guest_{self.channel_name[-6:]}"))
            if (user and user.is_authenticated)
            else f"Guest_{self.channel_name[-6:]}"
        )
        
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

        if event_type == "chat_message":
            user_text = content.get("content", "").strip()
            sender_name = content.get("sender", self.client_identity.get("username", "Anonymous"))
            
            if not user_text:
                return

            # 1. Relay the user's message to everyone in the room
            await self.channel_layer.group_send(
                self.room_group,
                {
                    "type": "relay_message",
                    "sender_channel": None,  # None ensures the sender also receives confirmation
                    "payload": {
                        "type": "chat_message",
                        "sender": sender_name,
                        "role": "user",
                        "content": user_text,
                    },
                },
            )

            # 2. Execute the LangGraph agent in an off-thread worker
            agent_result = await database_sync_to_async(self._execute_agent)(user_text)

            # 3. If files were modified/created, notify everyone to refresh file explorer
            if agent_result.get("files_changed"):
                await self.channel_layer.group_send(
                    self.room_group,
                    {
                        "type": "relay_message",
                        "sender_channel": None,
                        "payload": {"type": "files_updated"},
                    },
                )

            # 4. Broadcast the AI assistant's response to the room
            if agent_result.get("reply"):
                await self.channel_layer.group_send(
                    self.room_group,
                    {
                        "type": "relay_message",
                        "sender_channel": None,
                        "payload": {
                            "type": "chat_message",
                            "sender": "CodeLab AI",
                            "role": "assistant",
                            "content": agent_result["reply"],
                        },
                    },
                )
            return

        # Default relay for cursor movements, node updates, etc.
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

    def _execute_agent(self, user_prompt: str) -> dict:
        """Synchronously invokes LangGraph using PostgreSQL checkpointer state."""
        config = {"configurable": {"thread_id": str(self.room_id).strip()}}

        # 1. Fetch canvas context
        canvas = CanvasState.objects.filter(room_id=self.room_id).first()
        nodes = canvas.nodes if canvas else []
        edges = canvas.edges if canvas else []

        initial_file_count = ProjectFile.objects.filter(room_id=self.room_id).count()

        try:
            output = app_graph.invoke(
                {
                    "messages": [HumanMessage(content=user_prompt)],
                    "nodes": nodes,
                    "edges": edges,
                },
                config=config,
            )
        except Exception as e:
            return {
                "reply": f"Agent error: {str(e)}",
                "files_changed": False,
            }

        if not output or not isinstance(output, dict):
            return {
                "reply": "No response generated by the agent.",
                "files_changed": False,
            }

        # 2. Robust message extraction
        messages = output.get("messages", [])
        ai_reply = ""

        for m in reversed(messages):
            # Check message role/type
            msg_type = getattr(m, "type", None) or (m.get("type") if isinstance(m, dict) else "")
            is_ai = isinstance(m, AIMessage) or msg_type in ("ai", "assistant")

            if is_ai:
                raw_content = getattr(m, "content", None) if not isinstance(m, dict) else m.get("content")
                
                # Handle list of content blocks or plain string
                if isinstance(raw_content, list):
                    text_parts = [
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in raw_content
                    ]
                    content_str = "".join(text_parts).strip()
                else:
                    content_str = str(raw_content or "").strip()

                if content_str:
                    ai_reply = content_str
                    break

        # Fallback if content was not found under standard AI message types
        if not ai_reply and messages:
            last_msg = messages[-1]
            ai_reply = getattr(last_msg, "content", "") if not isinstance(last_msg, dict) else last_msg.get("content", "")

        final_file_count = ProjectFile.objects.filter(room_id=self.room_id).count()
        files_changed = (output.get("mode") == "EDIT") or (initial_file_count != final_file_count)

        return {
            "reply": str(ai_reply).strip() or "No response generated by the agent.",
            "files_changed": files_changed,
        }