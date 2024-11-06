document.addEventListener("DOMContentLoaded", () => {
  const sendDataButton = document.getElementById("sendDataButton");
  const statusMessage = document.getElementById("statusMessage");

  // 버튼 클릭 시 현재 탭의 ID를 가져와 background.js로 메시지 전송
  sendDataButton.addEventListener("click", () => {
    statusMessage.textContent = "Sending data...";

    // 현재 활성 탭 ID 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      if (activeTab && activeTab.id !== undefined) {
        // background.js에 메시지 보내기
        const message = { action: "sendData", tabId: activeTab.id }; // Ensure action name matches

        console.log("Sending message to background:", message); // Log message being sent

        chrome.runtime.sendMessage(message, (response) => {
          // 응답 상태에 따라 메시지 업데이트
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            statusMessage.textContent = "Error sending data.";
          } else if (response && response.success) {
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
});
