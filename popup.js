document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('replaceImages').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: replaceImages
            });
        });
    });
});

function replaceImages() {
    const rickRollImageUrl = "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg";
    const images = document.getElementsByTagName('img');

    for (let img of images) {
        img.src = rickRollImageUrl;
    }
}
