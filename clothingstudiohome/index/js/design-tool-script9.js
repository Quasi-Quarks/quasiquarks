/************************************************************
 * DESIGN TOOL - DEV VERSION (with guide rectangle)
 * Capitol Design Studio
 ************************************************************/

/* ---------------------------------------------------------
   PRODUCT IMAGE MAP (matches your images_data folder)
--------------------------------------------------------- */

const productImages = {
    tshirt: {
        front: {
            white: '../images_data/background_shirt_front_white.avif',
            black: '../images_data/background_shirt_front_black.avif',
            navy:  '../images_data/background_shirt_front_blue.avif',
            red:   '../images_data/background_shirt_front_red.avif',
        },
        back: {
            white: '../images_data/background_shirt_back_white.avif',
            black: '../images_data/background_shirt_back_black.avif',
            navy:  '../images_data/background_shirt_back_blue.avif',
            red:   '../images_data/background_shirt_back_red.avif',
        }
    },

    hoodie: {
        front: {
            white: '../images_data/white_hoodie.jpeg',
            black: '../images_data/black_hoodie.jpeg',
            navy:  '../images_data/blue_hoodie.jpeg',
            red:   '../images_data/red_hoodie.jpeg',
        },
        back: {
            white: '../images_data/white_hoodie.jpeg',
            black: '../images_data/black_hoodie.jpeg',
            navy:  '../images_data/blue_hoodie.jpeg',
            red:   '../images_data/red_hoodie.jpeg',
        }
    },

    mug: {
        white: '../images_data/white_mug.jpg',
        black: '../images_data/black_mug.jpg',
        navy:  '../images_data/blue_mug.jpg',
        red:   '../images_data/red_mug.jpg',
    },

    hat: {
        white: '../images_data/white_hat.jpeg',
        black: '../images_data/black_hat.jpeg',
        navy:  '../images_data/blue_hat.jpeg',
        red:   '../images_data/red_hat.jpeg',
    }
};

/* ---------------------------------------------------------
   Tool State
--------------------------------------------------------- */

const toolState = {
    currentProduct: 'tshirt',
    currentColor: 'white',
    currentView: 'front',
    history: [],
    historyIndex: -1
};

let canvas;
let printArea;

/* ---------------------------------------------------------
   Helper: choose correct image based on product/color/view
--------------------------------------------------------- */

function getProductImageUrl(product, color, view) {
    const p = productImages[product];
    if (!p) return null;

    // T-shirt / Hoodie (front/back support)
    if (p[view] && p[view][color]) return p[view][color];

    // Mug / Hat (single-view)
    if (p[color]) return p[color];

    console.warn(`No image for ${product} ${color} ${view}`);
    return null;
}

/* ---------------------------------------------------------
   DEV TOOLS — Guide rectangle (draggable & resizable)
--------------------------------------------------------- */

function addGuideRectangle() {
    if (!canvas) return;

    const guide = new fabric.Rect({
        left: 150,
        top: 150,
        width: 250,
        height: 300,
        fill: 'rgba(0, 128, 255, 0.1)',
        stroke: 'rgba(0, 128, 255, 0.9)',
        strokeWidth: 2,
        hasControls: true,
        selectable: true,
        id: 'guide_rect'
    });

    canvas.add(guide);
    canvas.setActiveObject(guide);
    canvas.renderAll();

    console.log("%cGuide rectangle added. Drag & resize then run getGuideValues().",
        "color: green; font-weight: bold;");
}

function getGuideValues() {
    if (!canvas) return;

    const guide = canvas.getObjects().find(o => o.id === 'guide_rect');
    if (!guide) {
        console.log("Guide not found.");
        return;
    }

    const b = guide.getBoundingRect(true);

    console.log("=== PRINT AREA VALUES ===");
    console.log("left:", b.left);
    console.log("top:", b.top);
    console.log("width:", b.width);
    console.log("height:", b.height);
}

window.addGuideRectangle = addGuideRectangle;
window.getGuideValues = getGuideValues;

