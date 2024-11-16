from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import re
import anthropic
import requests
import time
import io
import easyocr
import asyncio
from PIL import Image

app = FastAPI()
reader = easyocr.Reader(['ko'])  # EasyOCR 한국어 모델 초기화

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용. 보안을 위해 특정 도메인만 명시 가능.
    allow_methods=["*"],  # 허용할 HTTP 메서드
    allow_headers=["*"],  # 허용할 HTTP 헤더
)

class ReceiveData(BaseModel):
    html: str | None = None
    screenshot: str | None = None

# 파일 저장 함수
def save_file(filename: str, data: str):
    try:
        # Base64 데이터 유효성 검사
        if not is_valid_base64(data):
            raise ValueError("Invalid Base64 data")

        # Base64 디코딩 및 파일 저장
        with open(filename, "wb") as f:
            f.write(base64.b64decode(data))
        print(f"Saved file: {filename}")
    except Exception as e:
        print(f"Error saving file {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving file {filename}: {e}")

def is_valid_base64(data: str) -> bool:
    try:
        # Base64 문자열 디코딩 시도
        base64.b64decode(data, validate=True)
        return True
    except Exception:
        return False
    
# 외부 이미지 URL 처리 및 OCR 적용 함수
def process_external_images(html_content: str):
    image_urls = re.findall(r'<img src="(https?://[^"]+)"', html_content)
    for image_url in image_urls:
        try:
            # Express 프록시 서버를 통해 외부 URL 요청
            proxy_url = f"http://localhost:3000/proxy?url={image_url}"
            response = requests.get(proxy_url)
            if response.status_code != 200:
                print(f"Error fetching image: {image_url}, status code: {response.status_code}")
                continue
            image_data = io.BytesIO(response.content)
            ocr_result = reader.readtext(image_data, detail=0, paragraph=True)
            ocr_text = ' '.join(ocr_result)
            html_content = html_content.replace(image_url, f"이미지 텍스트: {ocr_text}")
            print(f"Image processed successfully for URL: {image_url}")
        except Exception as e:
            print(f"Error processing image URL {image_url}: {e}")
            continue
    return html_content

def process_base64_image(base64_data: str):
    try:
        # Base64 데이터 패딩 보정
        padding = len(base64_data) % 4
        if padding != 0:
            base64_data += "=" * (4 - padding)  # 부족한 패딩 보정

        # Base64 유효성 검사
        if not is_valid_base64(base64_data):
            raise ValueError("Invalid Base64 image data")

        # Base64 데이터를 디코딩하여 이미지 객체로 변환
        image_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_data))

        # OCR 수행
        ocr_result = reader.readtext(image, detail=0, paragraph=True)
        ocr_text = ' '.join(ocr_result)
        return ocr_text
    except Exception as e:
        print(f"Error processing base64 image: {e}")
        return None
# Anthropic API로 HTML 요약 생성
def get_summary_from_anthropic(html_content: str, screenshot: str | None = None):
    client = anthropic.Anthropic(api_key="")
    prompt = f"\n\nHuman:Summarize the following HTML data:\n{html_content}\nAssistant"
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=8000,
            temperature=0,
            system="한국어로 요약을 작성해주는 요약기입니다.",
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}]}]
        )
        summary = response.content[0].text
        if not summary:
            raise HTTPException(status_code=500, detail="Anthropic 서버에서 요약을 받지 못했습니다.")
        return summary
    except Exception as e:
        print(f"Anthropic API 연결 오류: {e}")
        raise HTTPException(status_code=500, detail="Anthropic 서버 연결 실패")

