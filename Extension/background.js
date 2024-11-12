let screenshotInterval;
let capturing = true;

// Function to send HTML and image data to `/receive_html` endpoint
function sendHtmlAndImages(data) {
  return fetch("http://192.168.65.120:8000/receive_html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then(response => {
      if (!response.ok) {
        return Promise.reject(new Error(`Network response was not ok: ${response.status} ${response.statusText}`));
      }
      return response.json();
    })
    .then(data => {
      console.log("HTML and images sent successfully:", data);

      // If the server response contains text, use Kakao TTS
      if (data.text) {
        return fetchTTS(data.text); // Fetch TTS audio for the text
      }
      return { success: true };
    })
    .catch(error => {
      console.error("Error sending HTML and images:", error);
      return { success: false, error: error.message };
    });
}

// Function to send screenshot data to `/receive_screenshot` endpoint
function sendScreenshot(data) {
  return fetch("http://192.168.65.120:8000/receive_screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then(response => {
      if (!response.ok) {
        return Promise.reject(new Error(`Network response was not ok: ${response.status} ${response.statusText}`));
      }
      return response.json();
    })
    .then(data => {
      console.log("Screenshot sent successfully:", data);

      // If server response contains text, fetch TTS audio
      if (data.text) {
        return fetchTTS(data.text); // Fetch TTS audio for the text
      }
      return { success: true };
    })
    .catch(error => {
      console.error("Error sending screenshot:", error);
      return { success: false, error: error.message };
    });
}

// Function to fetch TTS audio from Kakao TTS API
function fetchTTS(text) {
  const encodedText = encodeURIComponent(text);
  const ttsUrl = `https://tts-translate.kakao.com/newtone?message=${encodedText}&format=wav-16k`;

  return fetch(ttsUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status} ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      console.log("TTS audio retrieved successfully.");
      const audioUrl = URL.createObjectURL(blob);
      // Send the audio URL to popup.js for playback
      chrome.runtime.sendMessage({ action: "playAudio", audioUrl });
      return { success: true };
    })
    .catch(error => {
      console.error("Error retrieving TTS audio:", error);
      return { success: false, error: error.message };
    });
}

// Start capturing screenshots every 20 seconds if capturing is true
function startScreenshotInterval() {
  if (screenshotInterval) return;

  screenshotInterval = setInterval(() => {
    if (capturing) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          captureScreenshot()
            .then(screenshot => sendScreenshot({ screenshot }))
            .then(() => console.log("Screenshot captured and sent successfully"))
            .catch(error => console.error("Error capturing or sending screenshot:", error));
        }
      });
    }
  }, 20000);
}

// Function to capture a screenshot, returning a Promise
function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (dataUrl) {
        resolve(dataUrl);
      } else {
        reject(new Error("Failed to capture screenshot"));
      }
    });
  });
}

// Message listener for HTML/image and screenshot actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendData" && message.tabId) {
    fetchPageData(message.tabId)
      .then(data => sendHtmlAndImages(data))
      .then(result => sendResponse(result))
      .catch(error => {
        console.error("Error fetching page data or sending to server:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  } else if (message.action === "toggleCapture") {
    capturing = !capturing;

    if (capturing) {
      startScreenshotInterval();
    } else {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }

    sendResponse({ capturing });
    return true;
  }
});
