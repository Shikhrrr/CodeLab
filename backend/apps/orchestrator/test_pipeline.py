import os
import sys

# Ensure backend root is on sys.path for direct script execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from apps.orchestrator.graph import app_graph
from apps.orchestrator.schemas import (
    ArchitectureGraphPayload,
    CanvasNode,
    CanvasNodeData,
    CanvasEdge,
    CanvasEdgeData,
)


def run_local_test():
    print("--- 1. Building Mock Architecture Payload ---")
    
    # Mock canvas: React frontend -> FastAPI backend -> PostgreSQL DB
    nodes = [
        CanvasNode(
            id="node_frontend",
            type="serviceNode",
            data=CanvasNodeData(
                label="Web Frontend",
                technology="React",
                role="frontend",
                port=3000,
            ),
        ),
        CanvasNode(
            id="node_backend",
            type="serviceNode",
            data=CanvasNodeData(
                label="API Gateway & Backend",
                technology="FastAPI",
                role="backend",
                port=8000,
                env_vars={"DATABASE_URL": "postgresql://postgres:postgres@db:5432/app_db"},
            ),
        ),
        CanvasNode(
            id="node_db",
            type="dbNode",
            data=CanvasNodeData(
                label="Primary Database",
                technology="PostgreSQL",
                role="database",
                port=5432,
                database_name="app_db",
            ),
        ),
    ]

    edges = [
        CanvasEdge(
            id="edge_1",
            source="node_frontend",
            target="node_backend",
            data=CanvasEdgeData(protocol="HTTP/REST", description="Frontend consumes REST API"),
        ),
        CanvasEdge(
            id="edge_2",
            source="node_backend",
            target="node_db",
            data=CanvasEdgeData(protocol="TCP", description="Async SQLAlchemy connection pool"),
        ),
    ]

    payload = ArchitectureGraphPayload(
        room_id="room_dev_test_001",
        user_prompt="Generate a minimal, containerized starter system with Docker Compose, CORS configured on FastAPI, and health check endpoints.",
        nodes=nodes,
        edges=edges,
    )

    initial_state = {
        "payload": payload,
        "validation_passed": False,
        "validation_errors": [],
        "scaffolding_plan": None,
        "generated_files": [],
        "zip_buffer": None,
        "status": "INITIALIZED",
    }

    print("--- 2. Invoking LangGraph Pipeline via Groq ---")
    final_state = app_graph.invoke(initial_state)

    print(f"\nFinal Execution Status: {final_state.get('status')}")
    print(f"Validation Passed: {final_state.get('validation_passed')}")

    if not final_state.get("validation_passed"):
        print(f"Validation Errors: {final_state.get('validation_errors')}")
        return

    plan = final_state.get("scaffolding_plan")
    if plan:
        print("\n--- Scaffolding Plan ---")
        print(f"Project Name: {plan.project_name}")
        print(f"Summary: {plan.summary}")
        print(f"Services: {', '.join(plan.services)}")
        print(f"Planned Files ({len(plan.file_manifest)}):")
        for f in plan.file_manifest:
            print(f"  - {f}")

    files = final_state.get("generated_files", [])
    print(f"\n--- Generated Files ({len(files)}) ---")
    for f in files:
        print(f"\nFile: {f.path}")
        print(f"Description: {f.description}")
        print("-" * 40)
        # Print preview (first 4 lines)
        preview_lines = f.content.strip().splitlines()[:4]
        print("\n".join(preview_lines))
        if len(f.content.strip().splitlines()) > 4:
            print("...")

    zip_bytes = final_state.get("zip_buffer")
    if zip_bytes:
        out_filename = "output_architecture.zip"
        with open(out_filename, "wb") as zip_out:
            zip_out.write(zip_bytes)
        print(f"\nSuccessfully created test archive: {os.path.abspath(out_filename)}")


if __name__ == "__main__":
    run_local_test()