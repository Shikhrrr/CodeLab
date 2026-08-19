# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate
# pyrefly: ignore [missing-import]
from langchain_core.messages import SystemMessage, HumanMessage
from apps.orchestrator.llm import get_llm
from apps.orchestrator.schemas import ScaffoldingPlan, OrchestratorState
import json

SYSTEM_PLANNER_PROMPT = """You are a Principal Cloud and Software Architect.
Your task is to convert a visual system topology into a clean, modern scaffolding blueprint.
Given the nodes, communication protocols, and user prompt:
1. Propose a sanitized project name.
2. Provide a short technical summary of the system.
3. List the individual services to generate.
4. Output a comprehensive file_manifest (e.g., docker-compose.yml, .env.example, service directories, Dockerfiles, entrypoints, and requirements files)."""


def plan_scaffolding(state: OrchestratorState) -> dict:
    llm = get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(ScaffoldingPlan) 

    nodes_payload = json.dumps([n.model_dump() for n in state['payload'].nodes], indent=2)
    edges_payload = json.dumps([e.model_dump() for e in state['payload'].edges], indent=2)

    user_content = (
        f"User Requirements: {state['payload'].user_prompt}\n\n"
        f"Architecture Topology:\n"
        f"Nodes:\n{nodes_payload}\n\n"
        f"Edges:\n{edges_payload}"
    )

    messages = [
        SystemMessage(content=SYSTEM_PLANNER_PROMPT),
        HumanMessage(content=user_content)

    ]

    plan: ScaffoldingPlan = structured_llm.invoke(messages)

    return {
        "scaffolding_plan": plan,
        "status": "SCAFFOLDING COMPLETED"
    }