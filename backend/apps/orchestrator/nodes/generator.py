# pyrefly: ignore [missing-import]
from langchain_core.messages import SystemMessage, HumanMessage 
# pyrefly: ignore [missing-import]
from pydantic import BaseModel 
from typing import List
import json 
from apps.orchestrator.schemas import OrchestratorState, GeneratedFile, GeneratedFilesBatch 
from apps.orchestrator.llm import get_llm 

SYSTEM_GENERATOR_PROMPT = """You are an elite DevOps and Fullstack Engineer.
Generate production-ready, clean, functional boilerplate code for the planned system architecture.
Rules:
- For every planned file in the manifest, generate its exact relative path, raw code content, and a brief description.
- Ensure docker-compose.yml correctly configures ports, networks, and environment variables matching the topology.
- Include valid Dockerfiles and basic runnable starter code for backend endpoints.
- Do NOT output markdown code blocks inside the file content string; return raw file text only.
- If the user provides custom instructions in the `description` (e.g., "Use Redux for state", "Include JWT middleware"), you MUST implement those specific requests in the generated code for that technology.
"""

def generate_codebase(state: OrchestratorState) -> dict:
    llm = get_llm(temperature=0.2)
    structured_llm = llm.with_structured_output(GeneratedFilesBatch)

    nodes_payload = json.dumps([n.model_dump() for n in state['payload'].nodes], indent=2)
    edges_payload = json.dumps([e.model_dump() for e in state['payload'].edges], indent=2)
    plan_payload = json.dumps(state['scaffolding_plan'].model_dump(), indent=2)

    user_content = (
        f"Scaffolding Plan:\n{plan_payload}\n\n"
        f"Architecture Topology Specification:\n"
        f"Nodes:\n{nodes_payload}\n\n"
        f"Edges:\n{edges_payload}"
    )

    messages = [
        SystemMessage(content=SYSTEM_GENERATOR_PROMPT),
        HumanMessage(content=user_content)
    ]

    result: GeneratedFilesBatch = structured_llm.invoke(messages) 

    return {
        "generated_files": result.files,
        "status": "FILES GENERATED" 
    }