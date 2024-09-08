let currentSettings = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateFilter') {
        currentSettings = message.settings;
        applyFilter(currentSettings);
        chrome.storage.sync.set({ filterSettings: currentSettings });
    }
});

function applyFilter(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];

        if (!currentTab.url.startsWith('chrome://')) {
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: (settings) => {
                    document.body.style.filter = settings.enabled
                        ? `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturate}%) invert(${settings.invert}%) hue-rotate(${settings.hueRotate}deg) grayscale(${settings.grayScale}%) blur(${settings.blur}px)`
                        : 'none';
                },
                args: [settings]
            });
        }
    });
}

// On startup, reapply the last used settings if they exist
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.sync.get('filterSettings', (data) => {
        if (data.filterSettings) {
            currentSettings = data.filterSettings;
            applyFilter(currentSettings);
        }
    });
});
