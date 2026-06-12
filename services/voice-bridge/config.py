import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-3.1-flash-live-preview")
GEMINI_VOICE = os.getenv("GEMINI_VOICE", "Puck")

TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
GIGLER_NUMBER = os.getenv("GIGLER_NUMBER", "+16508351235")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")

USER_TABLE = os.environ["USER_TABLE_NAME"]
GIG_TABLE = os.environ["GIG_TABLE_NAME"]
MESSAGE_TABLE = os.environ["MESSAGE_TABLE_NAME"]
GIG_PARTICIPANT_TABLE = os.getenv("GIG_PARTICIPANT_TABLE_NAME", "")
GIG_PROCESSOR_FUNCTION_NAME = os.getenv("GIG_PROCESSOR_FUNCTION_NAME", "")
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")

# Public URL of this bridge (for TwiML generation)
BRIDGE_PUBLIC_HOST = os.getenv("BRIDGE_PUBLIC_HOST", "voice.gigler.ai")

BRIDGE_HOST = os.getenv("BRIDGE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.getenv("BRIDGE_PORT", "8765"))

# Guardrails
MAX_CALL_SECONDS = int(os.getenv("MAX_CALL_SECONDS", "300"))
MAX_CONCURRENT_CALLS = int(os.getenv("MAX_CONCURRENT_CALLS", "5"))

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOG_NAME = os.getenv("GCP_LOG_NAME", "gigler-voice-bridge")
