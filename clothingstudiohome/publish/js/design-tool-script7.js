// --- GLOBAL STATE AND CONFIGURATION ---

// Product base images (you must create these image files)
const productImages = {
    tshirt: {
        white: '../images_data/background_shirt.avif',
        black: 'images/tshirt_front_black.png',
        navy:  'images/tshirt_front_navy.png',
        red:   'images/tshirt_front_red.png',
    },
    hoodie: {
        white: 'images/hoodie_front_white.png',
        black: 'images/hoodie_front_black.png',
        // TODO: add navy/red hoodie images
    },
    // TODO: add mug, hat, etc.
};

const toolState = {
    currentProduct: 'tshirt',
    currentColor: 'white',
    currentView: 'front',
    history: [],
    historyIndex: -1
};

let canvas;      // Fabric canvas instance
let printArea;   // Final fixed print area (used for clamping)

// --- DEV HELPERS: GUIDE RECTANGLE (DRAGGABLE & RESIZABLE) ---
// Use these only while designing the viewport, not for customers.

function addGuideRectangle() {
    if (!canvas) {
        console.warn('Canvas not ready yet.');
        return;
    }

    const guide = new fabric.Rect({
        left: 150,         // starting guess
        top: 150,
        width: 250,
        height: 300,
        fill: 'rgba(0, 128, 255, 0.1)',    // light transparent blue
        stroke: 'rgba(0, 128, 255, 0.9)',
        strokeWidth: 2,
        hasControls: true,
        hasBorders: true,
        selectable: true,
        evented: true,
        lockRotation: false,
        id: 'guide_rect'
    });

    canvas.add(guide);
    canvas.setActiveObject(guide);
    canvas.renderAll();

    console.log(
        '%cGuide rectangle added. Drag + resize it on the shirt, then run getGuideValues().',
        'color: green; font-weight: bold;'
    );
}

function getGuideValues() {
    if (!canvas) {
        console.warn('Canvas not ready yet.');
        return;
    }

    const guide = canvas.getObjects().find(obj => obj.id === 'guide_rect');
    if (!guide) {
        console.log('No guide rectangle (id="guide_rect") found.');
        return;
    }

    const bounds = guide.getBoundingRect(true);

    console.log('=== PRINT AREA VALUES (copy these into createPrintArea) ===');
    console.log('left:', bounds.left);
    console.log('top:', bounds.top);
    console.log('width:', bounds.width);
    console.log('height:', bounds.height);
}

// Expose helpers to DevTools console
window.addGuideRectangle = addGuideRectangle;
window.getGuideValues = getGuideValues;

// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('Design Studio is initializing...');

    const canvasElement = document.getElementById('design-canvas');
    if (!canvasElement) {
        console.error('Canvas element #design-canvas not found.');
        return;
    }

    // 1. Create Fabric canvas
    canvas = new fabric.Canvas('design-canvas', {
        backgroundColor: '#f9f9f9',
        selection: true
    });
    console.log('Fabric.js canvas initialized.');

    // 2. Load initial product base image (this will also ensure printArea is added)
    loadProductImage(toolState.currentProduct, toolState.currentColor);

    // 3. Save initial state for undo/redo
    saveState();

    // 4. Hook up UI event listeners
    setupUI();

    // 5. Track changes on canvas for history
    canvas.on('object:modified', saveState);
    canvas.on('object:added', (e) => {
        // Avoid saving the state when base product image is added
        if (e.target && e.target.id !== 'product_base') {
            saveState();
        }
    });

    // 6. Keep design elements inside the print area on move/scale
    canvas.on('object:moving', (e) => {
        if (e.target) keepObjectInPrintArea(e.target);
    });

    canvas.on('object:scaling', (e) => {
        if (e.target) keepObjectInPrintArea(e.target);
    });
});

// --- VIEWPORT / PRINT AREA LOGIC ---

