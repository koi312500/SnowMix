from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import base64
import re
import anthropic
import pyttsx3  # TTS (텍스트-음성 변환) 라이브러리

app = FastAPI()

# 모델 정의
class ImageData(BaseModel):
    base64: str
    src: str

class ReceiveData(BaseModel):
    html: str
    images: list[ImageData]
    screenshot: str | None = None

# 파일 저장 함수
def save_file(filename: str, data: str):
    try:
        with open(filename, "wb") as f:
            f.write(base64.b64decode(data))
        print(f"Saved file: {filename}")
    except Exception as e:
        print(f"Error saving file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Error saving file")

# Anthropic API를 사용하여 HTML 요약 받기
def get_summary_from_anthropic(html_content: str):
    # Anthropic API 설정
    client = anthropic.Client("your_anthropic_api_key")  # Anthropic API 키
    
    prompt = f"Summarize the following HTML content:\n{html_content}\nSummary:"
    
    try:
        # Claude 모델에 요청을 보내서 요약을 받음
        response = client.completions.create(
            model="claude-1",  # 사용할 모델 (Claude-1, Claude-2 등)
            prompt=prompt,
            max_tokens=500,  # 최대 토큰 수
        )
        summary = response["completion"]
        if not summary:
            raise HTTPException(status_code=500, detail="Anthropic 서버로부터 요약을 받지 못했습니다.")
        return summary
    except Exception as e:
        print(f"Error connecting to Anthropic API: {e}")
        raise HTTPException(status_code=500, detail="Anthropic 서버와의 연결 실패")

# 텍스트를 음성으로 변환하고 저장
def text_to_speech(text: str, filename="summary_audio.mp3"):
    engine = pyttsx3.init()
    engine.save_to_file(text, filename)
    engine.runAndWait()
    print(f"Saved TTS audio as {filename}")

@app.post("/receive_html")
async def receive_html(data: ReceiveData):
    if not data.html or not data.images:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # HTML 저장
    with open("page.html", "w") as f:
        f.write(data.html)
    print("HTML saved as page.html")

    # 이미지 저장
    for index, img in enumerate(data.images):
        match = re.match(r"^data:image/(\w+);base64,(.+)", img.base64)
        if match:
            extension = match[1] if match[1] else "png"
            base64_data = match[2]
            filename = f"image_{index}.{extension}"
            save_file(filename, base64_data)

    # 스크린샷 저장
    if data.screenshot:
        match = re.match(r"^data:image/(\w+);base64,(.+)", data.screenshot)
        if match:
            extension = match[1] if match[1] else "png"
            base64_data = match[2]
            save_file(f"screenshot.{extension}", base64_data)

    # Anthropic API에 HTML 데이터 요약 요청
    summary = get_summary_from_anthropic(data.html)
    print(f"Received summary: {summary}")

    # 요약된 텍스트를 음성으로 변환하여 저장
    text_to_speech(summary)

    return JSONResponse(content={"success": True, "message": "Data processed and summary audio saved"})
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
