from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    twelve_data_api_key: str = ""
    anthropic_api_key: str = ""
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/forex_signals"
    redis_url: str = "redis://localhost:6379"
    app_env: str = "development"
    signal_cache_ttl: int = 30
    price_cache_ttl: int = 10

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
