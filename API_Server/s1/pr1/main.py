from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import base64
import re
import anthropic
import time

app = FastAPI()

# 모델 정의
class ReceiveData(BaseModel):
    html: str
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

# Anthropic API를 사용하여 HTML, 스크린샷 요약 받기
def get_summary_from_anthropic(html_content: str, screenshot: str | None = None):
    client = anthropic.Anthropic(api_key="")
    
    prompt = f"\n\nHuman:Summarize the following HTML data:\n{html_content}\nAssistant"

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=8000,
            temperature=0,
            system="You are a world-class summarizer. Respond only with concise summaries. Please write as the as one continuous sentence. 그리고 한국어를 써서 답을 해줘. 너는 한국인을 위한 요약기야. ",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )
        
        # 응답 내용에서 요약 추출
        summary = response.content[0].text
        print(summary)
        if not summary:
            raise HTTPException(status_code=500, detail="Failed to receive summary from Anthropic server.")
        return summary
    except Exception as e:
        print(f"Error connecting to Anthropic API: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Anthropic server")

# 스크린샷 처리 함수
def save_screenshot(screenshot_data: str):
    match = re.match(r"^data:image/(\w+);base64,(.+)", screenshot_data)
    if match:
        extension = match[1] if match[1] else "png"
        base64_data = match[2]
        save_file(f"screenshot_{int(time.time())}.{extension}", base64_data)

# HTML 데이터 처리 API
@app.post("/receive_html")
async def receive_html(data: ReceiveData, background_tasks: BackgroundTasks):
    print("/receive_html requested!")
    if not data.html:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # HTML 저장
    with open("page.html", "w", encoding="utf-8") as f:
        f.write(data.html)
    print("HTML saved as page.html")

    # Anthropic API에 HTML, 스크린샷 요약 요청
    html_code = data.html
    if len(html_code) > 200000:
        html_code = html_code[:200000]
    summary = get_summary_from_anthropic(html_code, data.screenshot)
    print(f"Received summary: {summary}")

    return JSONResponse(content={"success": True, "message": "Data processed and summary received"})

# 스크린샷 주기적 처리
@app.post("/receive_screenshot")
async def receive_screenshot(data: ReceiveData, background_tasks: BackgroundTasks):
    print("/receive_screenshot requested!")
    if not data.screenshot:
        raise HTTPException(status_code=400, detail="Missing screenshot data")

    # 스크린샷 저장 및 20초마다 처리
    background_tasks.add_task(save_screenshot, data.screenshot)

    return JSONResponse(content={"success": True, "message": "Screenshot processing scheduled every 20 seconds"})

# FastAPI 앱 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
