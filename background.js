chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendHtml") {
      const pageHtml = message.data;
  
      // Send the HTML to your server using fetch
      fetch("https://your-server-url.com/receive_html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ html: pageHtml })
      })
      .then(response => response.json())
      .then(data => console.log('Server response:', data))
      .catch(error => console.error('Error:', error));
    }
  });
  