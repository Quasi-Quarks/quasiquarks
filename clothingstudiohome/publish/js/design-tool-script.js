// 📝 CORE DESIGN TOOL LOGIC (Now using Fabric.js)

// 📝 CORE DESIGN TOOL LOGIC (Fabric.js Initialization Placeholder)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Design Studio is initializing...');
    
    // Check if the canvas element exists
    const canvasElement = document.getElementById('design-canvas');
    if (canvasElement) {
        // Initialize the Fabric.js canvas
        const canvas = new fabric.Canvas('design-canvas', {
            backgroundColor: '#f9f9f9',
            selection: true,
        });

        console.log('Fabric.js canvas initialized.');
        
        // Placeholder function: Add a simple rectangle to confirm canvas works
        const rect = new fabric.Rect({
            left: 100,
            top: 100,
            fill: 'red',
            width: 50,
            height: 50,
            angle: 45
        });
        // canvas.add(rect).renderAll();

    } else {
        console.error('Canvas element #design-canvas not found.');
    }

    // Placeholder for all interaction handlers (e.g., button clicks, file uploads)
    document.getElementById('get-quote-btn')?.addEventListener('click', () => {
        console.log('Get Quote clicked - Logic to export design goes here.');
    });

});

// 📝 CORE DESIGN TOOL LOGIC (Fabric.js Initialization Placeholder)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Design Studio is initializing...');
    
    // Check if the canvas element exists
    const canvasElement = document.getElementById('design-canvas');
    if (canvasElement) {
        // Initialize the Fabric.js canvas
        const canvas = new fabric.Canvas('design-canvas', {
            backgroundColor: '#f9f9f9',
            selection: true,
        });

        console.log('Fabric.js canvas initialized.');
        
        // Placeholder function: Add a simple rectangle to confirm canvas works
        const rect = new fabric.Rect({
            left: 100,
            top: 100,
            fill: 'red',
            width: 50,
            height: 50,
            angle: 45
        });
        // canvas.add(rect).renderAll();

    } else {
        console.error('Canvas element #design-canvas not found.');
    }

    // Placeholder for all interaction handlers (e.g., button clicks, file uploads)
    document.getElementById('get-quote-btn')?.addEventListener('click', () => {
        console.log('Get Quote clicked - Logic to export design goes here.');
    });

});

// --- GLOBAL STATE AND CONFIGURATION ---
const productImages = {
    // NOTE: Ensure these paths exist in your 'images/' folder!
    tshirt: {
        white: 'images/tshirt_front_white.png',
        black: 'images/tshirt_front_black.png',
        navy: 'images/tshirt_front_navy.png',
        red: 'images/tshirt_front_red.png',
    },
    hoodie: {
        white: 'images/hoodie_front_white.png', 
        black: 'images/hoodie_front_black.png',
        // Add navy/red hoodie images here
    },
    // Add paths for 'mug', 'hat', etc. here
};

const toolState = {
    currentProduct: 'tshirt',
    currentColor: 'white',
    currentView: 'front',
    // History array for undo/redo
    history: [],
    historyIndex: -1
};

// Initialize the Fabric.js canvas object globally
let canvas; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize the Fabric Canvas
    canvas = new fabric.Canvas('design-canvas', {
        backgroundColor: '#f9f9f9',
        selection: false,
    });
    
    // Load the initial product 
    loadProductImage(toolState.currentProduct, toolState.currentColor);
    
    // Initial save state for undo/redo
    saveState();

    // --- EVENT LISTENERS ---
    
    // 2. Product Selection
    document.querySelectorAll('.item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const product = e.target.dataset.product;
            updateProduct(product, e.target);
        });
    });

    // 3. Color Selection
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            updateColor(color, e.target);
        });
    });

    // 4. View Toggle (Front/Back)
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            updateView(view, e.target);
        });
    });
    
    // 5. Image Upload Handler
    document.getElementById('upload-image').addEventListener('change', handleImageUpload);
    
    // 6. Add Text Handler
    document.getElementById('add-text-btn').addEventListener('click', handleAddText);

    // 7. Undo/Redo/Clear buttons
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('clear-btn').addEventListener('click', clearDesign);

    // Add event listener to save state whenever an object is modified
    canvas.on('object:modified', saveState); 
    canvas.on('object:added', saveState);

});


// --- HISTORY & UTILITY FUNCTIONS ---

