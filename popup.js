document.getElementById('sendHtmlBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractAndSendHtml
      });
    });
  });
  
  function extractAndSendHtml() {
    const pageHtml = document.documentElement.outerHTML;
    chrome.runtime.sendMessage({ action: "sendHtml", data: pageHtml });
  }  