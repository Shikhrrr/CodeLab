from typing import Optional
import operator
from typing import TypedDict, Dict, Literal, Annotated, List 
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field 

# FRONTEND TO LLM -----------------

class CanvasNodeData(BaseModel):
    label: str 
    technology: str 
    role: Literal["frontend", "gateway", "backend", "database", "cache", "queue", "worker"]
    port: Optional[int] = None 
    env_vars: Optional[Dict[str, str]] = Field(default_factory=dict)
    database_name: Optional[str] = None

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