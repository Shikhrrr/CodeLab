from apps.orchestrator.schemas import OrchestratorState
from apps.orchestrator.llm import get_llm 
from langgraph.prebuilt import create_react_agent
from apps.orchestrator.tools import create_workspace_tools
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage


CODING_AGENT_SYSTEM_PROMPT = """You are an expert full-stack engineer and in-editor AI coding assistant.
You have direct access to tools for managing project files:
- `list_files`: Check current files in the project.
- `read_file`: Inspect contents before making changes.
- `write_file`: Create new files or overwrite existing files with full updated code.
- `delete_file`: Remove obsolete, unused, or deleted files.

Rules:
1. Always read a file before modifying it if you need its existing context.
2. When creating or updating files, write complete, production-ready code. Never leave placeholders like '// same as before'.
3. Delete files if the user's request makes them redundant (e.g., refactoring or changing tech stack).
4. Provide a clear, concise final summary of what you did for the user.
"""

def coding_agent(state: OrchestratorState):
    llm = get_llm() 
    room_id = state['room_id']
    tools = create_workspace_tools(room_id=room_id)

    agent_executor = create_react_agent(llm, tools) 
    
    messages = [SystemMessage(content=CODING_AGENT_SYSTEM_PROMPT)]

    # state is yet to be updated with chat history
    for msg in state.get("chat_history", []):
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    user_prompt = state["user_prompt"]
    if state.get("active_file_path"):
        user_prompt = f"[Active File in Editor: {state['active_file_path']}]\n\n{user_prompt}"

    messages.append(HumanMessage(content=user_prompt))

    response = agent_executor.invoke({"messages": messages})
    last_message = response["messages"][-1].content

    return {
        "assistant_response": last_message,
        "error": None,
    }