document.getElementById('correct-btn').addEventListener('click', function () {
    const colorblindType = document.getElementById('colorblind-type').value;

    // Query for the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];

        // Inject content.js dynamically into the active tab
        chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error injecting script: ', chrome.runtime.lastError.message);
                return;
            }

            // Send message to the content script to apply color correction
            chrome.tabs.sendMessage(activeTab.id, { type: "applyColorCorrection", colorblindType: colorblindType }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message: ', chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    console.log('Color correction applied:', response.message);
                } else {
                    console.error('No response from content script.');
                }
            });
        });
    });
});