# HTML 데이터 처리 엔드포인트
# HTML 데이터 처리 엔드포인트
@app.post("/receive_html")
async def receive_html(data: ReceiveData, background_tasks: BackgroundTasks):
    print("/receive_html 요청이 접수되었습니다!")
    if not data.html:
        raise HTTPException(status_code=400, detail="필수 필드가 없습니다")

    # HTML 처리
    processed_html = process_external_images(data.html)
    with open("page.html", "w", encoding="utf-8") as f:
        f.write(processed_html)
    print("page.html 파일로 HTML 저장 완료")

    # 스크린샷 데이터 처리 (base64인 경우)
    ocr_text = None
    if data.screenshot:
        ocr_text = process_base64_image(data.screenshot)
        if ocr_text:
            print("OCR 결과:", ocr_text)
            processed_html = processed_html.replace(data.screenshot, f"스크린샷 텍스트: {ocr_text}")
        else:
            print("OCR 처리 실패")

    # HTML 요약 생성
    html_code = processed_html
    if len(html_code) > 200000:  # HTML 데이터 길이 제한
        html_code = html_code[:200000]
    summary = get_summary_from_anthropic(html_code, data.screenshot)
    print(f"받은 요약: {summary}")

    # 클라이언트에 반환할 텍스트 (HTML 요약 + OCR 결과)
    combined_text = summary
    if ocr_text:
        combined_text += f"\nOCR 텍스트: {ocr_text}"

    # 클라이언트 응답
    return JSONResponse(content={
        "success": True,
        "message": "데이터 처리 및 요약 완료",
        "text": combined_text  # 추가된 필드
    })

# Anthropic API로 스크린샷 전송
async def send_screenshot_to_anthropic(screenshot_data: str):
    client = anthropic.Anthropic(api_key="")
    prompt = f"\n\nHuman:Summarize the following screenshot data. This is website. 이 결과를 한국어로 출력해줘."
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": screenshot_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    }
                ],
            }]
        )
        
        print(response)
        return str(response.content[0].text)  # 전송 성공
    except Exception as e:
        print(f"Error sending to Anthropic API: {e}")
        return "Error detected"  # 전송 실패

# 스크린샷 저장 및 Anthropic 전송을 한번만 수행하는 함수
async def screenshot_send_func(screenshot_data: str):
    timestamp = int(time.time())
    filename = f"screenshot_{timestamp}.png"
    
    # 스크린샷 저장
    try:
        save_file(filename, screenshot_data)
        print(f"Screenshot saved as {filename}")
    except HTTPException as e:
        print(f"Error in saving screenshot: {e.detail}")
        return None

    # Anthropic API 호출
    result = await send_screenshot_to_anthropic(screenshot_data)
    if result:
        print(f"Screenshot sent to Anthropic at {timestamp}")
        return result
    else:
        print(f"Failed to send screenshot at {timestamp}")
        return None

# 스크린샷 주기적 처리 엔드포인트
@app.post("/receive_screenshot")
async def receive_screenshot(data: dict, background_tasks: BackgroundTasks):
    print("/receive_screenshot 요청이 접수되었습니다!")
    
    # 스크린샷 데이터 검증
    screenshot_data = data.get("screenshot")
    if not screenshot_data:
        raise HTTPException(status_code=400, detail="스크린샷 데이터가 없습니다")
    
    # 스크린샷 저장
    timestamp = int(time.time())
    filename = f"screenshot_{timestamp}.png"
    try:
        save_file(filename, screenshot_data)
        print(f"Screenshot immediately saved as {filename}")
    except HTTPException as e:
        print(f"Error in saving screenshot: {e.detail}")    
        raise e

    # Anthropic API 호출
    result = await screenshot_send_func(screenshot_data)
    if result:
        return JSONResponse(content={"success": True, "text": result})
    else:
        return JSONResponse(content={"success": False, "text": "Error occurred while processing the screenshot."})

# 이미지 경로 입력 및 OCR 수행을 위한 독립 함수 (테스트용)
def run_ocr():
    image_path = input("Enter image path: ")
    try:
        ocr_result = reader.readtext(image_path, detail=0, paragraph=True)
        text = ' '.join(ocr_result)
        print('Result:', text)
    except FileNotFoundError:
        print("Error: File not found. Please check the image path.")
    except Exception as e:
        print(f"An error occurred: {e}")

# run_ocr() 함수를 호출하여 독립적으로 OCR 기능을