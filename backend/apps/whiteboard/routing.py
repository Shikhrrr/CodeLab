from django.urls import path 
from apps.whiteboard.consumers import WhiteboardConsumer 

websocket_urlpatterns = [
    path("ws/whiteboard/<str:room_id>/", WhiteboardConsumer.as_asgi()),
]

