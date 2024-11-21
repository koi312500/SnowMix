# SnowMix  
### Created by `2024 Pineapple Club`'s `Round off the Square Earth` Team  
**"To everyone who walks towards the stars!"**

## Purpose
SnowMix is a powerful tool designed to enhance web accessibility for visually impaired and color-blind individuals, ensuring a more inclusive digital experience.


## Features
- Adjusts image colors to create colorblind-friendly versions, allowing colorblind users to perceive images more effectively.  
- Provides descriptions of a website's overall content and structure, along with real-time updates on changes, enabling visually impaired users to navigate websites with ease.

## How to Run SnowMix

### Step 1: Register the Extension
1. Open a Chromium-based browser (e.g., Chrome, Edge).  
2. Register the `Extension` folder as an extension:  
   - Navigate to `chrome://extensions` in the browser.  
   - Enable "Developer Mode" (toggle in the top-right corner).  
   - Click on "Load unpacked" and select the `Extension` folder.


### Step 2: Set Up the Environment
Prepare your system for running SnowMix:  

1. Install PyTorch compatible with your GPU and system:  
   - Visit [PyTorch.org](https://pytorch.org/get-started/locally/) to download the appropriate version.

2. Enable Corepack and install required dependencies:  
    ```bash
    corepack enable
    npm i
    pip install -r ./API_Server/requirements.txt
    ```

### Step 3: Run the Program
Start the server and extension:  

1. Run the following commands in your terminal:  
    ```bash
    npm run start &
    python ./API_Server/main.py &
    ```
2. Access SnowMix in your Chromium browser's extension menu.  

---

**Enjoy a seamless and accessible web experience with SnowMix!**