// This is the *real* viewport guide that customers see.
// You already measured these values using the dev guide.
function createPrintArea() {
    if (!canvas) return;

    printArea = new fabric.Rect({
        left: 186,      // from your measured ~185.73
        top: 86,        // from your measured ~86.06
        width: 232,     // from your measured ~231.76
        height: 441,    // as measured
        fill: 'rgba(0,0,0,0)',              // transparent inside
        stroke: 'rgba(0,150,255,0.6)',      // blue outline
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        id: 'print_area'
    });

    canvas.add(printArea);
    canvas.renderAll();
}

// 🔑 Smooth clamping: keep object fully inside printArea
function keepObjectInPrintArea(obj) {
    if (!canvas || !printArea) return;

    // Don’t clamp the base shirt, the fixed printArea, or the dev guide
    if (obj.id === 'product_base' || obj.id === 'print_area' || obj.id === 'guide_rect') {
        return;
    }

    // Object's top-left (Fabric default originX='left', originY='top')
    let left = obj.left;
    let top  = obj.top;

    // Object's size after scaling
    const objWidth  = obj.getScaledWidth();
    const objHeight = obj.getScaledHeight();

    // Print area bounds
    const paLeft   = printArea.left;
    const paTop    = printArea.top;
    const paRight  = printArea.left + printArea.width;
    const paBottom = printArea.top  + printArea.height;

    // Allowed range for the object's top-left corner
    const minLeft = paLeft;
    const maxLeft = paRight - objWidth;
    const minTop  = paTop;
    const maxTop  = paBottom - objHeight;

    // Clamp
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    if (top < minTop)   top = minTop;
    if (top > maxTop)   top = maxTop;

    obj.left = left;
    obj.top  = top;
    obj.setCoords();
    canvas.renderAll();
}

// --- UI EVENT WIRING ---

function setupUI() {
    // Product selection buttons
    document.querySelectorAll('.item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const product = e.target.dataset.product;
            updateProduct(product, e.target);
        });
    });

    // Color swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            updateColor(color, e.target);
        });
    });

    // View toggle (front/back)
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            updateView(view, e.target);
        });
    });

    // Image upload
    const uploadInput = document.getElementById('upload-image');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleImageUpload);
    }

    // Add text
    const addTextBtn = document.getElementById('add-text-btn');
    if (addTextBtn) {
        addTextBtn.addEventListener('click', handleAddText);
    }

    // Undo/Redo/Clear
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('clear-btn').addEventListener('click', clearDesign);

    // Get quote
    const quoteBtn = document.getElementById('get-quote-btn');
    if (quoteBtn) {
        quoteBtn.addEventListener('click', generateQuoteRequest);
    }
}

// --- HISTORY FUNCTIONS (UNDO/REDO) ---

function saveState() {
    if (!canvas) return;

    const json = canvas.toJSON();

    // Cut off any "future" states if we’re in the middle of the history
    toolState.history = toolState.history.slice(0, toolState.historyIndex + 1);

    toolState.history.push(json);
    toolState.historyIndex++;

    updateUndoRedoButtons();
}

function restoreState() {
    const json = toolState.history[toolState.historyIndex];
    if (!json || !canvas) return;

    canvas.loadFromJSON(json, () => {
        // Ensure product base remains non-selectable
        canvas.getObjects().forEach(obj => {
            if (obj.id === 'product_base') {
                obj.selectable = false;
                obj.evented = false;
            }
        });
        canvas.renderAll();
    });
    updateUndoRedoButtons();
}

function undo() {
    if (toolState.historyIndex > 0) {
        toolState.historyIndex--;
        restoreState();
    }
}

function redo() {
    if (toolState.historyIndex < toolState.history.length - 1) {
        toolState.historyIndex++;
        restoreState();
    }
}

function updateUndoRedoButtons() {
    document.getElementById('undo-btn').disabled =
        toolState.historyIndex <= 0;
    document.getElementById('redo-btn').disabled =
        toolState.historyIndex >= toolState.history.length - 1;
}

// --- CORE DESIGN LOGIC ---

