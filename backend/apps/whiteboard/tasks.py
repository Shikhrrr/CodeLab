from celery import shared_task
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import redis 
from django.conf import settings

from apps.whiteboard.models import GenerationJob, ProjectFile
from apps.orchestrator.schemas import ArchitectureGraphPayload, CanvasNode, CanvasEdge
from apps.orchestrator.graph import app_graph

redis_client = redis.from_url(getattr(settings, "REDIS_URL"))

@shared_task(bind=True)
def run_architecture_generation_task(self, job_id: str):
    job = GenerationJob.objects.select_related("room").get(id=job_id)
    room = job.room
    lock_name = f"gen_lock:{str(room.id)}"

    job.status = "PROCESSING"
    job.save(update_fields=["status"])

    try:
        raw_nodes = (room.canvas_state.nodes if hasattr(room, "canvas_state") and room.canvas_state else []) or []
        raw_edges = (room.canvas_state.edges if hasattr(room, "canvas_state") and room.canvas_state else []) or []

        payload = ArchitectureGraphPayload(
            room_id=str(room.id),
            user_prompt=job.user_prompt or "Generate full starter project",
            nodes=[CanvasNode(**n) for n in raw_nodes],
            edges=[CanvasEdge(**e) for e in raw_edges],
        )

        initial_state = {
            "room_id": str(room.id),
            "payload": payload,
            "user_prompt": job.user_prompt,
            "active_file_path": job.active_file_path,
            "validation_passed": False,
            "validation_errors": [],
            "scaffolding_plan": None,
            "generated_files": [],
            "assistant_response": None,
            "status": "STARTED",
        }

        # PostgreSQL checkpointer thread memory
        config = {"configurable": {"thread_id": str(room.id)}}
        final_state = app_graph.invoke(initial_state, config=config)

        if not final_state.get("validation_passed", False) and final_state.get("validation_errors"):
            job.status = "FAILED"
            job.error_message = "; ".join(final_state.get("validation_errors", []))
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "error_message", "completed_at"])
            return {"status": "FAILED"}

        # Upsert files into PostgreSQL
        for f in final_state.get("generated_files", []):
            path = f.path if hasattr(f, "path") else f["path"]
            content = f.content if hasattr(f, "content") else f["content"]
            desc = f.description if hasattr(f, "description") else f.get("description", "")

            ProjectFile.objects.update_or_create(
                room=room,
                path=path.strip().lstrip("/\\"),
                defaults={"content": content, "description": desc or ""},
            )

        job.status = "COMPLETED"
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])

        # Notify room via WebSocket
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"whiteboard_{str(room.id)}",
                {
                    "type": "generation_completed",
                    "job_id": str(job.id),
                    "status": "COMPLETED",
                    "assistant_response": final_state.get("assistant_response", ""),
                },
            )

        return {"status": "COMPLETED"}

    except Exception as exc:
        job.status = "FAILED"
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at"])
        raise exc

    finally:
        # Guarantee lock release
        redis_client.delete(lock_name)