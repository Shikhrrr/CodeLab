from langgraph.prebuilt import create_react_agent
from apps.orchestrator.llm import get_llm 
from apps.orchestrator.tools import TOOLS
from apps.orchestrator.schemas import OrchestratorState

system_prompt = (
    "You are CodeLab's autonomous Full-Stack Editor & Refactoring Agent.\n"
    "CRITICAL INSTRUCTION: You MUST use the `write_file` tool to apply any code changes. "
    "DO NOT output the entire file in your message, only output the edited code blocks as text in your message. "
    "Workflow:\n"
    "1. Check the file list with `list_files` or inspect existing files with `read_file` if you need context.\n"
    "2. Make all necessary changes across all affected files using `write_file` and `delete_file`.\n"
    "3. Once all tools have run and all files are patched, provide a clear, concise summary message explaining exactly what changes were made."
)

editor_subgraph = create_react_agent(
    model=get_llm(),
    tools=TOOLS,
    prompt=system_prompt
)

def editor_node(state: OrchestratorState, config=None) -> dict:
    result = editor_subgraph.invoke(
        {"messages": state.get("messages", [])}, 
        config=config
    )
    return {"messages": result.get("messages", [])}