/* ---------------------------------------------------------
   Initialise
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    canvas = new fabric.Canvas("design-canvas", {
        selection: true,
    });

    // Initial product image
    loadProductImage(toolState.currentProduct, toolState.currentColor);

    // UI
    setupUI();

    // Clamp objects inside print area
    canvas.on("object:moving", e => keepObjectInPrintArea(e.target));
    canvas.on("object:scaling", e => keepObjectInPrintArea(e.target));

    // History
    canvas.on("object:added", e => {
        if (e.target.id !== "product_base") saveState();
    });

    canvas.on("object:modified", saveState);

    saveState();
});

/* ---------------------------------------------------------
   Create fixed print area (viewport)
   (Values were measured with the dev guide)
--------------------------------------------------------- */

function createPrintArea() {
    printArea = new fabric.Rect({
        left: 186,
        top: 86,
        width: 232,
        height: 441,
        fill: "rgba(0,0,0,0)",
        stroke: "rgba(0,150,255,0.6)",
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        id: "print_area"
    });

    canvas.add(printArea);
    canvas.renderAll();
}

/* ---------------------------------------------------------
   Keep objects inside the print area
--------------------------------------------------------- */

function keepObjectInPrintArea(obj) {
    if (!canvas || !printArea) return;
    if (["product_base", "print_area", "guide_rect"].includes(obj.id)) return;

    let left = obj.left;
    let top  = obj.top;

    const w = obj.getScaledWidth();
    const h = obj.getScaledHeight();

    const paL = printArea.left;
    const paT = printArea.top;
    const paR = printArea.left + printArea.width;
    const paB = printArea.top + printArea.height;

    if (left < paL) left = paL;
    if (left + w > paR) left = paR - w;

    if (top < paT) top = paT;
    if (top + h > paB) top = paB - h;

    obj.left = left;
    obj.top  = top;
    obj.setCoords();
    canvas.renderAll();
}

/* ---------------------------------------------------------
   Load the Shirt/Hoodie/Mug/Hat image
   (UPDATED: scale to fit canvas, no cropping)
--------------------------------------------------------- */

function loadProductImage(product, color) {
    if (!canvas) return;

    const url = getProductImageUrl(product, color, toolState.currentView);
    if (!url) {
        console.error(`No image url for ${product}, ${color}, ${toolState.currentView}`);
        return;
    }

    // Save design layers (not base image, not printArea)
    const designObjects = canvas.getObjects().filter(
        o => o.id !== "product_base" && o.id !== "print_area"
    );

    canvas.clear();

    fabric.Image.fromURL(url, img => {
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();

        // --- NEW: scale to fit both width & height (no cropping) ---
        const maxW = cw * 0.9;   // 90% of canvas width
        const maxH = ch * 0.9;   // 90% of canvas height

        const scale = Math.min(
            maxW / img.width,
            maxH / img.height
        );

        img.scale(scale);
        canvas.centerObject(img);

        img.selectable = false;
        img.evented = false;
        img.id = "product_base";

        // 1) Add base image
        canvas.add(img);

        // 2) Ensure printArea exists and is above base
        if (!printArea) {
            createPrintArea();
        } else {
            canvas.add(printArea);
        }

        // 3) Re-add previous design objects (text/images) above guide
        designObjects.forEach(o => canvas.add(o));

        canvas.renderAll();
    });
}

/* ---------------------------------------------------------
   UI handlers
--------------------------------------------------------- */

