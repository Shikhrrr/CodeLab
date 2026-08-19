import networkx
from apps.orchestrator.schemas import OrchestratorState 

def validate_topology(state: OrchestratorState) -> dict: 
    
    payload = state['payload']
    nodes = payload.nodes 
    edges = payload.edges 
    errors = [] 

    if not nodes: 
        return {
            "validation_passed": False,
            "validation_errors": ["Nodes are missing"],
            "status": "FAILED_EMPTY_GRAPH"
        }

    graph = networkx.DiGraph() 

    node_map = {n.id: n for n in nodes}

    for n in nodes:
        graph.add_node(n.id, **n.data.model_dump())

    for e in edges: 
        graph.add_edge(e.source, e.target, **e.data.model_dump() if e.data else {}) 

    # check isolated nodes
    for node in graph.nodes:
        if graph.degree(node) == 0 and len(nodes) > 1:
            label = node_map[node].data.label
            errors.append(f"ISOLATED NODE - {label}")

    # check dangling resources
    for node, data in graph.nodes(data=True):
        role = data.get('role')
        
        if role in ["database", "cache", "queue"]:
            if graph.degree(node) == 0:
                label = data.get("label", node)
                errors.append(f"DANGLING RESOURCE - {label}, {node} - NO SERVICE CONNECTED")

    is_pass = len(errors) == 0

    return {
        "validation_passed": is_pass,
        "validation_errors": errors,
        "status": "PASSED" if is_pass else "FAILED"
    }