function saveState() {
    // Slice off any future history if a change was made
    toolState.history = toolState.history.slice(0, toolState.historyIndex + 1);
    
    // Save the current canvas state as JSON
    const json = canvas.toJSON();
    toolState.history.push(json);
    toolState.historyIndex++;
    
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    document.getElementById('undo-btn').disabled = toolState.historyIndex <= 0;
    document.getElementById('redo-btn').disabled = toolState.historyIndex >= toolState.history.length - 1;
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

function restoreState() {
    const json = toolState.history[toolState.historyIndex];
    
    // Fabric.js: loadFromJSON is essential for undo/redo
    canvas.loadFromJSON(json, canvas.renderAll.bind(canvas), function(o, object) {
        // Re-establish non-selectable properties on the product base layer
        if (object.id === 'product_base') {
            object.selectable = false;
            object.evented = false;
        }
    });
    updateUndoRedoButtons();
}

function clearDesign() {
    if (confirm("Are you sure you want to clear all design elements?")) {
        // Clear all objects except the base product image
        canvas.getObjects().forEach(obj => {
            if (obj.id !== 'product_base') {
                canvas.remove(obj);
            }
        });
        canvas.renderAll();
        saveState(); // Save the cleared state
    }
}


// --- CORE DESIGN FUNCTIONS ---

function loadProductImage(product, color) {
    const imageUrl = productImages[product] ? productImages[product][color] : null;

    if (!imageUrl) {
        console.error(`No image path found for ${product} in color ${color}. Ensure image files exist.`);
        return;
    }

    // 1. Temporarily store design layers
    const designObjects = canvas.getObjects().filter(obj => obj.id !== 'product_base');
    
    // 2. Clear the canvas completely
    canvas.clear();

    // 3. Load the new base image
    fabric.Image.fromURL(imageUrl, function(img) {
        img.scaleToWidth(canvas.getWidth() * 0.8); 
        canvas.centerObject(img);
        
        // --- CRUCIAL SETTINGS FOR A BASE PRODUCT IMAGE ---
        img.selectable = false; 
        img.evented = false;    
        img.id = 'product_base'; 
        
        canvas.add(img);
        
        // 4. Re-add design layers on top
        designObjects.forEach(obj => {
            canvas.add(obj);
        });
        
        canvas.renderAll();
        // Since this is a product/color change, we don't save to history here, 
        // but rely on existing design history.
    }, { crossOrigin: 'anonymous' }); 
}

function updateProduct(product, element) {
    if (toolState.currentProduct === product) return;

    document.querySelector(`.item-btn.active`).classList.remove('active');
    element.classList.add('active');
    
    toolState.currentProduct = product;
    loadProductImage(product, toolState.currentColor);
}

function updateColor(color, element) {
    document.querySelector(`.color-swatch.active`)?.classList.remove('active');
    element.classList.add('active');

    toolState.currentColor = color;
    loadProductImage(toolState.currentProduct, color);
}

function updateView(view, element) {
    if (toolState.currentView === view) return;

    document.querySelector(`.view-btn[data-view="${toolState.currentView}"]`).classList.remove('active');
    element.classList.add('active');
    
    toolState.currentView = view;
    // TODO: Need to implement view loading here (e.g., load 'tshirt_back_white.png')
    console.log(`View changed to: ${view}`);
    // You would call loadProductImage with the appropriate back/front image path
}


function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            fabric.Image.fromURL(imageUrl, function(img) {
                img.scaleToWidth(canvas.getWidth() * 0.2); 
                canvas.centerObject(img);
                img.selectable = true;
                img.evented = true; 
                img.id = Date.now().toString(); // Assign a unique ID to design objects
                
                canvas.add(img).renderAll();
                // State saved by the 'object:added' event listener
            });
        };
        reader.readAsDataURL(file);
    }
}

function handleAddText() {
    const textInput = document.getElementById('add-text-input');
    const textValue = textInput.value.trim();
    const fontFamily = document.getElementById('font-family-select').value;

    if (textValue) {
        textInput.value = ''; 
        
        const textObject = new fabric.Text(textValue, {
            left: canvas.getWidth() / 4,
            top: canvas.getHeight() / 4,
            fontFamily: fontFamily,
            fill: '#000000', 
            fontSize: 40,
            selectable: true,
            evented: true,
            id: Date.now().toString()
        });
        canvas.add(textObject).renderAll();
        // State saved by the 'object:added' event listener
    }
}


function generateQuoteRequest() {
    // 1. Get the final canvas design as an image data URL
    const finalImageURL = canvas.toDataURL({ 
        format: 'png', 
        multiplier: 2 // Export at higher resolution
    }); 
    
    // 2. Compile all design details
    const quoteData = {
        product: toolState.currentProduct,
        color: toolState.currentColor,
        view: toolState.currentView,
        design_layers_json: JSON.stringify(canvas.toJSON()), 
        final_design_image: finalImageURL, 
        // TODO: Add fields for quantity, name, email, etc.
    };

    console.log('Quote Request Data:', quoteData);
    alert("Your design has been captured! We would now send this data to a server to generate a quote. Check the console for the data structure.");
}
