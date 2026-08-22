from apps.orchestrator.nodes.intent_router import intent_router
from langchain_core.messages import HumanMessage
import asyncio

state = {"messages": [HumanMessage(content="how do I center a div?")]}
result = intent_router(state)
print(result)
