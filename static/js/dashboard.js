document.addEventListener('DOMContentLoaded', () => {
    // Initialize all dashboard components
    initializeDashboard();
    
    // Refresh data every 30 seconds
    setInterval(initializeDashboard, 30000);
});

async function initializeDashboard() {
    await Promise.all([
        loadStats(),
        loadRoutes(),
        loadSystemInfo(),
        loadServerLogs()
    ]);
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Update stats grid
        const statsGrid = document.getElementById('statsGrid');
        const { total_stats, hourly_stats } = data;
        
        statsGrid.innerHTML = `
            <div class="bg-dark-800 rounded-lg shadow p-6">
                <dt class="text-sm font-medium text-gray-400 truncate">Total Captures</dt>
                <dd class="mt-1 text-3xl font-semibold text-indigo-400">${total_stats.captures}</dd>
            </div>
            <div class="bg-dark-800 rounded-lg shadow p-6">
                <dt class="text-sm font-medium text-gray-400 truncate">Total Responses</dt>
                <dd class="mt-1 text-3xl font-semibold text-green-400">${total_stats.responses}</dd>
            </div>
            <div class="bg-dark-800 rounded-lg shadow p-6">
                <dt class="text-sm font-medium text-gray-400 truncate">Today's Captures</dt>
                <dd class="mt-1 text-3xl font-semibold text-indigo-400">${total_stats.today_captures}</dd>
            </div>
            <div class="bg-dark-800 rounded-lg shadow p-6">
                <dt class="text-sm font-medium text-gray-400 truncate">Today's Responses</dt>
                <dd class="mt-1 text-3xl font-semibold text-green-400">${total_stats.today_responses}</dd>
            </div>
        `;

        // Update activity chart
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: hourly_stats.map(stat => stat.hour).reverse(),
                datasets: [
                    {
                        label: 'Captures',
                        data: hourly_stats.map(stat => stat.captures).reverse(),
                        borderColor: '#818cf8',
                        backgroundColor: '#818cf820',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Responses',
                        data: hourly_stats.map(stat => stat.responses).reverse(),
                        borderColor: '#34d399',
                        backgroundColor: '#34d39920',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#e5e7eb'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false,
                            color: '#374151'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                }
            }
        });

        // Update storage chart
        const storageCtx = document.getElementById('storageChart').getContext('2d');
        new Chart(storageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Captures', 'Responses'],
                datasets: [{
                    data: [
                        total_stats.storage_usage.captures,
                        total_stats.storage_usage.responses
                    ],
                    backgroundColor: ['#818cf8', '#34d399'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#e5e7eb'
                        }
                    }
                },
                cutout: '70%'
            }
        });

    } catch (error) {
        console.error('Error loading stats:', error);
        statsGrid.innerHTML = `
            <div class="col-span-full bg-red-900 border-l-4 border-red-500 p-4">
                <div class="flex">
                    <div class="ml-3">
                        <p class="text-sm text-red-200">Error loading stats: ${error.message}</p>
                    </div>
                </div>
            </div>`;
    }
}