function loadProductImage(product, color) {
    if (!canvas) return;

    const imageUrl = productImages[product]?.[color];
    if (!imageUrl) {
        console.error(`No image for ${product} in color ${color}`);
        return;
    }

    // Save current design layers (NOT base image, NOT printArea)
    const designObjects = canvas.getObjects().filter(
        obj => obj.id !== 'product_base' && obj.id !== 'print_area'
    );

    // Clear canvas completely
    canvas.clear();

    // Load base image
    fabric.Image.fromURL(imageUrl, function(img) {
        img.scaleToWidth(canvas.getWidth() * 0.8);
        canvas.centerObject(img);

        img.selectable = false;
        img.evented = false;
        img.id = 'product_base';

        // 1) Add shirt base
        canvas.add(img);

        // 2) Ensure printArea exists and is above shirt
        if (!printArea) {
            createPrintArea();    // first time: create and add
        } else {
            canvas.add(printArea); // subsequent: re-add existing one
        }

        // 3) Re-add previous design objects (text/images) above guide
        designObjects.forEach(obj => canvas.add(obj));

        canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
}

function updateProduct(product, element) {
    if (toolState.currentProduct === product) return;

    document.querySelector('.item-btn.active')?.classList.remove('active');
    element.classList.add('active');

    toolState.currentProduct = product;
    loadProductImage(product, toolState.currentColor);
}

function updateColor(color, element) {
    document.querySelector('.color-swatch.active')?.classList.remove('active');
    element.classList.add('active');

    toolState.currentColor = color;
    loadProductImage(toolState.currentProduct, color);
}

function updateView(view, element) {
    if (toolState.currentView === view) return;

    document
        .querySelector(`.view-btn[data-view="${toolState.currentView}"]`)
        ?.classList.remove('active');

    element.classList.add('active');
    toolState.currentView = view;

    // TODO: point to back image variants when you have them
    console.log(`View changed to: ${view}`);
}

// --- IMAGE & TEXT HANDLERS ---

function handleImageUpload(e) {
    if (!canvas) return;

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        fabric.Image.fromURL(ev.target.result, function(img) {
            img.scaleToWidth(canvas.getWidth() * 0.2);
            canvas.centerObject(img);
            img.selectable = true;
            img.evented = true;
            img.id = Date.now().toString();

            canvas.add(img).renderAll();
            // saveState will be triggered by 'object:added' listener
        });
    };
    reader.readAsDataURL(file);
}

function handleAddText() {
    if (!canvas) return;

    const textInput = document.getElementById('add-text-input');
    const fontSelect = document.getElementById('font-family-select');

    const textValue = textInput.value.trim();
    if (!textValue) return;

    textInput.value = '';

    const textObject = new fabric.Text(textValue, {
        left: canvas.getWidth() / 4,
        top: canvas.getHeight() / 4,
        fontFamily: fontSelect.value,
        fill: '#000000',
        fontSize: 40,
        selectable: true,
        evented: true,
        id: Date.now().toString()
    });

    canvas.add(textObject).renderAll();
    // saveState via 'object:added'
}

function clearDesign() {
    if (!canvas) return;

    if (confirm('Clear all design elements (keep product image)?')) {
        canvas.getObjects().forEach(obj => {
            if (obj.id !== 'product_base' && obj.id !== 'print_area' && obj.id !== 'guide_rect') {
                canvas.remove(obj);
            }
        });
        canvas.renderAll();
        saveState();
    }
}

// --- EXPORT / QUOTE ---

function generateQuoteRequest() {
    if (!canvas) return;

    const finalImageURL = canvas.toDataURL({
        format: 'png',
        multiplier: 2 // higher resolution export
    });

    const quoteData = {
        product: toolState.currentProduct,
        color: toolState.currentColor,
        view: toolState.currentView,
        design_layers_json: JSON.stringify(canvas.toJSON()),
        final_design_image: finalImageURL,
    };

    console.log('Quote Request Data:', quoteData);
    alert('Design captured! Check the console (F12) to see the data we would send to the server.');
}
