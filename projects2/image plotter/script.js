window.addEventListener("load", () => {
  const img = document.getElementById("sourceImage");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Wait until the image is fully loaded
  img.addEventListener("load", () => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    // Match canvas size to the image
    canvas.width = width;
    canvas.height = height;

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Get all pixels as a flat array [R,G,B,A, R,G,B,A, ...]
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data; // Uint8ClampedArray

    // Loop through every pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Index in the data array:
        const index = (y * width + x) * 4;

        const r = data[index + 0];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        // Here you have:
        // x, y = pixel coordinates
        // r,g,b,a = colour

        // Example: compute simple brightness
        const brightness = (r + g + b) / 3;

        // For demo, log some pixels:
        if (x % 50 === 0 && y % 50 === 0) {
          console.log(`Pixel at (${x}, ${y}) -> RGBA(${r},${g},${b},${a}), brightness=${brightness}`);
        }
      }
    }

    console.log("Done scanning all pixels.");
  });
});
