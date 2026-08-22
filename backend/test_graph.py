from apps.orchestrator.graph import app_graph
from langchain_core.messages import HumanMessage
import asyncio

config = {"configurable": {"thread_id": "test_thread_1"}}
# First invoke: simulate off topic
output1 = app_graph.invoke(
    {"messages": [HumanMessage(content="what is the weather today")]},
    config=config,
)
print("Invoke 1 Mode:", output1.get("mode"))
print("Invoke 1 Reply:", output1.get("messages")[-1].content if output1.get("messages") else None)

# Second invoke: simulate good topic (with same thread_id to test if it's stuck)
output2 = app_graph.invoke(
    {"messages": [HumanMessage(content="how do I build a react app")]},
    config=config,
)
print("Invoke 2 Mode:", output2.get("mode"))
print("Invoke 2 Reply:", output2.get("messages")[-1].content if output2.get("messages") else None)

