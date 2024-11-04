// 페이지의 전체 HTML을 추출
const pageHtml = document.documentElement.outerHTML;

// 이미지 태그(<img>)를 찾아서 src 속성의 데이터를 base64 형식으로 변환하여 저장
const images = Array.from(document.images).map((img) => {
  // 이미지 URL을 가져옴
  const imageUrl = img.src;

  // 이미지를 base64 형식으로 변환하는 비동기 작업을 처리하기 위한 프라미스
  return fetch(imageUrl)
    .then((response) => response.blob()) // 이미지를 blob 형식으로 가져옴
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
});

// 모든 이미지가 변환될 때까지 대기한 후 서버로 데이터 전송
Promise.all(images).then((imageData) => {
  // base64 변환이 성공한 이미지들만 포함
  const filteredImageData = imageData.filter(Boolean);

  // HTML과 이미지 데이터를 서버로 전송
  fetch("http://localhost:3000/receive_html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      html: pageHtml,
      images: filteredImageData
    })
  })
  .then((response) => response.json())
  .then((data) => console.log('Server response:', data))
  .catch((error) => console.error('Error:', error));

  console.log("Sending HTML and image data:", JSON.stringify({ html: pageHtml, images: filteredImageData }));
});