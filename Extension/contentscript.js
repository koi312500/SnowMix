// contentScript.js

(async () => {
  // Extract page HTML and images
  const pageHtml = document.documentElement.outerHTML;

  const images = await Promise.all(Array.from(document.images).map((img) => {
    const imageUrl = img.src;

    return fetch(imageUrl)
      .then((response) => response.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          if (base64String && base64String.startsWith("data:image/")) {
            resolve({ src: imageUrl, base64: base64String });
          } else {
            resolve(null);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .catch((error) => {
        console.error('Error converting image:', error);
        return null;
      });
  }));

  const filteredImageData = images.filter(Boolean);

  // Send HTML and image data to background.js
  const requestData = {
    html: pageHtml,
    images: filteredImageData,
  };

  chrome.runtime.sendMessage({ action: "sendData", data: requestData }, (response) => {
    if (response && response.success) {
      console.log("Data sent successfully");
    } else {
      console.error("Failed to send data");
    }
  });
})();
