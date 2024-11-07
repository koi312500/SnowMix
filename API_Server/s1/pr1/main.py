'''from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}
'''
from fastapi import FastAPI
'''
app = FastAPI()

@app.get("/home/{name}")
def read_name(name: str):
    
    return {'name': name}

@app.get("/home_err/{name}")
def read_name_err(name: int):
    return {'name': name}
'''
'''app = FastAPI()

@app.get("/home/{name}")
def read_name(name: str):
   words = name.split()
    
    
   f=[word[0] for word in words]
    
    
   return "".join(f)

@app.get("/home_err/{name}")
def read_name_err(name: int):
    return {'name': name}'''
'''from enum import Enum
from fastapi import FastAPI

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

app = FastAPI()

@app.get("/models/{model_name}")
async def get_model(model_name: ModelName):
    if model_name is ModelName.alexnet:
        return {"model_name": model_name, "message": "Deep Learning FTW!"}

    if model_name.value == "lenet":
        return {"model_name": model_name, "message": "LeCNN all the images"}

    return {"model_name": model_name, "message": "Have some residuals"}
'''

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import base64

app = FastAPI()  # FastAPI 인스턴스를 생성합니다.

# 모델 정의
class ImageData(BaseModel):  # 이미지 데이터를 저장할 모델을 정의합니다.
    base64: str  # base64 인코딩된 이미지 데이터
    src: str  # 이미지의 출처나 이름

class ReceiveData(BaseModel):  # 요청에서 받는 데이터를 정의하는 모델
    html: str  # HTML 콘텐츠
    images: list[ImageData]  # 이미지들의 리스트 (ImageData 모델 객체들)
    screenshot: str | None = None  # 스크린샷 데이터 (선택 사항)

# 파일 저장 함수
def save_file(filename: str, data: str):  # 파일 저장 함수 (Base64 데이터로 저장)
    try:
        with open(filename, "wb") as f:  # 파일을 바이너리 쓰기 모드로 엽니다.
            f.write(base64.b64decode(data))  # Base64로 인코딩된 데이터를 디코딩하여 파일에 씁니다.
        print(f"Saved file: {filename}")  # 파일이 저장된 것을 로그로 출력합니다.
    except Exception as e:  # 예외 처리
        print(f"Error saving file {filename}: {e}")  # 파일 저장 중 오류 발생 시 로그 출력
        raise HTTPException(status_code=500, detail="Error saving file")  # 서버 오류를 발생시킵니다.

@app.post("/receive_html")  # 클라이언트로부터 HTML과 이미지를 받는 POST 요청을 처리합니다.
async def receive_html(data: ReceiveData):  # 클라이언트로부터 받은 데이터를 ReceiveData 모델로 받습니다.
    if not data.html or not data.images:  # HTML 데이터나 이미지가 없으면 오류를 발생시킵니다.
        raise HTTPException(status_code=400, detail="Missing required fields")  # 400 Bad Request 에러를 반환합니다.
    
    # HTML 저장
    with open("page.html", "w") as f:  # HTML 데이터를 'page.html' 파일로 저장합니다.
        f.write(data.html)  # 받은 HTML 내용을 파일에 씁니다.
    print("HTML saved as page.html")  # HTML이 저장되었음을 로그로 출력합니다.

    # 이미지 저장
    for index, img in enumerate(data.images):  # 이미지 목록을 순회합니다.
        match = img.base64.match(r"^data:image/(\w+);base64,(.+)")  # Base64 형식이 맞는지 확인합니다.
        if not match:  # Base64 형식이 잘못된 경우
            pass  # 아무 작업도 하지 않고 넘어갑니다.
        else:  # Base64 형식이 맞으면
            extension = match[1] if match[1] else "png"  # 확장자를 추출합니다. 없으면 "png"로 설정
            base64_data = match[2]  # Base64 데이터 본문을 추출합니다.
            filename = f"image_{index}.{extension}"  # 저장할 파일 이름을 설정합니다.
            save_file(filename, base64_data)  # 이미지를 파일로 저장합니다.

    # 스크린샷 저장 (선택 사항)
    if data.screenshot:  # 스크린샷 데이터가 있을 경우
        match = data.screenshot.match(r"^data:image/(\w+);base64,(.+)")  # Base64 형식이 맞는지 확인합니다.
        if match:  # Base64 형식이 맞으면
            extension = match[1] if match[1] else "png"  # 확장자를 추출합니다. 없으면 "png"로 설정
            base64_data = match[2]  # Base64 데이터 본문을 추출합니다.
            save_file(f"screenshot.{extension}", base64_data)  # 스크린샷을 파일로 저장합니다.
        else:
            pass  # Base64 형식이 잘못된 경우 아무 작업도 하지 않습니다.

    return JSONResponse(content={"success": True, "message": "Data received and saved"})  # 성공 응답을 반환합니다.

if __name__ == "__main__":  # 이 파일이 직접 실행될 경우 아래 코드를 실행합니다.
    import uvicorn  # uvicorn 서버를 임포트합니다.
    uvicorn.run(app, host="0.0.0.0", port=4000)  # FastAPI 애플리케이션을 4000 포트에서 실행합니다.
