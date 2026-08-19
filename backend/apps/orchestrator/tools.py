from langchain_core.tools import tool
from apps.whiteboard.models import ProjectFile


def create_workspace_tools(room_id: str):
    """Factory creating file management tools scoped to a specific room."""

    @tool
    def list_files() -> str:
        """List all current file paths in the workspace."""
        files = ProjectFile.objects.filter(room_id=room_id).values_list("path", flat=True)
        if not files:
            return "No files currently exist in the workspace."
        return "\n".join(files)

    @tool
    def read_file(path: str) -> str:
        """Read the full content of a specific file by its path."""
        try:
            file_obj = ProjectFile.objects.get(room_id=room_id, path=path.strip())
            return file_obj.content
        except ProjectFile.DoesNotExist:
            return f"Error: File '{path}' does not exist."

    @tool
    def write_file(path: str, content: str, description: str = "") -> str:
        """Create a new file or completely overwrite an existing file with updated content."""
        clean_path = path.strip().lstrip("/\\")
        file_obj, created = ProjectFile.objects.update_or_create(
            room_id=room_id,
            path=clean_path,
            defaults={"content": content, "description": description},
        )
        action = "Created" if created else "Updated"
        return f"Successfully {action.lower()} '{clean_path}'."

    @tool
    def delete_file(path: str) -> str:
        """Delete an existing file by its path."""
        clean_path = path.strip().lstrip("/\\")
        deleted_count, _ = ProjectFile.objects.filter(room_id=room_id, path=clean_path).delete()
        if deleted_count > 0:
            return f"Successfully deleted '{clean_path}'."
        return f"Warning: File '{clean_path}' was not found."

    return [list_files, read_file, write_file, delete_file]