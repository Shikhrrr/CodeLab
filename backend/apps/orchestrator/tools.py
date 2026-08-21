from langchain_core.tools import tool
from apps.whiteboard.models import ProjectFile
from langchain_core.runnables import RunnableConfig

@tool
def list_files(config: RunnableConfig) -> str:
    """List all current file paths in the workspace repository."""
    room_id = config.get("configurable", {}).get("thread_id")
    files = list(
        ProjectFile.objects.filter(room_id=room_id).values_list(
            "path", flat=True
        )
    )
    if not files:
        return "No files currently exist in the workspace."
    return "\n".join(files)

@tool
def read_file(path: str, config: RunnableConfig) -> str:
    """Read the full text content of a specific file by its relative path."""
    room_id = config.get("configurable", {}).get("thread_id")
    clean_path = path.strip().lstrip("/\\")
    try:
        file_obj = ProjectFile.objects.get(room_id=room_id, path=clean_path)
        return file_obj.content
    except ProjectFile.DoesNotExist:
        return f"Error: File '{clean_path}' does not exist."

@tool
def write_file(
    path: str, content: str, description: str = "", config: RunnableConfig = {}
) -> str:
    """Create a new file or completely overwrite an existing file with updated code."""
    room_id = config.get("configurable", {}).get("thread_id")
    clean_path = path.strip().lstrip("/\\")

    file_obj, created = ProjectFile.objects.update_or_create(
        room_id=room_id,
        path=clean_path,
        defaults={"content": content, "description": description},
    )
    action = "Created" if created else "Updated"
    return f"Successfully {action.lower()} '{clean_path}'."

@tool
def delete_file(path: str, config: RunnableConfig) -> str:
    """Delete an existing file from the project by its relative path."""
    room_id = config.get("configurable", {}).get("thread_id")
    clean_path = path.strip().lstrip("/\\")

    deleted_count, _ = ProjectFile.objects.filter(
        room_id=room_id, path=clean_path
    ).delete()
    if deleted_count > 0:
        return f"Successfully deleted '{clean_path}'."
    return f"Warning: File '{clean_path}' was not found."

TOOLS = [list_files, read_file, write_file, delete_file]