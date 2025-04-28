document.addEventListener('DOMContentLoaded', function() {
  // Get toggle button
  const toggleButton = document.getElementById('toggle-game');

  // Add click event listener
  toggleButton.addEventListener('click', function() {
    // Send message to content script to toggle game visibility
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {action: 'toggleGame'}
      );
    });
  });
}); 