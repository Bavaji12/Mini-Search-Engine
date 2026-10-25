import os

class Settings:
    PROJECT_NAME: str = "Mini Search Engine"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost:5432/search_engine"
    )
    DEFAULT_BM25_K1: float = 1.5
    DEFAULT_BM25_B: float = 0.75
    SNIPPET_WINDOW_SIZE: int = 160
    CORS_ORIGINS: list = ["*"]

settings = Settings()