function setupUI() {
    // Product buttons
    document.querySelectorAll(".item-btn").forEach(btn =>
        btn.addEventListener("click", () => {
            toolState.currentProduct = btn.dataset.product;
            toolState.currentView = "front";

            document.querySelectorAll(".item-btn")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            loadProductImage(toolState.currentProduct, toolState.currentColor);
        })
    );

    // Color swatches
    document.querySelectorAll(".color-swatch").forEach(btn =>
        btn.addEventListener("click", () => {
            toolState.currentColor = btn.dataset.color;

            document.querySelectorAll(".color-swatch")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            loadProductImage(toolState.currentProduct, toolState.currentColor);
        })
    );

    // View buttons (front/back)
    document.querySelectorAll(".view-btn").forEach(btn =>
        btn.addEventListener("click", () => {
            toolState.currentView = btn.dataset.view;

            document.querySelectorAll(".view-btn")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            loadProductImage(toolState.currentProduct, toolState.currentColor);
        })
    );

    // Upload input
    const upload = document.getElementById("upload-image");
    if (upload) {
        upload.addEventListener("change", handleImageUpload);
    }

    // Add text
    const addTextBtn = document.getElementById("add-text-btn");
    if (addTextBtn) {
        addTextBtn.addEventListener("click", handleAddText);
    }

    // Undo / Redo / Clear
    document.getElementById("undo-btn").addEventListener("click", undo);
    document.getElementById("redo-btn").addEventListener("click", redo);
    document.getElementById("clear-btn").addEventListener("click", clearDesign);

    // Quote
    const quoteBtn = document.getElementById("get-quote-btn");
    if (quoteBtn) {
        quoteBtn.addEventListener("click", generateQuoteRequest);
    }
}

/* ---------------------------------------------------------
   Image Upload
--------------------------------------------------------- */

function handleImageUpload(e) {
    if (!canvas) return;

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        fabric.Image.fromURL(ev.target.result, img => {
            img.scaleToWidth(canvas.getWidth() * 0.25);
            canvas.centerObject(img);
            img.selectable = true;
            img.id = Date.now().toString();
            canvas.add(img);
        });
    };
    reader.readAsDataURL(file);
}

/* ---------------------------------------------------------
   Add Text
--------------------------------------------------------- */

function handleAddText() {
    if (!canvas) return;

    const input = document.getElementById("add-text-input");
    const fontSelect = document.getElementById("font-family-select");

    const value = input.value.trim();
    if (!value) return;

    const textObj = new fabric.Text(value, {
        left: 250,
        top: 150,
        fontFamily: fontSelect.value,
        fontSize: 40,
        fill: "#000",
        id: Date.now().toString()
    });

    canvas.add(textObj);
    input.value = "";
}

/* ---------------------------------------------------------
   Clear Design
--------------------------------------------------------- */

function clearDesign() {
    if (!canvas) return;
    if (!confirm("Clear all design elements?")) return;

    canvas.getObjects().forEach(obj => {
        if (obj.id !== "product_base" && obj.id !== "print_area" && obj.id !== "guide_rect") {
            canvas.remove(obj);
        }
    });

    canvas.renderAll();
}

/* ---------------------------------------------------------
   Undo / Redo / History
--------------------------------------------------------- */

function saveState() {
    if (!canvas) return;

    const json = canvas.toJSON();
    toolState.history = toolState.history.slice(0, toolState.historyIndex + 1);
    toolState.history.push(json);
    toolState.historyIndex++;

    updateUndoRedoButtons();
}

function restoreState() {
    if (!canvas) return;

    const json = toolState.history[toolState.historyIndex];
    canvas.loadFromJSON(json, () => {
        canvas.renderAll();
    });

    updateUndoRedoButtons();
}

function undo() {
    if (toolState.historyIndex <= 0) return;
    toolState.historyIndex--;
    restoreState();
}

function redo() {
    if (toolState.historyIndex >= toolState.history.length - 1) return;
    toolState.historyIndex++;
    restoreState();
}

function updateUndoRedoButtons() {
    document.getElementById("undo-btn").disabled =
        toolState.historyIndex <= 0;

    document.getElementById("redo-btn").disabled =
        toolState.historyIndex >= toolState.history.length - 1;
}

/* ---------------------------------------------------------
   Final Export / Quote Data
--------------------------------------------------------- */

function generateQuoteRequest() {
    if (!canvas) return;

    const finalImageURL = canvas.toDataURL({
        format: "png",
        multiplier: 2
    });

    const data = {
        product: toolState.currentProduct,
        color: toolState.currentColor,
        view: toolState.currentView,
        layers: canvas.toJSON(),
        final: finalImageURL
    };

    console.log("QUOTE DATA:", data);

    alert("Design captured — open the console (F12) to see the full data object.");
}
