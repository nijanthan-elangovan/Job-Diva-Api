document.addEventListener('DOMContentLoaded', () => {
    const sidebarNav = document.getElementById('sidebar-nav');
    const mainContent = document.getElementById('main-content');
    const welcomeMessage = document.getElementById('welcome-message');
    const endpointDetails = document.getElementById('endpoint-details');
    const searchInput = document.getElementById('search-input');

    let apiData = null;
    let allEndpoints = [];

    // Load data via fetch (requires local server)
    fetch('endpoints.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            apiData = data;
            processEndpoints(apiData);
            renderSidebar(allEndpoints);
        })
        .catch(error => {
            console.error('Error loading endpoints:', error);
            // Fallback to data.js if fetch fails (e.g. file protocol)
            if (window.endpointsData) {
                console.log('Falling back to data.js');
                apiData = window.endpointsData;
                processEndpoints(apiData);
                renderSidebar(allEndpoints);
            } else {
                sidebarNav.innerHTML = `<p class="text-danger p-3">Error: Could not load data. <br> ${error.message} <br> Please run a local server.</p>`;
            }
        });

    function processEndpoints(data) {
        const paths = data.paths || {};

        Object.keys(paths).forEach(path => {
            const methods = paths[path];
            Object.keys(methods).forEach(method => {
                const details = methods[method];
                allEndpoints.push({
                    path,
                    method,
                    ...details,
                    id: `${method}-${path}`
                });
            });
        });
    }

    function renderSidebar(endpoints, shouldExpand = false) {
        sidebarNav.innerHTML = '';

        // Group endpoints by tag
        const grouped = endpoints.reduce((acc, endpoint) => {
            const tag = (endpoint.tags && endpoint.tags[0]) || 'Other';
            if (!acc[tag]) acc[tag] = [];
            acc[tag].push(endpoint);
            return acc;
        }, {});

        // Sort tags
        const sortedTags = Object.keys(grouped).sort();

        sortedTags.forEach((tag, index) => {
            const groupEndpoints = grouped[tag];
            const collapseId = `collapse-${index}`;
            const headingId = `heading-${index}`;
            const isExpanded = shouldExpand; // Expand all if searching

            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';

            accordionItem.innerHTML = `
                <h2 class="accordion-header" id="${headingId}">
                    <button class="accordion-button ${isExpanded ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isExpanded}" aria-controls="${collapseId}">
                        ${tag}
                        <span class="badge bg-secondary ms-2 rounded-pill" style="font-size: 0.7em;">${groupEndpoints.length}</span>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse ${isExpanded ? 'show' : ''}" aria-labelledby="${headingId}" data-bs-parent="#sidebar-nav">
                    <div class="accordion-body p-0">
                        <!-- Links will be added here -->
                    </div>
                </div>
            `;

            const accordionBody = accordionItem.querySelector('.accordion-body');

            groupEndpoints.forEach(endpoint => {
                const link = document.createElement('div');
                link.className = 'nav-link-custom';
                link.innerHTML = `
                    <div class="d-flex align-items-center overflow-hidden">
                        <span class="badge method-${endpoint.method.toLowerCase()} me-2">${endpoint.method.toUpperCase()}</span>
                        <span class="text-truncate" title="${endpoint.summary || endpoint.path}">${endpoint.summary || endpoint.path}</span>
                    </div>
                `;

                link.addEventListener('click', () => {
                    // Remove active class from all links
                    document.querySelectorAll('.nav-link-custom').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    displayEndpointDetails(endpoint);
                });

                accordionBody.appendChild(link);
            });

            sidebarNav.appendChild(accordionItem);
        });
    }

    function displayEndpointDetails(endpoint) {
        welcomeMessage.classList.add('d-none');
        endpointDetails.classList.remove('d-none');

        // Construct parameters HTML
        let paramsHtml = '';
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            paramsHtml = `
                <div class="card mb-4 border-secondary bg-transparent">
                    <div class="card-header border-secondary bg-body-tertiary">
                        <h5 class="card-title mb-0">Parameters</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-dark table-hover mb-0" style="--bs-table-bg: transparent;">
                                <thead>
                                    <tr>
                                        <th class="text-secondary" style="width: 30%;">Name</th>
                                        <th class="text-secondary" style="width: 10%;">In</th>
                                        <th class="text-secondary" style="width: 15%;">Type</th>
                                        <th class="text-secondary" style="width: 45%;">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${endpoint.parameters.map(param => `
                                        <tr>
                                            <td>
                                                <span class="param-name">${param.name}</span>
                                                ${param.required ? '<span class="text-danger ms-1">*</span>' : ''}
                                                <div class="text-secondary small mt-1">${param.description || ''}</div>
                                            </td>
                                            <td class="text-secondary">${param.in}</td>
                                            <td><span class="param-type">${param.type || (param.schema ? 'object' : 'string')}</span></td>
                                            <td>
                                                <input type="text" 
                                                    class="form-control form-control-sm bg-dark text-light border-secondary param-input" 
                                                    data-name="${param.name}" 
                                                    data-in="${param.in}" 
                                                    placeholder="${param.required ? 'Required' : 'Optional'}"
                                                >
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        // Construct responses HTML
        let responsesHtml = '';
        if (endpoint.responses) {
            responsesHtml = `
                <div class="card mb-4 border-secondary bg-transparent">
                    <div class="card-header border-secondary bg-body-tertiary">
                        <h5 class="card-title mb-0">Responses</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-dark table-hover mb-0" style="--bs-table-bg: transparent;">
                                <thead>
                                    <tr>
                                        <th class="text-secondary" style="width: 15%;">Code</th>
                                        <th class="text-secondary">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.keys(endpoint.responses).map(code => `
                                        <tr>
                                            <td><span class="badge ${code.startsWith('2') ? 'text-success bg-success-subtle' : 'text-secondary bg-secondary-subtle'}">${code}</span></td>
                                            <td class="text-secondary">${endpoint.responses[code].description}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        endpointDetails.innerHTML = `
            <div class="mb-4 pb-3 border-bottom border-secondary">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <span class="badge method-${endpoint.method.toLowerCase()} fs-6 px-3 py-2">${endpoint.method.toUpperCase()}</span>
                    <h2 class="h3 mb-0">${endpoint.summary || endpoint.operationId}</h2>
                </div>
                <div class="bg-body-tertiary rounded p-2 px-3 d-inline-block mb-3 font-monospace text-secondary border border-secondary">
                    ${endpoint.path}
                </div>
                <p class="lead text-secondary fs-6">${endpoint.description || ''}</p>
            </div>
            ${paramsHtml}
            <div class="mb-4">
                <button id="test-btn" class="btn btn-primary d-flex align-items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test Endpoint
                </button>
            </div>
            <div id="response-container" class="card border-secondary bg-transparent d-none mb-4">
                <div class="card-header border-secondary bg-body-tertiary d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">Response</h5>
                    <span id="response-status"></span>
                </div>
                <div class="card-body">
                    <pre><code id="response-code"></code></pre>
                </div>
            </div>
            ${responsesHtml}
        `;

        document.getElementById('test-btn').addEventListener('click', () => testEndpoint(endpoint));
    }

    async function testEndpoint(endpoint) {
        const token = document.getElementById('api-token').value;
        const responseContainer = document.getElementById('response-container');
        const responseCode = document.getElementById('response-code');
        const responseStatus = document.getElementById('response-status');

        responseContainer.classList.remove('d-none');
        responseCode.textContent = 'Loading...';
        responseStatus.innerHTML = '';

        try {
            let url = 'https://api.jobdiva.com' + endpoint.path; // Base URL assumption
            const options = {
                method: endpoint.method.toUpperCase(),
                headers: {
                    'Accept': 'application/json'
                }
            };

            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            // Collect parameters
            const inputs = document.querySelectorAll('.param-input');
            const queryParams = new URLSearchParams();
            let bodyData = {};

            inputs.forEach(input => {
                const value = input.value.trim();
                if (!value) return;

                const name = input.dataset.name;
                const paramIn = input.dataset.in;

                if (paramIn === 'query') {
                    queryParams.append(name, value);
                } else if (paramIn === 'path') {
                    url = url.replace(`{${name}}`, encodeURIComponent(value));
                } else if (paramIn === 'header') {
                    options.headers[name] = value;
                } else if (paramIn === 'body') {
                    try {
                        bodyData = JSON.parse(value);
                    } catch (e) {
                        bodyData = value; // Fallback to string if not valid JSON
                    }
                }
            });

            if (Object.keys(bodyData).length > 0) {
                options.body = JSON.stringify(bodyData);
                options.headers['Content-Type'] = 'application/json';
            }

            const queryString = queryParams.toString();
            if (queryString) {
                url += '?' + queryString;
            }

            const response = await fetch(url, options);
            const data = await response.text();

            try {
                const json = JSON.parse(data);
                responseCode.textContent = JSON.stringify(json, null, 2);
            } catch (e) {
                responseCode.textContent = data;
            }

            // Update status
            responseStatus.innerHTML = `<span class="badge ${response.ok ? 'bg-success' : 'bg-danger'}">${response.status} ${response.statusText}</span>`;

        } catch (error) {
            responseCode.textContent = 'Error: ' + error.message + '\n\nNote: CORS might be blocking this request if running locally.';
            responseStatus.innerHTML = '<span class="badge bg-danger">Error</span>';
        }
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (!term) {
            renderSidebar(allEndpoints);
            return;
        }

        const filtered = allEndpoints.filter(ep => {
            const inPath = ep.path.toLowerCase().includes(term);
            const inSummary = (ep.summary || '').toLowerCase().includes(term);
            const inTags = (ep.tags || []).some(t => t.toLowerCase().includes(term));
            const inParams = (ep.parameters || []).some(p => p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term));
            const inResponses = ep.responses && Object.values(ep.responses).some(r => r.description.toLowerCase().includes(term));

            return inPath || inSummary || inTags || inParams || inResponses;
        });

        renderSidebar(filtered, true); // Pass true to expand all groups
    });

    // Export functionality
    document.getElementById('export-btn').addEventListener('click', () => {
        const definitions = apiData ? apiData.definitions : {};
        const md = generateAIMarkdown(allEndpoints, definitions);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jobdiva-api-context.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function generateAIMarkdown(endpoints, definitions) {
        let md = '# Job Diva API Documentation\n\n';
        md += '> Generated for AI Context. Contains optimized summaries of all endpoints.\n\n';

        // Group by tags for better organization
        const grouped = endpoints.reduce((acc, endpoint) => {
            const tag = (endpoint.tags && endpoint.tags[0]) || 'Other';
            if (!acc[tag]) acc[tag] = [];
            acc[tag].push(endpoint);
            return acc;
        }, {});

        // Helper to recursively format schema
        function formatSchema(schema, definitions, indentLevel = 0) {
            const indent = '  '.repeat(indentLevel);
            let output = '';

            if (!schema) return 'any';

            if (schema.$ref) {
                const refName = schema.$ref.split('/').pop();
                const def = definitions && definitions[refName];
                if (def) {
                    // Prevent infinite recursion by limiting depth
                    if (indentLevel < 4) {
                        return formatSchema(def, definitions, indentLevel + 1);
                    }
                    return refName;
                }
                return refName;
            }

            if (schema.type === 'array') {
                return `Array<${formatSchema(schema.items, definitions, indentLevel + 1)}>`;
            }

            if (schema.type === 'object' && schema.properties) {
                let str = '{\n';
                Object.entries(schema.properties).forEach(([key, prop]) => {
                    str += `${indent}  ${key}: ${formatSchema(prop, definitions, indentLevel + 1)}\n`;
                });
                str += `${indent}}`;
                return str;
            }

            return schema.type || 'any';
        }

        Object.keys(grouped).sort().forEach(tag => {
            md += `## ${tag}\n\n`;
            grouped[tag].forEach(ep => {
                md += `### ${ep.method.toUpperCase()} ${ep.path}\n`;
                if (ep.summary) md += `**Summary**: ${ep.summary}\n`;
                if (ep.description) md += `**Description**: ${ep.description}\n`;

                if (ep.parameters && ep.parameters.length > 0) {
                    md += `\n**Parameters**:\n`;
                    ep.parameters.forEach(p => {
                        let typeDesc = p.type || (p.schema ? 'object' : 'string');
                        if (p.schema) {
                            typeDesc = formatSchema(p.schema, definitions);
                        }
                        md += `- \`${p.name}\` (${p.in}, ${typeDesc}): ${p.description || ''} ${p.required ? '(Required)' : ''}\n`;
                    });
                }

                if (ep.responses) {
                    md += `\n**Responses**:\n`;
                    Object.entries(ep.responses).forEach(([code, resp]) => {
                        let respDesc = resp.description;
                        if (resp.schema) {
                            respDesc += `\nSchema: \`\`\`\n${formatSchema(resp.schema, definitions)}\n\`\`\``;
                        }
                        md += `- \`${code}\`: ${respDesc}\n`;
                    });
                }
                md += `\n---\n\n`;
            });
        });

        return md;
    }
});
