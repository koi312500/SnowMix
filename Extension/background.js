// background.js

let screenshotInterval;
let capturing = true;

// Function to send HTML and image data to `/receive_html` endpoint
function sendHtmlAndImages(data) {
  return fetch("http://192.168.1.15:8000/receive_html", {
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
      return { success: true };
    })
    .catch(error => {
      console.error("Error sending HTML and images:", error);
      return { success: false, error: error.message };
    });
}

// Function to send screenshot data to `/receive_screenshot` endpoint
function sendScreenshot(data) {
  return fetch("http://192.168.1.15:8000/receive_screenshot", {
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
      return { success: true };
    })
    .catch(error => {
      console.error("Error sending screenshot:", error);
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

// Fetch HTML and images from a tab
async function fetchPageData(tabId) {
  const [pageData] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      const pageHtml = document.documentElement.outerHTML;

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
            console.error("Error converting image:", error);
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

  const screenshot = await captureScreenshot().catch(error => {
    console.error("Error capturing screenshot:", error);
    return null;
  });

  return {
    html: pageData.result.html,
    images: pageData.result.images,
    screenshot,
  };
}

// Start screenshot interval when the extension loads
startScreenshotInterval();
