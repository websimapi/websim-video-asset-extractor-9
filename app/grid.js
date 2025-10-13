import { dom, state } from './state.js';

const DRAG_SENSITIVITY = 10; // pixels

export function setupDragListeners() {
    dom.gridOverlay.style.pointerEvents = 'auto';
    dom.gridOverlay.style.cursor = 'crosshair';

    dom.gridOverlay.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', drawGridOverlay); // Redraw on resize
}

export function resetGridLines() {
    const rows = parseInt(dom.videoRowsInput.value);
    const cols = parseInt(dom.videoColsInput.value);
    const { videoWidth, videoHeight } = state.video;

    state.verticalLines = [];
    for (let i = 1; i < cols; i++) {
        state.verticalLines.push((videoWidth / cols) * i);
    }

    state.horizontalLines = [];
    for (let i = 1; i < rows; i++) {
        state.horizontalLines.push((videoHeight / rows) * i);
    }
    updateCellRects();
}

export function drawGridOverlay() {
    const { clientWidth, clientHeight } = dom.gridOverlay;
    dom.gridOverlay.width = clientWidth;
    dom.gridOverlay.height = clientHeight;

    const ctx = dom.gridOverlay.getContext('2d');
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;

    const { videoWidth, videoHeight } = state.video;

    state.verticalLines.forEach(x => {
        const canvasX = (x / videoWidth) * clientWidth;
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, clientHeight);
        ctx.stroke();
    });

    state.horizontalLines.forEach(y => {
        const canvasY = (y / videoHeight) * clientHeight;
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(clientWidth, canvasY);
        ctx.stroke();
    });
}

export function updateCellRects() {
    state.cellPreviewRects = [];
    const rows = parseInt(dom.videoRowsInput.value);
    const cols = parseInt(dom.videoColsInput.value);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            state.cellPreviewRects.push(getPreviewRect(r, c, rows, cols));
        }
    }
}

function getPreviewRect(r, c, rows, cols) {
    const paddingTop = parseInt(dom.paddingTopInput.value) || 0;
    const paddingRight = parseInt(dom.paddingRightInput.value) || 0;
    const paddingBottom = parseInt(dom.paddingBottomInput.value) || 0;
    const paddingLeft = parseInt(dom.paddingLeftInput.value) || 0;

    const xStart = c === 0 ? 0 : state.verticalLines[c - 1];
    const yStart = r === 0 ? 0 : state.horizontalLines[r - 1];
    const xEnd = c === cols - 1 ? state.video.videoWidth : state.verticalLines[c];
    const yEnd = r === rows - 1 ? state.video.videoHeight : state.horizontalLines[r];

    const sx = Math.round(xStart) + paddingLeft;
    const sy = Math.round(yStart) + paddingTop;
    const sWidth = Math.round(xEnd - xStart) - paddingLeft - paddingRight;
    const sHeight = Math.round(yEnd - yStart) - paddingTop - paddingBottom;

    return {
        sx,
        sy,
        sWidth: sWidth > 0 ? sWidth : 1,
        sHeight: sHeight > 0 ? sHeight : 1
    };
}

function getMousePos(evt) {
    const rect = dom.gridOverlay.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function handleMouseDown(e) {
    const pos = getMousePos(e);
    const scaleX = state.video.videoWidth / dom.gridOverlay.clientWidth;
    const scaleY = state.video.videoHeight / dom.gridOverlay.clientHeight;

    for (let i = 0; i < state.verticalLines.length; i++) {
        if (Math.abs(pos.x - state.verticalLines[i] / scaleX) < DRAG_SENSITIVITY) {
            state.draggingLine = { type: 'v', index: i };
            dom.gridOverlay.style.cursor = 'ew-resize';
            return;
        }
    }
    for (let i = 0; i < state.horizontalLines.length; i++) {
        if (Math.abs(pos.y - state.horizontalLines[i] / scaleY) < DRAG_SENSITIVITY) {
            state.draggingLine = { type: 'h', index: i };
            dom.gridOverlay.style.cursor = 'ns-resize';
            return;
        }
    }
}

function handleMouseMove(e) {
    if (!state.draggingLine.type) return;

    const pos = getMousePos(e);
    const scaleX = state.video.videoWidth / dom.gridOverlay.clientWidth;
    const scaleY = state.video.videoHeight / dom.gridOverlay.clientHeight;

    if (state.draggingLine.type === 'v') {
        const newX = pos.x * scaleX;
        const prevLineX = state.draggingLine.index > 0 ? state.verticalLines[state.draggingLine.index - 1] : 0;
        const nextLineX = state.draggingLine.index < state.verticalLines.length - 1 ? state.verticalLines[state.draggingLine.index + 1] : state.video.videoWidth;

        state.verticalLines[state.draggingLine.index] = Math.max(prevLineX, Math.min(newX, nextLineX));
        updateCellRects();

    } else if (state.draggingLine.type === 'h') {
        const newY = pos.y * scaleY;
        const prevLineY = state.draggingLine.index > 0 ? state.horizontalLines[state.draggingLine.index - 1] : 0;
        const nextLineY = state.draggingLine.index < state.horizontalLines.length - 1 ? state.horizontalLines[state.draggingLine.index + 1] : state.video.videoHeight;

        state.horizontalLines[state.draggingLine.index] = Math.max(prevLineY, Math.min(newY, nextLineY));
        updateCellRects();
    }

    drawGridOverlay();
}

function handleMouseUp() {
    state.draggingLine = { type: null, index: -1 };
    dom.gridOverlay.style.cursor = 'crosshair';
}