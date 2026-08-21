from langchain_core.messages import HumanMessage
from apps.orchestrator.schemas import IntentDecision, OrchestratorState
from apps.orchestrator.llm import get_llm

llm = get_llm()

def intent_router(state: OrchestratorState, config=None) -> dict:
    messages = state.get("messages", [])

    last_prompt = next(
        (m.content for m in reversed(messages) if isinstance(m, HumanMessage)),
        None
    )

    if not last_prompt:
        return {"mode": "EXPLAIN"}

    structured_llm = get_llm().with_structured_output(IntentDecision)
    decision = structured_llm.invoke(last_prompt, config=config)

    return {"mode": decision.mode}