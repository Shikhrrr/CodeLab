from typing import Optional
import operator
from typing import TypedDict, Dict, Literal, Annotated, List, Sequence, Any
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field 
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

# FRONTEND TO LLM -----------------

class CanvasNodeData(BaseModel):
    label: str 
    technology: str 
    role: Literal["frontend", "gateway", "backend", "database", "cache", "queue", "worker"]
    port: Optional[int] = None 
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict)
    database_name: Optional[str] = None
    description: Optional[str] = None  

class CanvasNode(BaseModel):
    id: str 
    type: str 
    data: CanvasNodeData

class CanvasEdge(BaseModel):
    id: str
    source: str 
    target: str 
    # str = node id

    data: Optional[CanvasEdgeData] = None

class CanvasEdgeData(BaseModel):
    protocol: Literal["HTTP/REST", "gRPC", "WebSocket", "Pub/Sub", "TCP"] = "HTTP/REST"
    topic: Optional[str] = None
    description: Optional[str] = None

class ArchitectureGraphPayload(BaseModel):
    room_id: str 
    user_prompt: str
    nodes: List[CanvasNode]
    edges: List[CanvasEdge]



# LLM OUTPUT -------------------------

class GeneratedFile(BaseModel):
    path: str
    content: str 
    description: Optional[str] = "No Description"

class GeneratedFilesBatch(BaseModel):
    files: List[GeneratedFile]

class ScaffoldingPlan(BaseModel):
    project_name: str 
    summary: str 
    services: List[str]
    file_manifest: List[str] # exact file paths 

class IntentDecision(BaseModel):
    mode: Literal["SCAFFOLD", "EDIT", "EXPLAIN", "BAD"] = Field(
        description=(
            "'SCAFFOLD' to generate the initial project from canvas topology, "
            "'EDIT' to create, edit, patch, fix, or modify one or multiple files, "
            "'EXPLAIN' to answer questions, explain code, or give advice without modifying code, "
            "'BAD' for off-topic queries completely unrelated to programming or software engineering."
        )
    )

class FilePatch(BaseModel):
    path: str = Field(
        description="Full path of the file to create, modify, or delete."
    )
    action: Literal["CREATE", "MODIFY", "DELETE"] = Field(
        description="Action to perform on the target file."
    )
    content: str = Field(
        default="",
        description="The complete new or updated file content. Empty if action is DELETE.",
    )
    reason: str = Field(
        description="Short reason why this specific file is being changed."
    )

class MultiFileEditResult(BaseModel):
    files: List[FilePatch] = Field(
        description="List of all files that need to be created, modified, or deleted to fulfill the user's request."
    )
    explanation: str = Field(
        description="Direct conversational message to the user explaining what changes were made across the files and answering their prompt."
    )


# State

class OrchestratorState(TypedDict):
    room_id: str
    mode: Optional[str]
    user_prompt: Optional[str]
    assistant_response: Optional[str]
    active_file_path: Optional[str]
    payload: Optional[ArchitectureGraphPayload]
    validation_passed: bool 
    validation_errors: List[str] 
    scaffolding_plan: Optional[ScaffoldingPlan]
    generated_files: List[GeneratedFile]
    status: Optional[str] 
    error: Optional[str]
    messages: Annotated[Sequence[BaseMessage], add_messages]

    nodes: Optional[List[Any]]
    edges: Optional[List[Any]]