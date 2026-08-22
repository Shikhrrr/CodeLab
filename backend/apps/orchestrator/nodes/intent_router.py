from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from apps.orchestrator.schemas import IntentDecision, OrchestratorState
from apps.orchestrator.llm import get_llm

SYSTEM_ROUTER_PROMPT = (
    "You are an intent classification system for CodeLab, an AI software engineering & architecture workspace.\n"
    "Categorize the user's input into ONE of these four modes:\n"
    "- 'SCAFFOLD': Explicitly requested scaffolding or generating a complete multi-file starter project from whiteboards.\n"
    "- 'EDIT': Explicit request to create, write, edit, patch, fix, or delete specific files in the project.\n"
    "- 'EXPLAIN': Technical questions, architecture advice, code explanations, greetings (e.g. 'hi', 'hello'), assistance requests, or general software development discussions.\n"
    "- 'BAD': Strictly completely off-topic queries entirely unrelated to software engineering, technology, or programming (e.g. cooking recipes, sports scores, celebrity gossip, weather forecasts, entertainment).\n\n"
    "CRITICAL: Greetings, general intro questions, and any tech/coding related questions MUST be categorized as 'EXPLAIN', NEVER 'BAD'."
)

def intent_router(state: OrchestratorState, config=None) -> dict:
    messages = state.get("messages", [])

    last_prompt = next(
        (m.content for m in reversed(messages) if isinstance(m, HumanMessage)),
        None
    )

    if not last_prompt:
        return {"mode": "EXPLAIN"}

    try:
        structured_llm = get_llm().with_structured_output(IntentDecision)
        prompt_messages = [
            SystemMessage(content=SYSTEM_ROUTER_PROMPT),
            HumanMessage(content=last_prompt)
        ]
        decision = structured_llm.invoke(prompt_messages, config=config)
        detected_mode = getattr(decision, "mode", "EXPLAIN")
    except Exception:
        detected_mode = "EXPLAIN"

    if detected_mode == "BAD":
        refusal_msg = AIMessage(
            content="I am CodeLab's AI assistant focused strictly on software engineering and system architecture. "
                    "I can only assist with programming tasks, architecture whiteboards, code edits, and technical design questions."
        )
        return {
            "mode": "BAD",
            "messages": [refusal_msg],
        }

    return {"mode": detected_mode}