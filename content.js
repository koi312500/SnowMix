// Matrix multiplication utility function
function multiplyMatrices(a, b) {
    let result = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
            let sum = 0;
            for (let k = 0; k < a[0].length; k++) {
                sum += a[i][k] * b[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

// Convert RGB to LMS color space
function rgbToLms(pixel) {
    const rgbToLmsMatrix = [
        [0.31399022, 0.63951294, 0.04649755],
        [0.15537241, 0.75789446, 0.08670142],
        [0.01775239, 0.10944209, 0.87256922]
    ];
    return multiplyMatrices(rgbToLmsMatrix, [[pixel[0]], [pixel[1]], [pixel[2]]]).flat();
}

// Convert LMS back to RGB color space
function lmsToRgb(lmsPixel) {
    const lmsToRgbMatrix = [
        [5.47221206, -4.6419601, 0.16963708],
        [-1.1252419, 2.29317094, -0.1678952],
        [0.02980165, -0.19318073, 1.16364789]
    ];
    return multiplyMatrices(lmsToRgbMatrix, [[lmsPixel[0]], [lmsPixel[1]], [lmsPixel[2]]]).flat();
}

// Simulate colorblindness
function simulateColorblindness(pixel, type) {
    const lmsPixel = rgbToLms(pixel);

    let simMatrix;
    if (type === 'protanopia') {
        simMatrix = [
            [0, 1.05118294, -0.05116099],
            [0, 1, 0],
            [0, 0, 1]
        ];
    } else if (type === 'deuteranopia') {
        simMatrix = [
            [1, 0, 0],
            [0.9513092, 0, 0.04866992],
            [0, 0, 1]
        ];
    } else if (type === 'tritanopia') {
        simMatrix = [
            [1, 0, 0],
            [0, 1, 0],
            [-0.86744736, 1.86727089, 0]
        ];
    } else {
        throw new Error(`${type} is not a recognized colorblindness type.`);
    }

    const modifiedLmsPixel = multiplyMatrices(simMatrix, [[lmsPixel[0]], [lmsPixel[1]], [lmsPixel[2]]]).flat();
    const rgbPixel = lmsToRgb(modifiedLmsPixel);
    return rgbPixel.map(v => Math.min(255, Math.max(0, v))); // Clamp values to 0-255
}

// Apply Daltonization correction to the image data
function daltonizeImage(imageData, colorblindType) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const correctedPixel = simulateColorblindness([r, g, b], colorblindType);

        data[i] = correctedPixel[0];
        data[i + 1] = correctedPixel[1];
        data[i + 2] = correctedPixel[2];
    }

    return imageData;
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'applyColorCorrection') {
        const colorblindType = message.colorblindType;

        // Apply color correction logic
        console.log('Applying color correction for:', colorblindType);

        applyColorCorrection(colorblindType).then(() => {
            // Send a success response back to popup.js
            sendResponse({ success: true, message: 'Color correction applied successfully!' });
        }).catch(error => {
            console.error('Error applying color correction:', error);
            sendResponse({ success: false, message: 'Failed to apply color correction.' });
        });

        // Return true to indicate that the response will be sent asynchronously
        return true;
    }
});

// Function to apply color correction
async function applyColorCorrection(colorblindType) {
    const images = document.querySelectorAll('img');

    // Iterate over each image on the page
    for (const img of images) {
        // Set crossOrigin attribute to allow image manipulation
        img.crossOrigin = "Anonymous";

        // Wait for the image to load before processing
        await new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
                console.error('Error loading image:', img.src);
                resolve(); // Continue even if there is an error
            };
        });

        // Create a canvas to manipulate the image
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        try {
            context.drawImage(img, 0, 0, img.width, img.height);
            const imageData = context.getImageData(0, 0, img.width, img.height);

            // Apply the Daltonization correction
            const correctedData = daltonizeImage(imageData, colorblindType);
            context.putImageData(correctedData, 0, 0);

            // Update the image source with the corrected version
            img.src = canvas.toDataURL();
        } catch (error) {
            console.error('Error processing image:', error);
            // Optionally, you can set the img.src back to the original source
            // img.src = img.dataset.originalSrc; // if you store original src in dataset
        }
    }
}


