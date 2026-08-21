from langchain_core.runnables import RunnableConfig
from apps.orchestrator.llm import get_llm 
from apps.orchestrator.schemas import OrchestratorState
from apps.whiteboard.models import ProjectFile
from langchain_core.messages import SystemMessage, HumanMessage

def explainer_agent(state: OrchestratorState, config: RunnableConfig = None) -> dict:
    """Answers architecture questions and explains system trade-offs."""
    llm = get_llm()

    messages = state.get("messages", [])
    nodes = state.get("nodes", [])
    edges = state.get("edges", [])

    room_id = (config or {}).get("configurable", {}).get("thread_id")
    file_list = []
    if room_id:
        file_list = list(
            ProjectFile.objects.filter(room_id=room_id).values_list("path", flat=True)
        )

    nodes_summary = [
        f"- {n.get('data', {}).get('label', n.get('id', 'Unnamed'))} (Type: {n.get('type', 'Service')})"
        if isinstance(n, dict)
        else f"- {getattr(n, 'id', 'Node')}"
        for n in nodes
    ]

    edges_summary = [
        f"- {e.get('source')} -> {e.get('target')}"
        if isinstance(e, dict)
        else f"- {getattr(e, 'source', '')} -> {getattr(e, 'target', '')}"
        for e in edges
    ]

    system_prompt = (
        "You are CodeLab's Senior System Architect & Technical Advisor.\n"
        "Your task is to answer user queries, explain system architectures, discuss trade-offs, "
        "and help developers understand their generated codebases.\n\n"
        f"--- ACTIVE CANVAS ARCHITECTURE ---\n"
        f"Components:\n{chr(10).join(nodes_summary) if nodes_summary else 'No components placed.'}\n\n"
        f"Connections:\n{chr(10).join(edges_summary) if edges_summary else 'No connections defined.'}\n\n"
        f"--- CURRENT REPOSITORY FILES ---\n"
        f"{chr(10).join(f'- {f}' for f in file_list) if file_list else 'No files generated yet.'}\n\n"
        "Guidelines:\n"
        "- Be direct, concise, and technically precise.\n"
        "- Format technical terms and code snippets using standard Markdown."
    )

    sanitized_messages = [
        m for m in messages 
        if getattr(m, "content", None) and str(m.content).strip()
    ]

    if not sanitized_messages:
        sanitized_messages = [HumanMessage(content="Explain the current project architecture.")]

    full_conversation = [SystemMessage(content=system_prompt)] + sanitized_messages
    response = llm.invoke(full_conversation, config=config)

    return {"messages": [response]}