from langgraph.graph import StateGraph, END
from apps.orchestrator.schemas import OrchestratorState
from apps.orchestrator.nodes.validator import validate_topology
from apps.orchestrator.nodes.planner import plan_scaffolding
from apps.orchestrator.nodes.generator import generate_codebase
from apps.orchestrator.nodes.editor import editor_node
from apps.orchestrator.nodes.intent_router import intent_router
from apps.orchestrator.nodes.explainer import explainer_agent
from apps.orchestrator.checkpointer import get_checkpointer, init_checkpointer


def route_after_intent(state: OrchestratorState) -> str:
    detected = state.get("mode", "EXPLAIN").upper()
    if detected == "EDIT":
        return "editor_agent"
    elif detected == "SCAFFOLD":
        return "validator"
    elif detected == "BAD":
        return END
    return "explainer_agent"

def should_continue_validation(state: OrchestratorState):
    if state['status'] == "PASSED":
        return 'planner'
    else:
        return END

def compile_workflow():
    init_checkpointer()
    workflow = StateGraph(OrchestratorState)

    workflow.add_node("intent_router", intent_router)
    workflow.add_node("explainer_agent", explainer_agent)
    workflow.add_node("editor_agent", editor_node)
    workflow.add_node("validator", validate_topology)
    workflow.add_node("planner", plan_scaffolding)
    workflow.add_node("generator", generate_codebase)

    workflow.set_entry_point("intent_router")
    workflow.add_conditional_edges("intent_router", route_after_intent)
    workflow.add_conditional_edges("validator", should_continue_validation)

    workflow.add_edge("planner", "generator")
    workflow.add_edge("generator", END)
    workflow.add_edge("editor_agent", END)
    workflow.add_edge("explainer_agent", END)

    return workflow.compile(checkpointer=get_checkpointer())


app_graph = compile_workflow()