// Set up color correction event
document.getElementById('correct-btn').addEventListener('click', function () {
  const colorblindType = document.getElementById('colorblind-type').value;

  // Query for the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      // Inject content.js dynamically into the active tab
      chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
      }, () => {
          if (chrome.runtime.lastError) {
              console.error('Error injecting script: ', chrome.runtime.lastError.message);
              return;
          }

          // Send message to content script to apply color correction
          chrome.tabs.sendMessage(activeTab.id, { type: "applyColorCorrection", colorblindType: colorblindType }, function (response) {
              if (chrome.runtime.lastError) {
                  console.error('Error sending message: ', chrome.runtime.lastError.message);
              } else if (response && response.success) {
                  console.log('Color correction applied:', response.message);
              } else {
                  console.error('No response from content script.');
              }
          });
      });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const sendDataButton = document.getElementById("sendDataButton");
  const toggleCaptureButton = document.getElementById("toggleCaptureButton");
  const statusMessage = document.getElementById("statusMessage");
  toggleCaptureButton.textContent = "Start Capturing Screenshots";  // Set initial text to "Start Capturing Screenshots"
  // Event listener for sending data button
  sendDataButton.addEventListener("click", () => {
    statusMessage.textContent = "Sending data...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
    
      if (activeTab && activeTab.id !== undefined) {
        const message = { action: "sendData", tabId: activeTab.id };

        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            statusMessage.textContent = "Error sending data.";
            return;
          }
          
          if (response && response.success) {
            statusMessage.textContent = "Data sent successfully!";
          } else {
            statusMessage.textContent = "Data sent successfully!";
          }
        });
      } else {
        statusMessage.textContent = "Failed to get active tab.";
      }
    });
  });

  // Event listener for toggling screenshot capture
  toggleCaptureButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggleCapture" }, (response) => {
      if (response && response.capturing) {
        toggleCaptureButton.textContent = "Stop Capturing Screenshots";
        statusMessage.textContent = "Capturing screenshots every 20 seconds.";
      } else {
        toggleCaptureButton.textContent = "Start Capturing Screenshots";
        statusMessage.textContent = "Screenshot capturing stopped.";
      }
    });
  });

  // Listen for audio message from background.js to play TTS audio
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "playAudio" && message.audioUrl) {
      const audio = new Audio(message.audioUrl);
      audio.play().then(() => {
        console.log("Audio playback started");
      }).catch(error => {
        console.error("Audio playback error:", error);
      });
    }
  });
});

