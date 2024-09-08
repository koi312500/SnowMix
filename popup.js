document.addEventListener('DOMContentLoaded', () => {
    const applyButton = document.querySelector('#apply');
    const resetButton = document.querySelector('#reset');
    const savePresetButton = document.querySelector('#savePreset');
    const presetSelect = document.querySelector('#presetSelect');

    // Load current settings and update UI
    chrome.storage.sync.get(['filterSettings', 'presets'], (data) => {
        if (data.filterSettings) {
            const settings = data.filterSettings;
            setSettingsUI(settings);
            updateApplyButton(settings.enabled);
        }

        if (data.presets) {
            loadPresets(data.presets);
        }
    });

    applyButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];

            if (!currentTab.url.startsWith('chrome://')) {
                const settings = getCurrentSettings();
                settings.enabled = !settings.enabled; // Toggle the enabled state

                chrome.runtime.sendMessage({ type: 'updateFilter', settings: settings });
                updateApplyButton(settings.enabled);
            }
        });
    });

    resetButton.addEventListener('click', () => {
        const defaultSettings = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            invert: 0,
            hueRotate: 0,
            grayScale: 0,
            blur: 0,
            enabled: false
        };

        setSettingsUI(defaultSettings);
        chrome.runtime.sendMessage({ type: 'updateFilter', settings: defaultSettings });
        updateApplyButton(false);
    });

    savePresetButton.addEventListener('click', () => {
        const settings = getCurrentSettings();
        const presetName = prompt('Enter a name for your preset:');

        if (presetName) {
            chrome.storage.sync.get('presets', (data) => {
                const presets = data.presets || {};
                presets[presetName] = settings;
                chrome.storage.sync.set({ presets }, () => {
                    loadPresets(presets);
                });
            });
        }
    });

    presetSelect.addEventListener('change', (event) => {
        const presetName = event.target.value;

        if (presetName) {
            chrome.storage.sync.get('presets', (data) => {
                const settings = data.presets[presetName];
                setSettingsUI(settings);
                chrome.runtime.sendMessage({ type: 'updateFilter', settings: settings });
                updateApplyButton(settings.enabled);
            });
        }
    });

    function getCurrentSettings() {
        return {
            brightness: document.querySelector('#brightness').value,
            contrast: document.querySelector('#contrast').value,
            saturate: document.querySelector('#saturate').value,
            invert: document.querySelector('#invert').value,
            hueRotate: document.querySelector('#hueRotate').value,
            grayScale: document.querySelector('#grayScale').value,
            blur: document.querySelector('#blur').value,
            enabled: document.querySelector('#apply').textContent === 'Filter On'
        };
    }

    function setSettingsUI(settings) {
        document.querySelector('#brightness').value = settings.brightness;
        document.querySelector('#contrast').value = settings.contrast;
        document.querySelector('#saturate').value = settings.saturate;
        document.querySelector('#invert').value = settings.invert;
        document.querySelector('#hueRotate').value = settings.hueRotate;
        document.querySelector('#grayScale').value = settings.grayScale;
        document.querySelector('#blur').value = settings.blur;
    }

    function loadPresets(presets) {
        presetSelect.innerHTML = '<option value="">Load Preset</option>';
        for (const presetName in presets) {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            presetSelect.appendChild(option);
        }
    }

    function updateApplyButton(enabled) {
        applyButton.textContent = enabled ? 'Filter On' : 'Apply';
    }
});
