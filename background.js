// HTML 및 이미지 데이터를 서버로 전송
async function fetchPageData(tabId) {
  const [pageData] = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const pageHtml = document.documentElement.outerHTML;

      const images = Array.from(document.images).map((img) => {
        const imageUrl = img.src;
        return fetch(imageUrl)
          .then((response) => response.blob())
          .then((blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }))
          .then((base64Data) => ({ src: imageUrl, base64: base64Data }))
          .catch((error) => {
            console.error('Error converting image:', error);
            return null;
          });
      });

      return Promise.all(images).then((imageData) => ({
        html: pageHtml,
        images: imageData.filter(Boolean)
      }));
    }
  });

  return pageData.result;
}

// 화면 캡처 기능 추가
async function captureAndSendScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (imageDataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Capture error:", chrome.runtime.lastError);
        reject("Failed to capture screenshot");
      } else {
        console.log("Captured screen image");
        resolve(imageDataUrl);
      }
    });
  });
}

// 서버로 HTML, 이미지, 캡처 데이터를 전송하는 함수
function sendToServer(data) {
  return fetch("http://localhost:3000/receive_html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Server response:', data);
    return { success: true };
  })
  .catch(error => {
    console.error('Error:', error);
    return { success: false };
  });
}

// popup.js에서 메시지를 받으면 페이지 데이터와 화면 캡처를 수집해 서버로 전송
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendData" && message.tabId) {
    Promise.all([fetchPageData(message.tabId), captureAndSendScreenshot()])
      .then(([pageData, screenshot]) => {
        // pageData와 screenshot 이미지를 합쳐서 서버로 전송
        const dataToSend = {
          html: pageData.html,
          images: pageData.images,
          screenshot: screenshot  // base64 인코딩된 스크린샷 이미지
        };
        console.log("Sending HTML, image, and screenshot data:", JSON.stringify(dataToSend));
        return sendToServer(dataToSend);
      })
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error('Error sending data:', error);
        sendResponse({ success: false });
      });
    return true;
  }
});
