(async () => {
  // 페이지의 전체 HTML 추출
  const pageHtml = document.documentElement.outerHTML;

  // 이미지 태그(<img>)를 찾아서 src 속성의 데이터를 base64 형식으로 변환하여 저장
  const images = await Promise.all(Array.from(document.images).map((img) => {
    const imageUrl = img.src;

    return fetch(imageUrl)
      .then((response) => response.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob); // blob을 base64 형식으로 변환
      }))
      .then((base64Data) => ({
        src: imageUrl,
        base64: base64Data
      }))
      .catch((error) => {
        console.error('Error converting image:', error);
        return null;
      });
  }));

  // base64 변환이 성공한 이미지들만 필터링
  const filteredImageData = images.filter(Boolean);

  // 서버로 HTML, 이미지 데이터를 통합하여 전송
  const requestData = {
    html: pageHtml,
    images: filteredImageData,
    screenshot: null // 여기서 화면 캡처 데이터는 background.js에서 추가
  };

  // background.js에 메시지를 보내 데이터 전송을 요청
  chrome.runtime.sendMessage({ action: "sendPageData", data: requestData }, (response) => {
    if (response && response.success) {
      console.log("Data sent successfully");
    } else {
      console.error("Failed to send data");
    }
  });
})();
