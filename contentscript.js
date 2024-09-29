// Extract the HTML of the page
const pageHtml = document.documentElement.outerHTML;

// Send the extracted HTML directly to the server using fetch
fetch("http://localhost:3000/receive_html", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ html: pageHtml })
})
.then(response => response.json())
.then(data => console.log('Server response:', data))
.catch(error => console.error('Error:', error));

console.log("Sending HTML data:", JSON.stringify({ html: pageHtml }));
//html fetch api로 보내기, 사진을 텍스트로 변환? 해서 같이 보내기
