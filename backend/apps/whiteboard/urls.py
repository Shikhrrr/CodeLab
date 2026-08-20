# pyrefly: ignore [missing-import]
from django.urls import path
from apps.whiteboard import views

urlpatterns = [
    path('rooms/', views.create_room, name='create_room'),
    path("rooms/verify/<str:room_id>/", views.verify_room, name="verify_room"),
    path('rooms/<str:room_id>/canvas/', views.get_or_update_canvas, name='get_or_update_canvas'),
    path('rooms/<str:room_id>/generate/', views.trigger_generation, name='trigger_generation'),
    path("rooms/<str:room_id>/jobs/<uuid:job_id>/", views.get_job_status, name="job_status"),
    path("rooms/<str:room_id>/files/", views.list_project_files, name="list_files"),
    path("rooms/<str:room_id>/files/<uuid:file_id>/", views.get_or_update_file, name="get_or_update_file"),
    path("rooms/<str:room_id>/download/", views.download_zip, name="download_zip"),
    path("rooms/<str:room_id>/chat/", views.get_chat_history, name="get_chat_history"),
]