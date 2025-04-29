document.addEventListener('DOMContentLoaded', function() {
  // Get toggle element
  const toggleElement = document.getElementById('toggle-game');
  
  // Initialize toggle state from localStorage or default to true
  let isActive = localStorage.getItem('gameVisibility') !== 'false';
  
  // Set initial toggle state in UI
  updateToggleUI();
  
  // Check with content script for current visibility state
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: 'getGameState'},
        function(response) {
          if (response && response.isVisible !== undefined) {
            isActive = response.isVisible;
            localStorage.setItem('gameVisibility', isActive);
            updateToggleUI();
          }
        }
      );
    }
  });

  // Add click event listener
  toggleElement.addEventListener('click', function() {
    // Toggle active class
    isActive = !isActive;
    
    // Save state to localStorage
    localStorage.setItem('gameVisibility', isActive);
    
    // Update UI
    updateToggleUI();
    
    // Send message to content script to toggle game visibility
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {action: 'toggleGame', visibility: isActive}
        );
      }
    });
  });
  
  // Helper function to update UI based on state
  function updateToggleUI() {
    if (isActive) {
      toggleElement.classList.add('active');
    } else {
      toggleElement.classList.remove('active');
    }
  }
}); 