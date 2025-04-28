// Wait for page to load
document.addEventListener('DOMContentLoaded', initGameFrame);
// Also try on window load in case DOMContentLoaded already fired
window.addEventListener('load', initGameFrame);

// Track if frame has been created
let frameCreated = false;
let gameContainer = null;

function initGameFrame() {
  // Only create the frame once
  if (frameCreated) return;
  
  // Create container for our game frame
  gameContainer = document.createElement('div');
  gameContainer.id = 'rosebud-game-container';
  gameContainer.className = 'rosebud-game-container';
  
  // Create iframe for game
  const gameFrame = document.createElement('iframe');
  gameFrame.src = 'https://rosebud.ai/p/6b51a6f1-288b-4579-9b81-068d49c81b1f';
  gameFrame.frameBorder = '0';
  gameFrame.allowFullscreen = true;
  gameFrame.allow = 'autoplay; fullscreen *; geolocation; microphone; camera; midi; monetization; xr-spatial-tracking; gamepad; gyroscope; accelerometer; xr; cross-origin-isolated';
  gameFrame.sandbox = 'allow-forms allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-top-navigation';
  
  // Create controls for the game container
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'rosebud-controls';
  
  const dragHandle = document.createElement('div');
  dragHandle.className = 'rosebud-drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'Drag to move';
  
  const minimizeButton = document.createElement('button');
  minimizeButton.className = 'rosebud-minimize-btn';
  minimizeButton.textContent = '−';
  minimizeButton.title = 'Minimize game';
  
  const resizeButton = document.createElement('button');
  resizeButton.className = 'rosebud-resize-btn';
  resizeButton.textContent = '⤡';
  resizeButton.title = 'Toggle size';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'rosebud-close-btn';
  closeButton.textContent = '×';
  closeButton.title = 'Close game';
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'rosebud-resize-handle';
  resizeHandle.title = 'Drag to resize';
  
  // Add elements to DOM
  controlsDiv.appendChild(dragHandle);
  controlsDiv.appendChild(minimizeButton);
  controlsDiv.appendChild(resizeButton);
  controlsDiv.appendChild(closeButton);
  gameContainer.appendChild(controlsDiv);
  gameContainer.appendChild(gameFrame);
  gameContainer.appendChild(resizeHandle);
  document.body.appendChild(gameContainer);
  
  // Mark as created
  frameCreated = true;
  
  // Setup drag functionality
  setupDrag(gameContainer, dragHandle);
  
  // Setup resize functionality
  setupResize(gameContainer, resizeHandle);
  
  // Setup button functionality
  setupButtons(gameContainer, minimizeButton, resizeButton, closeButton);
}

// Make the container draggable
function setupDrag(container, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function on mouse move
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    container.style.top = (container.offsetTop - pos2) + "px";
    container.style.left = (container.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Make the container resizable
function setupResize(container, handle) {
  let startX, startY, startWidth, startHeight;
  
  handle.addEventListener('mousedown', initResize, false);
  
  function initResize(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(container).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
    document.addEventListener('mousemove', resizeElement, false);
    document.addEventListener('mouseup', stopResize, false);
  }
  
  function resizeElement(e) {
    // Calculate new size
    const newWidth = startWidth + e.clientX - startX;
    const newHeight = startHeight + e.clientY - startY;
    
    // Enforce minimum size
    const minWidth = 250;
    const minHeight = 200;
    
    // Set new size if it's above minimum
    if (newWidth > minWidth) {
      container.style.width = newWidth + 'px';
    }
    
    if (newHeight > minHeight) {
      container.style.height = newHeight + 'px';
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', resizeElement, false);
    document.removeEventListener('mouseup', stopResize, false);
  }
}

// Setup minimize and close buttons
function setupButtons(container, minimizeBtn, resizeBtn, closeBtn) {
  let minimized = false;
  let enlarged = false;
  let originalWidth = '300px';
  let originalHeight = '300px';
  
  minimizeBtn.addEventListener('click', () => {
    toggleMinimize(container, minimizeBtn);
  });
  
  resizeBtn.addEventListener('click', () => {
    if (enlarged) {
      // Return to original size
      container.style.width = originalWidth;
      container.style.height = originalHeight;
      resizeBtn.textContent = '⤡';
      resizeBtn.title = 'Enlarge game';
    } else {
      // Store original size if not minimized
      if (!minimized) {
        originalWidth = container.style.width || '300px';
        originalHeight = container.style.height || '300px';
      }
      // Enlarge to preset large size
      container.style.width = '600px';
      container.style.height = '450px';
      resizeBtn.textContent = '⊙';
      resizeBtn.title = 'Restore size';
      
      // If was minimized, un-minimize it
      if (minimized) {
        toggleMinimize(container, minimizeBtn);
      }
    }
    enlarged = !enlarged;
  });
  
  closeBtn.addEventListener('click', () => {
    container.style.display = 'none';
  });
}

// Toggle minimize state
function toggleMinimize(container, minimizeBtn) {
  const iframe = container.querySelector('iframe');
  const isMinimized = iframe.style.display === 'none';
  
  if (isMinimized) {
    // Expand
    container.style.height = container.dataset.prevHeight || '300px';
    iframe.style.display = 'block';
    minimizeBtn.textContent = '−';
  } else {
    // Store current height before minimizing
    container.dataset.prevHeight = container.style.height;
    // Minimize
    container.style.height = '30px';
    iframe.style.display = 'none';
    minimizeBtn.textContent = '+';
  }
}

// Toggle game visibility
function toggleGameVisibility() {
  if (!frameCreated) {
    initGameFrame();
  } else if (gameContainer) {
    if (gameContainer.style.display === 'none') {
      gameContainer.style.display = 'flex';
    } else {
      gameContainer.style.display = 'none';
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'toggleGame') {
    toggleGameVisibility();
  }
});

// Call init when page has loaded
if (document.readyState === 'complete') {
  initGameFrame();
} 