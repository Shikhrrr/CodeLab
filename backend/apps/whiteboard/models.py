# pyrefly: ignore [missing-import]
from django.db.models import OrderBy
from django.db import models
import uuid 
import secrets
# pyrefly: ignore [missing-import]
from django.contrib.auth.models import User

def generate_code():
    # 8 digit code
    return secrets.token_hex(4)

class Room(models.Model):
    id = models.CharField(
        primary_key=True,
        max_length=8,
        default=generate_code,
        editable=False
    )
    name = models.CharField(max_length=255, default="Untitled Workspace")
    invite_code = models.CharField(max_length=16, unique=True, default=generate_code)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_rooms"
    )
    is_locked = models.BooleanField(default=False)
    passcode = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) 

    def __str__(self):
        return f"{self.name} ({self.id})"


class RoomMember(models.Model):
    ROLE_CHOICES = [
        ("OWNER", "Owner"),
        ("EDITOR", "Editor"),
        ("VIEWER", "Viewer"),
    ]

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="room_memberships")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="EDITOR")
    is_banned = models.BooleanField(default=False)      
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("room", "user")

    def __str__(self):
        return f"{self.user.username} in {self.room.name} ({self.role})"


class CanvasState(models.Model):
    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name="canvas_state")
    nodes = models.JSONField(default=list)
    edges = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Canvas for room {self.room_id}"


class ProjectFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="files")
    path = models.CharField(max_length=500) 
    content = models.TextField(blank=True) 
    description = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) 

    class Meta:
        unique_together = ("room", "path")
        ordering = ["path"]

    def __str__(self):
        return f"FileName: {self.name} (Room: {self.room_id})"



class GenerationJob(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="generation_jobs")
    user_prompt = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default = "PENDING")
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    mode = models.CharField(
        max_length=50,
        default="SCAFFOLD",
        choices=[
            ("SCAFFOLD", "Scaffold"),
            ("EDIT", "Edit"),
            ("EXPLAIN", "Explain"),
        ],
    )
    active_file_path = models.CharField(
        max_length=1024,
        null=True,
        blank=True,
    )
    
    def __str__(self):
        return f"Job {self.id} - {self.status} (Room: {self.room_id})"

