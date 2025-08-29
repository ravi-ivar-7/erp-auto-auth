chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: 'src/window/index.html',
        type: 'popup',
        width: 480,
        height: 600
    });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openTab') {
        chrome.tabs.create({
            url: request.url,
            active: true
        });
        sendResponse({ success: true });
    }
    return true;
});
