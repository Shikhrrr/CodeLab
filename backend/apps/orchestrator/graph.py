# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, START, END
from apps.orchestrator.schemas import OrchestratorState
from apps.orchestrator.nodes.validator import validate_topology
from apps.orchestrator.nodes.planner import plan_scaffolding
from apps.orchestrator.nodes.generator import generate_codebase
from apps.orchestrator.nodes.editor import coding_agent
from apps.orchestrator.checkpointer import get_checkpointer

def route_entry(state: OrchestratorState):
    if state.get('mode') == 'EDIT':
        return 'coding_agent'
    else:
        return 'validator'

def should_continue(state: OrchestratorState):
    if state['status'] == "PASSED":
        return 'planner'
    else:
        return END

def compile_workflow():
    workflow = StateGraph(OrchestratorState)

    workflow.set_conditional_entry_point(route_entry)

    workflow.add_node("coding_agent",coding_agent)
    workflow.add_node("validator",validate_topology)
    workflow.add_node("planner",plan_scaffolding)
    workflow.add_node("generator",generate_codebase)

    workflow.add_conditional_edges("validator",should_continue)

    workflow.add_edge('planner', 'generator')
    workflow.add_edge('generator', END)
    workflow.add_edge('coding_agent', END) 

    checkpointer = get_checkpointer()

    return workflow.compile(checkpointer=checkpointer)


app_graph = compile_workflow()