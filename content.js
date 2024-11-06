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

// Base64 문자열을 Blob으로 변환하는 함수
function base64ToBlob(base64) {
    const binary = atob(base64.split(',')[1]);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: 'image/png' });
}


// Function to apply color correction
// CORS 프록시 서버 URL 설정

async function applyColorCorrection(colorblindType) {
    const images = document.querySelectorAll('img');

    for (const img of images) {
        let tempImg = new Image();

        // Base64 이미지 처리
        if (img.src.startsWith('data:image')) {
            // Base64 이미지를 Blob으로 변환
            const blob = base64ToBlob(img.src);
            const objectURL = URL.createObjectURL(blob);
            tempImg.src = objectURL;
        } else {
            // 외부 URL인 경우 프록시 서버를 통해 요청
            const targetUrl = img.src;
            const proxiedUrl = "http://localhost:3000/proxy?url=" + encodeURIComponent(targetUrl);

            try {
                const response = await fetch(proxiedUrl);
                const imageBlob = await response.blob();
                const objectURL = URL.createObjectURL(imageBlob);
                tempImg.src = objectURL;
            } catch (error) {
                console.warn(`프록시 서버 오류로 이미지 처리 불가: ${img.src}`);
                continue;
            }
        }

        await new Promise((resolve) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => {
                console.error('Error loading image:', tempImg.src);
                resolve();
            };
        });

        if (tempImg.width === 0 || tempImg.height === 0) {
            console.error('Image width or height is zero, skipping:', tempImg.src);
            continue;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;

        try {
            context.drawImage(tempImg, 0, 0, tempImg.width, tempImg.height);
            const imageData = context.getImageData(0, 0, tempImg.width, tempImg.height);

            const correctedData = daltonizeImage(imageData, colorblindType);
            context.putImageData(correctedData, 0, 0);

            img.src = canvas.toDataURL(); // 처리된 이미지를 Base64로 다시 설정
            URL.revokeObjectURL(tempImg.src);
        } catch (error) {
            console.error('Error processing image:', error);
            URL.revokeObjectURL(tempImg.src);
        }
    }

    console.log(`모든 이미지 변환 완료: 이미지가 변환되었습니다.`);
}







