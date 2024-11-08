// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const sendDataButton = document.getElementById("sendDataButton");
  const toggleCaptureButton = document.getElementById("toggleCaptureButton");
  const statusMessage = document.getElementById("statusMessage");

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
            statusMessage.textContent = "Failed to send data.";
          }
        });
      } else {
        statusMessage.textContent = "Failed to get active tab.";
      }
    });
  });

  // Toggle screenshot capturing
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
});
