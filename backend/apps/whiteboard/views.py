from networkx.algorithms.isomorphism import tree_isomorphism
from apps.orchestrator.graph import app_graph
import io
import json
import zipfile
import redis 
import redis_lock
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import make_password, check_password
from django_ratelimit.decorators import ratelimit
from django.utils import timezone
from django.conf import settings 

# pyrefly: ignore [missing-import]
from apps.whiteboard.models import Room, CanvasState, ProjectFile, GenerationJob
# pyrefly: ignore [missing-import]
from apps.whiteboard.tasks import run_architecture_generation_task

MAX_SIZE = 5 * 1024 * 1024      # 5 MB

redis_client = redis.from_url(getattr(settings, "REDIS_URL"))


@csrf_exempt
def verify_room(request, room_id: str):
    room = get_object_or_404(Room, id=room_id.strip().upper())

    if not room:
        return JsonResponse({"exists": False, "access": False})

    if not room.passcode:
        return JsonResponse({"exists": True, "access": True})

    provided = request.headers.get("X-Room-Passcode")
    has_access = bool(provided and check_password(provided, room.passcode))

    return JsonResponse(
        {"exists": True, "access": has_access}, status=200 if has_access else 403
    )

def verify_room_access(request, room: Room) -> bool:
    if not room.passcode:
        return True
    provided_passcode = request.headers.get("X-Room-Passcode")
    return bool(provided_passcode and check_password(provided_passcode, room.passcode))
    

@csrf_exempt
@require_http_methods(["POST"])
@ratelimit(key='ip', rate='10/m', block=True)
def create_room(request):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded."}, status=429)

    if len(request.body) > MAX_SIZE:
        return JsonResponse({"error": "Payload exceeds maximum allowed size."}, status=413)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")  
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)

    name = str(data.get("name", "Untitled Workspace")).strip()[:255]
    raw_passcode = data.get("passcode")
    passcode = make_password(raw_passcode) if raw_passcode else None

    room = Room.objects.create(name=name, passcode=passcode)
    CanvasState.objects.create(room=room, nodes=[], edges=[]) 

    return JsonResponse({
        "room_id": str(room.id),
        "name": room.name,
        "is_locked": room.is_locked,
        "is_protected": bool(room.passcode),
    }, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def get_or_update_canvas(request, room_id):
    if hasattr(request, "limited"):
        return JsonResponse({"error": "Rate limit exceeded."}, status=429)
    
    room = get_object_or_404(Room, id=room_id)

    #fix
    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized: Invalid or missing room passcode."}, status=401)
        
    canvas, _ = CanvasState.objects.get_or_create(room=room)

    if request.method == "GET":
        return JsonResponse({
            "room_id": room_id,
            "nodes": canvas.nodes, 
            "edges": canvas.edges,
            "updated_at": canvas.updated_at.isoformat(),
        })

    if len(request.body) > MAX_SIZE:
        return JsonResponse({"error": "Payload exceeds maximum allowed size."}, status=413)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")  
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    
    canvas.nodes = data.get("nodes", canvas.nodes)
    canvas.edges = data.get("edges", canvas.edges)
    canvas.updated_at = timezone.now()
    canvas.save(updated_fields=["nodes", "edges", "updated_at"])  

    return JsonResponse({"status": "SUCCESS", "message": "Canvas state saved."})

@csrf_exempt
@require_http_methods(["POST"])
@ratelimit(key="ip", rate="10/m", block=False)
def trigger_generation(request, room_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded"}, status=429)

    room = get_object_or_404(Room, id=room_id)
    lock_name = f"gen_lock:{str(room.id)}"
    lock = redis_client.lock(lock_name, timeout=180, blocking=False)

    if not lock.acquire():
        return JsonResponse(
            {"error": "Generation is already in progress for this room.", "code": "BUSY"},
            status=409,
        )
    
    #fix 
    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized: Invalid or missing room passcode."},
        status=401)

    if len(request.body) > MAX_SIZE:
        return JsonResponse({"error": "Payload exceeds maximum allowed size."}, status=413)
    
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
        job = GenerationJob.objects.create(
            room=room,
            user_prompt=data.get("prompt", "Generate full starter project"),
            mode=data.get("mode", "SCAFFOLD"),
            active_file_path=data.get("active_file_path"),
            status="PENDING",
        )

        run_architecture_generation_task.delay(str(job.id))
        return JsonResponse({"job_id": str(job.id), "status": "QUEUED"}, status=202)

    except Exception as e:
            if lock.owned():
                lock.release()
            return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["GET"])
@ratelimit(key="ip", rate="60/m", block=False)
def get_job_status(request, job_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded"}, status=429)

    job = get_object_or_404(GenerationJob, id=job_id)

    return JsonResponse({
        "job_id": str(job.id),
        "status": job.status,
        "error_message": job.error_message,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    })

@require_http_methods(["GET"])
@ratelimit(key="ip", rate="60/m", block=False)
def list_project_files(request, room_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded"}, status=429)

    room = get_object_or_404(Room, id=room_id)
    
    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized: Invalid or missing room passcode."},status=401)

    files = room.files.all()

    return JsonResponse({
        'room_id': str(room_id),
        'files': [
            {
                "id": str(f.id),
                "path": f.path,
                "content": f.content,
                "description": f.description,
                "updated_at": f.updated_at.isoformat()
            }
            for f in files
        ] 
    })

@require_http_methods(["GET"])
@ratelimit(key="ip", rate="10/m", block=False)
def download_zip(request, room_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded."}, status=429)

    room = get_object_or_404(Room, id=room_id)

    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized: Invalid or missing room passcode."}, status=401)

    files = room.files.all()
    if not files.exists():
        return JsonResponse({"error": "No generated files found for this workspace."}, status=404)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for f in files:
            clean_path = f.path.lstrip("/\\")
            zip_file.writestr(clean_path, f.content)

    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{room.name.replace(" ", "_")}_scaffolding.zip"'
    return response

@require_http_methods(['GET'])
@ratelimit(key="ip", rate="60/m", block=False)
def get_chat_history(request, room_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded"}, status=429)
        
    room = get_object_or_404(Room, id=room_id)

    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    config = {'configurable': {'thread_id': str(room_id)}}
    state = app_graph.get_state(config=config)

    messages = []
    if state and state.values:
        raw_msgs = state.values.get("messages", [])
        for m in raw_msgs:
            messages.append({
                "role": "user" if m.type == "human" else "assistant",
                "content": m.content,
            })

    return JsonResponse({"history": messages})

@csrf_exempt
@require_http_methods(["GET", "PUT"])
@ratelimit(key="ip", rate="60/m", block=False)
def get_or_update_file(request, room_id, file_id):
    if getattr(request, "limited", False):
        return JsonResponse({"error": "Rate limit exceeded."}, status=429)

    room = get_object_or_404(Room, id=room_id)
    if not verify_room_access(request, room):
        return JsonResponse({"error": "Unauthorized: Invalid or missing room passcode."}, status=401)

    project_file = get_object_or_404(room.files, id=file_id)

    if request.method == "GET":
        return JsonResponse({
            "id": str(project_file.id),
            "path": project_file.path,
            "content": project_file.content,
            "description": project_file.description,
            "updated_at": project_file.updated_at.isoformat(),
        })

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
        project_file.content = data.get("content", project_file.content)
        project_file.save(update_fields=["content", "updated_at"])
        return JsonResponse({"status": "SUCCESS", "message": "File updated successfully."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)