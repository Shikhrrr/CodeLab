import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv 
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv() 

def get_llm(model_name: str = "gemini-3.5-flash", temperature: float = 0.2) -> ChatGoogleGenerativeAI:
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("API KEY MISSING. CHECK ENV")

    model = ChatGoogleGenerativeAI(
        model=model_name,
        temperature=temperature,
        google_api_key=api_key,
    )

    return model