import { dom, state } from './state.js';

export function generateGifs() {
    if (!state.cellFrames.length) {
        alert('Please process the video first to capture frames.');
        return;
    }
    if (!state.gifWorkerBlob) {
        alert('GIF generator is not ready. Please wait a moment and try again.');
        return;
    }

    const selectedIndices = [];
    document.querySelectorAll('.cell-checkbox').forEach((cb, index) => {
        if (cb.checked) {
            selectedIndices.push(index);
        }
    });

    if (selectedIndices.length === 0) {
        alert('Please select at least one cell to export.');
        return;
    }

    dom.generateGifsButton.disabled = true;
    dom.generateGifsButton.textContent = 'Generating...';

    const generationMode = document.querySelector('input[name="gen-mode"]:checked').value;

    if (generationMode === 'parallel') {
        generateGifsParallel(selectedIndices);
    } else {
        generateGifsSequentially(selectedIndices);
    }
}

function generateGifsParallel(indices) {
    const gifFps = parseInt(dom.gifFpsInput.value, 10);
    const delay = 1000 / gifFps;
    let gifsCompleted = 0;

    indices.forEach(index => {
        generateSingleGif(index, delay, () => {
            gifsCompleted++;
            if (gifsCompleted === indices.length) {
                dom.generateGifsButton.disabled = false;
                dom.generateGifsButton.textContent = '3. Generate GIFs';
            }
        });
    });
}

function generateGifsSequentially(indices) {
    const gifFps = parseInt(dom.gifFpsInput.value, 10);
    const delay = 1000 / gifFps;
    let currentIndex = 0;

    function next() {
        if (currentIndex >= indices.length) {
            dom.generateGifsButton.disabled = false;
            dom.generateGifsButton.textContent = '3. Generate GIFs';
            return;
        }
        const cellIndex = indices[currentIndex];
        currentIndex++;
        generateSingleGif(cellIndex, delay, next);
    }
    next();
}

function generateSingleGif(index, delay, onFinishedCallback) {
    const frames = state.cellFrames[index];
    const cellContainer = dom.gridContainer.children[index];
    if (!cellContainer) return;

    if (frames.length === 0) {
        console.warn(`No frames captured for cell ${index}. Skipping GIF generation.`);
        if (onFinishedCallback) onFinishedCallback();
        return;
    }

    const statusEl = cellContainer.querySelector('.status');
    statusEl.textContent = 'Building...';

    const firstFrame = frames[0];
    const width = firstFrame.width;
    const height = firstFrame.height;

    const workerUrl = URL.createObjectURL(state.gifWorkerBlob);
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        workerScript: workerUrl,
        transparent: 0x000000
    });

    frames.forEach(frame => {
        gif.addFrame(frame, { delay });
    });

    gif.on('progress', (p) => {
        statusEl.textContent = `Building... ${(p * 100).toFixed(0)}%`;
    });

    gif.on('finished', (blob) => {
        URL.revokeObjectURL(workerUrl);
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;

        const a = document.createElement('a');
        a.href = url;
        a.download = `asset_${index}.gif`;
        a.appendChild(img);

        const canvas = cellContainer.querySelector('canvas');
        if (canvas) {
             cellContainer.replaceChild(a, canvas);
        }
        statusEl.textContent = 'Done!';

        if (onFinishedCallback) {
            onFinishedCallback();
        }
    });

    gif.render();
}