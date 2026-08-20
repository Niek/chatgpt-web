import json
import re
import time
from lorem_text import lorem

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# add CORS middleware to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XSn1WQAAAABJRU5ErkJggg=="


# Define a route to handle POST requests
@app.post("/v1/chat/completions")
async def post_data(data: dict):
    """Returns mock responses for testing purposes."""

    messages = data['messages']
    instructions = messages[-1]['content']

    delay = 0
    lines = None
    answer = 'Default mock answer from mocked API'

    try:
        delay = re.findall(r'(?<=d)\d+',instructions)[0]
    except:
        pass

    try:
        lines = re.findall(r'(?<=l)\d+',instructions)[0]
    except:
        pass


    if delay:
        time.sleep(int(delay))

    if lines:
        answer = "\n".join([lorem.sentence() for _ in range(int(lines))])

    response = {
        "id": 0,
        "choices": [{
            "index": 0,
            "finish_reason": "stop",
            "message": {"content": answer,"role": "assistant"}
        }]
    }
    return response


@app.post("/v1/images/generations")
@app.post("/v1/images")
async def generate_images(data: dict):
    """Returns base64-encoded mock images for compatible image endpoints."""
    count = max(1, min(int(data.get("n", 1)), 4))
    return {
        "created": int(time.time()),
        "data": [
            {
                "b64_json": MOCK_IMAGE_B64,
                "media_type": "image/png",
            }
            for _ in range(count)
        ],
        "usage": {
            "input_tokens": 1,
            "output_tokens": count,
            "total_tokens": count + 1,
        },
    }


@app.get('/v1/models')
async def list_models():
    """Returns a list of models to get app to work."""
    with open('/work/models_response.json') as f:
        result = json.load(f)

    return result


@app.post('/')
async def post_data(data: dict):
    """Basic route for testing the API works"""
    result = {"message": "Data received", "data": data}
    return result