async function loadRoutes() {
    try {
        const response = await fetch('/api/routes');
        const routes = await response.json();
        
        const apiRoutes = document.getElementById('apiRoutes');
        apiRoutes.innerHTML = routes.map(route => `
            <div class="bg-dark-700 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-medium text-gray-200">${route.name}</h4>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${
                        route.type === 'GET' ? 'bg-blue-900 text-blue-200' :
                        route.type === 'POST' ? 'bg-green-900 text-green-200' :
                        route.type === 'PUT' ? 'bg-yellow-900 text-yellow-200' :
                        route.type === 'DELETE' ? 'bg-red-900 text-red-200' :
                        'bg-gray-900 text-gray-200'
                    }">${route.type}</span>
                </div>
                <div class="text-sm font-mono bg-dark-900 p-2 rounded mb-2 text-gray-300">${route.path}</div>
                <div class="text-sm text-gray-400">${route.doc}</div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading routes:', error);
        apiRoutes.innerHTML = `
            <div class="bg-red-900 border-l-4 border-red-500 p-4">
                <div class="flex">
                    <div class="ml-3">
                        <p class="text-sm text-red-200">Error loading routes: ${error.message}</p>
                    </div>
                </div>
            </div>`;
    }
}

async function loadSystemInfo() {
    try {
        const response = await fetch('/api/system');
        const info = await response.json();
        
        const systemInfo = document.getElementById('systemInfo');
        systemInfo.innerHTML = `
            <div class="space-y-6">
                <!-- MongoDB Statistics Section -->
                <div>
                    <h4 class="text-sm font-medium text-gray-200 mb-3">MongoDB Statistics</h4>
                    <div class="bg-dark-700 rounded-lg divide-y divide-dark-600">
                        <!-- Recent Captures -->
                        <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt class="text-sm font-medium text-gray-400">Recent Captures</dt>
                            <dd class="mt-1 text-sm text-gray-300 sm:mt-0 sm:col-span-2">${info.mongodb.recent_captures}</dd>
                        </div>
                        <!-- Archived Captures -->
                        <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt class="text-sm font-medium text-gray-400">Archived Captures</dt>
                            <dd class="mt-1 text-sm text-gray-300 sm:mt-0 sm:col-span-2">${info.mongodb.archived_captures}</dd>
                        </div>
                        <!-- Recent Responses -->
                        <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                            <dt class="text-sm font-medium text-gray-400">Recent Responses</dt>
                            <dd class="mt-1 text-sm text-gray-300 sm:mt-0 sm:col-span-2">${info.mongodb.recent_responses}</dd>
                        </div>
                    </div>
                </div>

                <!-- Folders Section -->
                <div>
                    <h4 class="text-sm font-medium text-gray-200 mb-3">Folders</h4>
                    <div class="bg-dark-700 rounded-lg divide-y divide-dark-600">
                        ${Object.entries(info.folders).map(([key, value]) => `
                            <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt class="text-sm font-medium text-gray-400">${key}</dt>
                                <dd class="mt-1 text-sm text-gray-300 sm:mt-0 sm:col-span-2 font-mono">${value}</dd>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Server Section -->
                <div>
                    <h4 class="text-sm font-medium text-gray-200 mb-3">Server</h4>
                    <div class="bg-dark-700 rounded-lg divide-y divide-dark-600">
                        ${Object.entries(info.server).map(([key, value]) => `
                            <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt class="text-sm font-medium text-gray-400">${key}</dt>
                                <dd class="mt-1 text-sm text-gray-300 sm:mt-0 sm:col-span-2">${value}</dd>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading system info:', error);
        systemInfo.innerHTML = `
            <div class="bg-red-900 border-l-4 border-red-500 p-4">
                <div class="flex">
                    <div class="ml-3">
                        <p class="text-sm text-red-200">Error loading system info: ${error.message}</p>
                    </div>
                </div>
            </div>`;
    }
}

async function loadServerLogs() {
    try {
        const response = await fetch('/api/logs');
        const logs = await response.text();
        
        const logsArea = document.getElementById('serverLogsArea');
        if (!logsArea) return;

        logsArea.innerHTML = `
            <div class="bg-dark-700 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-200">Server Logs</h3>
                    <span class="text-sm text-gray-400">Auto-refreshes every 30s</span>
                </div>
                <pre class="bg-black text-gray-300 p-4 rounded-lg overflow-auto h-[400px] font-mono text-sm whitespace-pre-wrap">${logs}</pre>
            </div>
        `;
    } catch (error) {
        console.error('Error loading server logs:', error);
        if (logsArea) {
            logsArea.innerHTML = `
                <div class="bg-red-900 border-l-4 border-red-500 p-4">
                    <div class="flex">
                        <div class="ml-3">
                            <p class="text-sm text-red-200">Error loading server logs: ${error.message}</p>
                        </div>
                    </div>
                </div>`;
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 