// background.js

// HTML 및 이미지 데이터를 서버로 전송하는 함수
async function fetchPageData(tabId) {
  console.log("Fetching data from tab ID:", tabId);
  const [pageData] = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: async () => {
      const pageHtml = document.documentElement.outerHTML;

      // 이미지 데이터 가져오기
      const images = await Promise.all(
        Array.from(document.images).map(async (img) => {
          try {
            const response = await fetch(img.src);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const blob = await response.blob();
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return { src: img.src, base64: base64Data };
          } catch (error) {
            console.error('Error converting image:', error);
            return null;
          }
        })
      );

      return {
        html: pageHtml,
        images: images.filter(Boolean),
      };
    },
  });

  // 스크린샷 가져오기
  let screenshot = null;
  try {
    screenshot = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Screenshot capture error: ' + chrome.runtime.lastError.message));
        } else {
          resolve(dataUrl);
        }
      });
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }

  return {
    html: pageData.result.html,
    images: pageData.result.images,
    screenshot: screenshot || null,
  };
}

// 서버로 데이터를 전송하는 함수
function sendToServer(data) {
  console.log("Sending data to server:", JSON.stringify(data));
  return fetch("http://localhost:4000/receive_html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Server response:', data);
      return { success: true };
    })
    .catch(error => {
      console.error('Error sending data to server:', error);
      return { success: false, error: error.message };
    });
}

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendData" && message.tabId) {
    console.log("Received message:", message);
    fetchPageData(message.tabId)
      .then(data => {
        console.log("Fetched data:", data);
        return sendToServer(data);
      })
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error fetching page data or sending to server:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 비동기 응답을 위해 true 반환
  } else {
    console.warn("Received message without action or tabId. Message:", message);
    sendResponse({ success: false });
  }
});
