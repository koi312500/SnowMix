chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: replaceImages
    });
});

function replaceImages() {
    const rickRollImageUrl = "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg";
    const images = document.getElementsByTagName('img');

    for (let img of images) {
        img.src = rickRollImageUrl;
    }
}
