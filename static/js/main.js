// Global functions for image operations
function prettyPrintJSON(obj) {
    try {
        const jsonString = JSON.stringify(obj, null, 2);
        return jsonString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'text-gray-200';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'text-blue-400'; // key
                    } else {
                        cls = 'text-green-400'; // string
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'text-yellow-400'; // boolean
                } else if (/null/.test(match)) {
                    cls = 'text-red-400'; // null
                } else if (/^-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?$/.test(match)) {
                    cls = 'text-purple-400'; // number
                }
                return '<span class="' + cls + '">' + match + '</span>';
            })
            .replace(/\n/g, '<br>')
            .replace(/\s{2}/g, '&nbsp;&nbsp;');
    } catch (error) {
        console.error('Error formatting JSON:', error);
        return '<span class="text-red-500">Error formatting JSON data</span>';
    }
}

async function deleteImage(imageId, isArchived = false) {
    try {
        const response = await fetch('/delete_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_id: imageId })
        });
        
        const data = await response.json();
        if (response.ok) {
            // Refresh appropriate section
            if (isArchived) {
                window.loadArchivedCaptures();
            } else {
                window.loadRecentCaptures();
            }
            showNotification('Image deleted successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to delete image');
        }
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Error deleting image:', error);
    }
}

// Global function for deleting responses
async function deleteResponse(responseId) {
    try {
        const response = await fetch('/delete_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ response_id: responseId })
        });
        
        const data = await response.json();
        if (response.ok) {
            // Refresh responses
            window.loadRecentResponses();
            showNotification('Response deleted successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to delete response');
        }
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Error deleting response:', error);
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white z-50`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const responseArea = document.getElementById('responseArea');
    const capturesGrid = document.getElementById('capturesGrid');
    const archivedGrid = document.getElementById('archivedGrid');
    const responsesArea = document.getElementById('responsesArea');
    const serverLogsArea = document.getElementById('serverLogsArea');

    // Initialize JSON editor options
    const jsonEditorOptions = {
        mode: 'view',
        theme: 'ace/theme/monokai',
        navigationBar: false,
        statusBar: false,
        mainMenuBar: false,
        search: false
    };

    // Make functions globally accessible
    window.loadRecentCaptures = loadRecentCaptures;
    window.loadArchivedCaptures = loadArchivedCaptures;
    window.loadServerLogs = loadServerLogs;

    // Initialize drag-and-drop
    initializeDragAndDrop();

    // Load recent captures and responses on page load
    loadRecentCaptures();
    loadRecentResponses();
    loadArchivedCaptures();
    loadServerLogs();

    // Set up auto-refresh for server logs every 5 seconds
    setInterval(loadServerLogs, 5000);

    function initializeDragAndDrop() {
        const dropZones = document.querySelectorAll('.drop-zone');
        const draggableImages = document.querySelectorAll('.draggable-image');

        draggableImages.forEach(img => {
            img.addEventListener('dragstart', handleDragStart);
            img.addEventListener('dragend', handleDragEnd);
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    }

    function handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.imageId);
        e.dataTransfer.setData('is_archived', e.target.dataset.isArchived || 'false');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    async function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const imageId = e.dataTransfer.getData('text/plain');
        const isArchived = e.dataTransfer.getData('is_archived') === 'true';
        const targetZone = e.currentTarget.dataset.zone;
        
        if (!imageId) {
            console.error('No image ID found in drag data');
            showNotification('Error: Could not move image', 'error');
            return;
        }
        
        try {
            const response = await fetch('/move_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_id: imageId,
                    action: targetZone === 'archived' ? 'archive' : 'unarchive',
                    is_archived: isArchived
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                // Refresh both sections
                loadRecentCaptures();
                loadArchivedCaptures();
                showNotification('Image moved successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to move image');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function loadRecentCaptures() {
        try {
            const response = await fetch('/recent_captures');
            const captures = await response.json();
            
            const container = document.getElementById('capturesGrid');
            container.innerHTML = '';
            
            if (captures.length === 0) {
                container.innerHTML = '<p class="text-gray-400 col-span-full text-center">No recent captures</p>';
                return;
            }
            
            captures.forEach(capture => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'relative group';
                
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${capture.image_data}`;
                img.alt = 'Screenshot';
                img.className = 'draggable-image w-full h-32 object-cover rounded-lg shadow-lg cursor-move';
                img.draggable = true;
                img.dataset.imageId = capture._id;
                
                const actions = document.createElement('div');
                actions.className = 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity';
                actions.innerHTML = `
                    <button onclick="deleteImage('${capture._id}')" class="bg-red-600 text-white p-2 rounded hover:bg-red-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                `;
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(actions);
                container.appendChild(imgWrapper);
            });
            
            initializeDragAndDrop();
        } catch (error) {
            console.error('Error loading recent captures:', error);
            const container = document.getElementById('capturesGrid');
            container.innerHTML = '<p class="text-red-500 col-span-full text-center">Error loading captures</p>';
        }
    }

    async function loadRecentResponses() {
        try {
            const response = await fetch('/recent_responses');
            const responses = await response.json();
            
            // Sort responses by timestamp, newest first
            responses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            responsesArea.innerHTML = responses.map(response => `
                <div class="bg-dark-700 rounded-lg p-4 mb-4 group relative">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <button onclick="toggleResponse('${response._id}')" class="text-gray-400 hover:text-white">
                                <svg class="w-5 h-5 transform transition-transform" id="chevron-${response._id}" 
                                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <div class="text-sm text-gray-400">
                                ${(() => {
                                    const date = new Date(response.timestamp);
                                    date.setHours(date.getHours() + 8); // Add 8 hours for PST
                                    return date.toLocaleString('en-US', { 
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true
                                    });
                                })()}
                            </div>
                        </div>
                        <button onclick="deleteResponse('${response._id}')" 
                                class="bg-red-600 text-white p-2 rounded hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                    <div id="content-${response._id}" class="hidden prose max-w-none">
                        <div class="mb-2">
                            <span class="text-gray-400">Message:</span>
                            <span class="text-gray-200 ml-2">${response.message || 'No message'}</span>
                        </div>
                        <div class="mb-4">
                            <span class="text-gray-400">Response:</span>
                            <div class="text-gray-200 whitespace-pre-wrap mt-2">${response.response_data?.choices?.[0]?.message?.content || 'No response content'}</div>
                        </div>
                        <div>
                            <span class="text-gray-400">Details:</span>
                            <div id="jsoneditor-${response._id}" class="h-64 mt-2 bg-dark-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add toggle function to window scope
            window.toggleResponse = function(responseId) {
                const content = document.getElementById(`content-${responseId}`);
                const chevron = document.getElementById(`chevron-${responseId}`);
                
                if (content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                    chevron.style.transform = 'rotate(180deg)';
                    
                    // Initialize JSON display when content is shown
                    const response = responses.find(r => r._id === responseId);
                    const container = document.getElementById(`jsoneditor-${responseId}`);
                    if (container) {
                        try {
                            // Use our custom pretty printer with dark mode styling and modern scrollbars
                            container.innerHTML = `<div class="h-full overflow-auto 
                                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 
                                [&::-webkit-scrollbar-thumb]:bg-dark-600 [&::-webkit-scrollbar-thumb]:rounded-full 
                                [&::-webkit-scrollbar-track]:bg-dark-800 [&::-webkit-scrollbar-track]:rounded-full
                                [&::-webkit-scrollbar-corner]:bg-dark-800">
                                <pre class="text-sm font-mono bg-black p-4 min-w-max">${prettyPrintJSON(response.response_data || {})}</pre>
                            </div>`;
                        } catch (err) {
                            console.error('Error displaying JSON:', err);
                            container.innerHTML = `<pre class="text-red-500 p-2">Error displaying JSON: ${err.message}</pre>`;
                        }
                    }
                } else {
                    content.classList.add('hidden');
                    chevron.style.transform = 'rotate(0deg)';
                }
            };

            // Make loadRecentResponses globally accessible
            window.loadRecentResponses = loadRecentResponses;

        } catch (error) {
            console.error('Error loading responses:', error);
            responsesArea.innerHTML = '<p class="text-red-500">Error loading responses</p>';
        }
    }

    async function loadArchivedCaptures() {
        try {
            const response = await fetch('/archived_captures');
            const captures = await response.json();
            
            const container = document.getElementById('archivedGrid');
            container.innerHTML = '';
            
            if (captures.length === 0) {
                container.innerHTML = '<p class="text-gray-400 col-span-full text-center">No archived captures</p>';
                return;
            }
            
            captures.forEach(capture => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'relative group';
                
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${capture.image_data}`;
                img.alt = 'Archived Screenshot';
                img.className = 'draggable-image w-full h-32 object-cover rounded-lg shadow-lg cursor-move';
                img.draggable = true;
                img.dataset.imageId = capture._id;
                img.dataset.isArchived = 'true';  // Mark as archived
                
                const actions = document.createElement('div');
                actions.className = 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity';
                actions.innerHTML = `
                    <button onclick="deleteImage('${capture._id}', true)" class="bg-red-600 text-white p-2 rounded hover:bg-red-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                `;
                
                imgWrapper.appendChild(img);
                imgWrapper.appendChild(actions);
                container.appendChild(imgWrapper);
            });
            
            // Reinitialize drag and drop after loading archived captures
            initializeDragAndDrop();
        } catch (error) {
            console.error('Error loading archived captures:', error);
            const container = document.getElementById('archivedGrid');
            container.innerHTML = '<p class="text-red-500 col-span-full text-center">Error loading archived captures</p>';
        }
    }

    async function loadServerLogs() {
        try {
            const response = await fetch('/server_logs');
            const logs = await response.text();
            
            if (!serverLogsArea) return;
            
            serverLogsArea.innerHTML = `
                <div class="bg-dark-800 rounded-lg shadow-lg overflow-hidden">
                    <div class="border-b border-dark-700 bg-dark-700 px-4 py-3 flex justify-between items-center">
                        <h3 class="text-lg font-medium text-gray-100">Server Logs</h3>
                        <button onclick="loadServerLogs()" class="text-gray-400 hover:text-white">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <div class="relative">
                        <pre class="text-sm font-mono text-gray-300 p-4 h-64 overflow-auto whitespace-pre bg-black
                            [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 
                            [&::-webkit-scrollbar-thumb]:bg-dark-600 [&::-webkit-scrollbar-thumb]:rounded-full 
                            [&::-webkit-scrollbar-track]:bg-dark-800 [&::-webkit-scrollbar-track]:rounded-full
                            [&::-webkit-scrollbar-corner]:bg-dark-800">${logs}</pre>
                    </div>
                </div>`;
        } catch (error) {
            if (serverLogsArea) {
                serverLogsArea.innerHTML = `
                    <div class="bg-red-900 border-l-4 border-red-500 p-4">
                        <p class="text-sm text-red-200">Error loading server logs: ${error.message}</p>
                    </div>`;
            }
            console.error('Error loading server logs:', error);
        }
    }

    captureBtn.addEventListener('click', async () => {
        try {
            captureBtn.disabled = true;
            captureBtn.innerHTML = 'Capturing...';
            
            const response = await fetch('/capture', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (response.ok) {
                responseArea.innerHTML = `
                    <div class="bg-green-900 border-l-4 border-green-500 p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-green-200">${data.message}</p>
                            </div>
                        </div>
                    </div>`;
                // Reload captures after new capture
                loadRecentCaptures();
                loadArchivedCaptures();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Error capturing image: ' + error.message);
        } finally {
            captureBtn.disabled = false;
            captureBtn.innerHTML = 'Take Screenshot';
        }
    });

    sendBtn.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (!message) {
            responseArea.innerHTML = `
                <div class="bg-yellow-900 border-l-4 border-yellow-500 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-200">Please enter a message</p>
                        </div>
                    </div>
                </div>`;
            return;
        }

        try {
            sendBtn.disabled = true;
            sendBtn.innerHTML = 'Processing...';
            responseArea.innerHTML = `
                <div class="animate-pulse flex space-x-4 items-center bg-dark-800 p-4 rounded-lg">
                    <div class="rounded-full bg-dark-600 h-10 w-10"></div>
                    <div class="flex-1 space-y-6 py-1">
                        <div class="h-2 bg-dark-600 rounded"></div>
                        <div class="space-y-3">
                            <div class="grid grid-cols-3 gap-4">
                                <div class="h-2 bg-dark-600 rounded col-span-2"></div>
                                <div class="h-2 bg-dark-600 rounded col-span-1"></div>
                            </div>
                            <div class="h-2 bg-dark-600 rounded"></div>
                        </div>
                    </div>
                </div>`;

            const response = await fetch('/send_request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            
            if (response.ok) {
                // Create a container for the JSON editor
                responseArea.innerHTML = `
                    <div class="bg-dark-800 rounded-lg shadow overflow-hidden">
                        <div class="border-b border-dark-700 bg-dark-700 px-4 py-5 sm:px-6">
                            <h3 class="text-lg font-medium text-gray-100">Response</h3>
                        </div>
                        <div class="px-4 py-5 sm:p-6">
                            <div id="currentResponseEditor" class="h-96"></div>
                        </div>
                    </div>`;

                // Display JSON for current response
                const container = document.getElementById('currentResponseEditor');
                try {
                    container.innerHTML = `<div class="h-full overflow-auto 
                        [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 
                        [&::-webkit-scrollbar-thumb]:bg-dark-600 [&::-webkit-scrollbar-thumb]:rounded-full 
                        [&::-webkit-scrollbar-track]:bg-dark-800 [&::-webkit-scrollbar-track]:rounded-full
                        [&::-webkit-scrollbar-corner]:bg-dark-800">
                        <pre class="text-sm font-mono bg-black p-4 min-w-max">${prettyPrintJSON(data.response)}</pre>
                    </div>`;
                } catch (error) {
                    console.error('Error displaying JSON:', error);
                    container.innerHTML = `<pre class="text-red-500 p-2">Error displaying JSON: ${error.message}</pre>`;
                }

                // Reload responses after new response
                loadRecentResponses();
            } else {
                showError(data.error);
            }
        } catch (error) {
            showError('Error sending request: ' + error.message);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Send Request';
        }
    });
}); 