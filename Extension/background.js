let screenshotInterval;
let capturing = false;

// Function to send HTML and images to `/receive_html` endpoint
function sendHtmlAndImages(data) {
  console.log("Sending data to server:", data);  // Debugging: Check the HTML and images being sent
  return fetch("http://25.14.254.119:8000/receive_html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),  // Send HTML and images
  })
    .then(response => {
      if (!response.ok) {
        return Promise.reject(new Error(`Network response was not ok: ${response.status} ${response.statusText}`));
      }
      return response.json();
    })
    .then(data => {
      console.log("HTML and images sent successfully:", data);
      if (data.text) {
        console.log("Text Summary from Server:", data.text);  // Display the text summary in console
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
  console.log("Sending screenshot data:", data);  // Debugging: Check the screenshot being sent
  return fetch("http://25.14.254.119:8000/receive_screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),  // Send screenshot data
  })
    .then(response => {
      if (!response.ok) {
        return Promise.reject(new Error(`Network response was not ok: ${response.status} ${response.statusText}`));
      }
      return response.json();
    })
    .then(data => {
      console.log("Screenshot sent successfully:", data);
      if (data.text) {
        console.log("Text Summary from Server:", data.text);  // Display
        return fetchTTS(data.text);
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
  console.log("tts ready")
  chrome.runtime.sendMessage({ action: "playAudio", audioUrl: ttsUrl });
  console.log("tts finish")
}

// Function to capture a screenshot
function captureScreenshot() {
  console.log("Capturing screenshot...");
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Error capturing screenshot:", chrome.runtime.lastError);
        reject(new Error("Failed to capture screenshot"));
      } else if (dataUrl) {
        console.log("Screenshot captured:", dataUrl);  // Debugging: Check the captured screenshot
        const base64Data = dataUrl.split(',')[1];  // Base64 부분만 추출

        resolve(base64Data);  // Base64 데이터 반환
      } else {
        reject(new Error("Failed to capture screenshot: No data returned"));
      }
    });
  });
}

// Start capturing screenshots every 20 seconds if capturing is true
function startScreenshotInterval() {
  console.log("Starting screenshot interval...");
  if (screenshotInterval) return;
  screenshotInterval = setInterval(() => {
    if (capturing) {
      console.log("Capturing screenshot...")
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          captureScreenshot()
            .then(screenshot => {
              console.log("Captured screenshot:", screenshot);
              sendScreenshot({ screenshot: screenshot });
            })
            .catch(error => console.error("Error capturing or sending screenshot:", error));
        }
      });
    }
  }, 20000);
}

function stopScreenshotInterval() {
  console.log("Stopping screenshot interval...");
  clearInterval(screenshotInterval);
  screenshotInterval = null;
}

/// Function to fetch page data (HTML and images) and handle CORS issues
function fetchPageData(tabId) {
  console.log("Fetching page data...");

  return new Promise((resolve, reject) => {
    console.log("About to execute script...");

    // Execute script within the context of the page
    chrome.scripting.executeScript({
      target: { tabId },
      func: function() {
        console.log("Inside executed script...");
        const pageHtml = document.documentElement.outerHTML;
        const convertToAbsoluteUrl = (src) => {
          if (!src.startsWith('http')) {
            return new URL(src, document.baseURI).href; // Convert relative URL to absolute
          }
          return src;
        };
        // Fetch all images and convert them to base64
        const imagesPromises = Array.from(document.images).map((img, index) => {
          return new Promise((resolve, reject) => {
            try {
              console.log(`Converting image ${index + 1}:`, img.src);
              if (!img.src) {
                console.error(`Image ${index + 1} has an invalid or empty src`);
                resolve(null); // Skip invalid images
                return;
              }
              // Use CORS proxy to fetch image data
              fetch(`http://localhost:4000/proxy?url=${encodeURIComponent(img.src)}`)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                  }
                  return response.blob();
                })
                .then(blob => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    console.log(`Image ${index + 1} converted to Base64`);
                    resolve({ src: img.src, base64: reader.result });
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                })
                .catch(error => {
                  console.error("Error converting image:", error);
                  resolve(null);  // Resolve to avoid Promise rejection
                });
            } catch (error) {
              console.error("Error processing image:", error);
              resolve(null);  // Resolve to avoid Promise rejection
            }
          });
        });

        // Wait for all image promises to finish
        return Promise.all(imagesPromises).then(images => {
          return {
            html: pageHtml,
            images: images.filter(Boolean),  // Only include images that were successfully processed
          };
        });
      },
    })
    .then(pageData => {
      console.log("Fetched page data:", pageData);

      // Extract the result from the array
      const { html, images } = pageData[0].result;  // Access result in the array

      // Capture screenshot and resolve with all data
      captureScreenshot().then(screenshot => {
        resolve({
          html: html,
          images: images,
          screenshot: screenshot,  // Include screenshot in the result
        });
      }).catch(error => {
        console.error("Error capturing screenshot:", error);
        resolve({
          html: html,
          images: images,
          screenshot: null,  // Return null if screenshot capture fails
        });
      });
    })
    .catch(error => {
      console.error("Error executing script:", error);
      reject(error);  // Reject with the error from script execution
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

    return true;  // Keep the message channel open for async response
  } 
  if (message.action === "toggleCapture") {
    capturing = !capturing;

    if (capturing) {
      startScreenshotInterval();
    } else {
      stopScreenshotInterval();
    }

    sendResponse({ capturing });
    return true;
  }
});
