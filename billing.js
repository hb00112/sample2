const barcodeMapping = {
    '8902625553430': {
        itemName: 'A202',
        color: 'CHIVIO',
        size: 'S'
    }
    // Add more barcode mappings as needed
};


let scannerMode = 'camera'; // 'camera' or 'manual'
let clickCount = 0;
let clickTimer = null;

function loadBillingOrders() {
    const billingOrdersContainer = document.getElementById('billingOrders');
    billingOrdersContainer.innerHTML = '';

    firebase.database().ref('billingOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const orderElement = createOrderElement(order, childSnapshot.key);
                    billingOrdersContainer.appendChild(orderElement);
                });
            } else {
                billingOrdersContainer.innerHTML = '<p>No orders waiting for billing</p>';
            }
        })
        .catch(error => {
            console.error("Error loading billing orders: ", error);
            billingOrdersContainer.innerHTML = '<p>Error loading billing orders</p>';
        });
}


function createOrderElement(order, orderId) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'order-container mb-4';
    
    orderDiv.innerHTML = `
        <div class="order-header d-flex justify-content-between align-items-center">
            <div>
                <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
                <p>Party Name: ${order.partyName || 'N/A'}</p>
                <p>Date: ${order.date || new Date().toLocaleDateString()}</p>
            </div>
            <div>
                <button class="btn btn-outline-primary barcode-scan-btn" data-order-id="${orderId}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                        <rect x="7" y="7" width="10" height="10"></rect>
                    </svg>
                </button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Order (Size/Qty)</th>
                        <th>Bill</th>
                    </tr>
                </thead>
                <tbody>
                    ${createOrderItemRows(order.items)}
                </tbody>
            </table>
        </div>
        <div class="order-actions mt-3">
            <button class="btn btn-success bill-btn" data-order-id="${orderId}">Bill</button>
        </div>
    `;

    return orderDiv;
}

// Create Modal HTML
const modalHTML = `
<div class="modal fade" id="barcodeScanModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Scan Barcode</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="scanner-container" class="mb-3">
                    <div id="camera-container" class="position-relative">
                        <video id="scanner-video" class="w-100" style="max-height: 300px; object-fit: cover;"></video>
                        <div id="scanning-overlay" class="position-absolute top-50 start-50 translate-middle text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Scanning...</span>
                            </div>
                            <div class="mt-2">Scanning...</div>
                        </div>
                    </div>
                    <div id="scan-input-container" class="mt-3" style="display: none;">
                        <input type="text" class="form-control" id="barcodeInput" 
                               placeholder="Type barcode here..." autofocus>
                    </div>
                </div>
                <div id="modalOrderContent"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-success modal-bill-btn">Bill Order</button>
            </div>
        </div>
    </div>
</div>`;

// Add modal to document body
document.body.insertAdjacentHTML('beforeend', modalHTML);

// Sound effects
const successBeep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+c3PSuZicYT6vi76N0O0hwr8vPp5hkSEhqoL/LqZ5yW1JjlrG+qLOSTVVfs8PGpKOMaW1qbI+svK/HqZVhUW6WyM7AoYxwWld4qNDatKaIPzE6bpe4xbOpiWNUY4+xwLWximNdaZexx7mxkHBgWGOKrcTOtJ2MSUlse6XG1LevkGldVmqRtMvGsaGVeGVfa4mru8G8sZ+Pa2BkiqXAy7mqk3VkZIGlwMq/qpuAaGBjhqG8xsC2qZdyZGmCoLvLxbOji25hb4egvMzFsqOQeGt2gpi3wr22rpaGdWlxe5O5ybXIsptqVGmYxL/449u0hlZqwqGMzLqhkXVwgZKuusG3rJyLfnhzaXeYrcXHuaaRbF1wo8bCuq6OX2aYw7+3q5FoZn6bt8a+s6KMdnR8kKW3vLWsno9/fXx8gZienZ6enp6en6CgoKGhoaKioqOjo6SkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpA==');
const errorBeep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn8=');

// Initialize modal
const barcodeModal = new bootstrap.Modal(document.getElementById('barcodeScanModal'));
let currentOrderId = null;

// Event listener for barcode scan button
document.addEventListener('click', function(e) {
    if (e.target.closest('.barcode-scan-btn')) {
        const orderId = e.target.closest('.barcode-scan-btn').getAttribute('data-order-id');
        openBarcodeModal(orderId);
    }
});

function toggleScannerMode() {
    if (scannerMode === 'camera') {
        scannerMode = 'manual';
        stopScanner();
        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('scan-input-container').style.display = 'block';
        document.getElementById('barcodeInput').focus();
    } else {
        scannerMode = 'camera';
        document.getElementById('camera-container').style.display = 'block';
        document.getElementById('scan-input-container').style.display = 'none';
        startScanner();
    }
}
async function startScanner() {
    try {
        // Check if BarcodeDetector is available
        if (!('BarcodeDetector' in window)) {
            alert('Barcode Scanner not supported by this browser. Switching to manual mode.');
            toggleScannerMode();
            return;
        }

        const video = document.getElementById('scanner-video');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        videoStream = stream;
        video.srcObject = stream;
        await video.play();

        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        });

        // Continuous scanning loop
        async function scanFrame() {
            if (scannerMode !== 'camera') return;

            try {
                const barcodes = await barcodeDetector.detect(video);
                for (const barcode of barcodes) {
                    await processScannedBarcode(barcode.rawValue);
                }
            } catch (error) {
                console.error('Scanning error:', error);
            }

            if (scannerMode === 'camera') {
                requestAnimationFrame(scanFrame);
            }
        }

        scanFrame();

    } catch (error) {
        console.error('Scanner initialization error:', error);
        alert('Unable to access camera. Switching to manual mode.');
        toggleScannerMode();
    }
}

// Function to stop the scanner
function stopScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

// Event listener for triple click to switch modes
document.getElementById('scanner-container').addEventListener('click', function() {
    clickCount++;
    
    if (clickCount === 1) {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 500); // Reset after 500ms if no more clicks
    }
    
    if (clickCount === 3) {
        clearTimeout(clickTimer);
        clickCount = 0;
        toggleScannerMode();
    }
});


let videoStream = null;

// Initialize the scanner
function initializeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        }
    );

    html5QrcodeScanner.render(async (decodedText) => {
        await processScannedBarcode(decodedText);
    });
}

// Function to handle barcode processing
async function processScannedBarcode(barcode) {
    try {
        // First check if the barcode exists in our mapping
        if (!barcodeMapping[barcode]) {
            console.log('Barcode not found in mapping');
            errorBeep.play();
            return;
        }

        const { itemName, color, size } = barcodeMapping[barcode];

        // Get current order data from Firebase
        const orderSnapshot = await firebase.database()
            .ref('billingOrders')
            .child(currentOrderId)
            .once('value');
            
        const order = orderSnapshot.val();
        
        if (!order || !order.items) {
            console.log('Order not found or no items');
            errorBeep.play();
            return;
        }

        // Find the matching item in the order
        const matchingItem = order.items.find(item => 
            item.name === itemName && 
            item.colors && 
            item.colors[color] && 
            item.colors[color][size] !== undefined
        );

        if (!matchingItem) {
            console.log('No matching item found in order');
            errorBeep.play();
            return;
        }

        // Find the quantity input in the modal
        const quantityInput = document.querySelector(
            `.bill-quantity[data-item="${itemName}"][data-color="${color}"][data-size="${size}"]`
        );

        if (!quantityInput) {
            console.log('Quantity input element not found');
            errorBeep.play();
            return;
        }

        const maxQuantity = matchingItem.colors[color][size];
        const currentQuantity = parseInt(quantityInput.value) || 0;

        if (currentQuantity < maxQuantity) {
            // Increment the quantity
            quantityInput.value = currentQuantity + 1;
            successBeep.play();
            
            // Optional: Add visual feedback
            quantityInput.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                quantityInput.style.backgroundColor = '';
            }, 500);
        } else {
            console.log('Maximum quantity reached');
            errorBeep.play();
            
            // Optional: Add visual feedback for max quantity
            quantityInput.style.backgroundColor = '#ffebee';
            setTimeout(() => {
                quantityInput.style.backgroundColor = '';
            }, 500);
        }

    } catch (error) {
        console.error('Error processing barcode:', error);
        errorBeep.play();
    }
}

// Event listener for long press to switch modes
let pressTimer;
document.getElementById('scanner-container').addEventListener('mousedown', function() {
    pressTimer = setTimeout(toggleScannerMode, 3000);
});

document.getElementById('scanner-container').addEventListener('mouseup', function() {
    clearTimeout(pressTimer);
});



// Function to open barcode modal
async function openBarcodeModal(orderId) {
    currentOrderId = orderId;
    
    // Get order data
    const orderSnapshot = await firebase.database().ref('billingOrders')
        .child(orderId)
        .once('value');
    const order = orderSnapshot.val();
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Reset the modal content
    const modalOrderContent = document.getElementById('modalOrderContent');
    modalOrderContent.innerHTML = `
        <div class="order-header">
            <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
            <p>Party Name: ${order.partyName || 'N/A'}</p>
            <p>Date: ${order.dateTime || new Date().toLocaleDateString()}</p>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Order (Size/Qty)</th>
                        <th>Bill</th>
                    </tr>
                </thead>
                <tbody>
                    ${createOrderItemRows(order.items, true)}
                </tbody>
            </table>
        </div>
    `;

    // Initialize scanner in camera mode by default
    scannerMode = 'camera';
    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('scan-input-container').style.display = 'none';
    
    // Show modal and initialize scanner
    barcodeModal.show();
    startScanner();

    // Setup manual input handler
    const barcodeInput = document.getElementById('barcodeInput');
    barcodeInput.value = '';
    barcodeInput.addEventListener('keyup', async function(e) {
        if (e.key === 'Enter') {
            const barcode = this.value.trim();
            this.value = '';
            await processScannedBarcode(barcode);
        }
    });
}

// Clean up when modal is closed
document.getElementById('barcodeScanModal').addEventListener('hidden.bs.modal', function () {
    stopScanner();
    clickCount = 0;
    if (clickTimer) {
        clearTimeout(clickTimer);
    }
});


function createOrderItemRows(items, isModal = false) {
    if (!items || !Array.isArray(items)) return '';
    
    return items.flatMap(item => {
        return Object.entries(item.colors || {}).flatMap(([color, sizes]) => {
            return Object.entries(sizes).map(([size, qty]) => `
                <tr>
                    <td>${item.name} (${color})</td>
                    <td>${size}/${qty}</td>
                    <td>
                        <div class="quantity-control">
                            <button class="btn btn-sm btn-outline-secondary decrease">-</button>
                            <input type="number" class="form-control form-control-sm mx-2 bill-quantity" 
                                   value="${isModal ? '0' : qty}" min="0" max="${qty}" 
                                   data-item="${item.name}" data-color="${color}" data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary increase">+</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        });
    }).join('');
}

// Barcode scanning handler
document.getElementById('barcodeInput').addEventListener('keyup', async function(e) {
    if (e.key === 'Enter') {
        const barcode = this.value.trim();
        this.value = ''; // Clear input
        
        if (!barcodeMapping[barcode]) {
            errorBeep.play();
            return;
        }
        
        const { itemName, color, size } = barcodeMapping[barcode];
        await processScannedItem(itemName, color, size);
    }
});

// Process scanned item
async function processScannedItem(itemName, color, size) {
    const orderSnapshot = await firebase.database().ref('billingOrders').child(currentOrderId).once('value');
    const order = orderSnapshot.val();
    
    // Find matching item in order
    const item = order.items.find(i => i.name === itemName);
    if (!item || !item.colors[color] || !item.colors[color][size]) {
        errorBeep.play();
        return;
    }
    
    // Find quantity input in modal
    const input = document.querySelector(`.bill-quantity[data-item="${itemName}"][data-color="${color}"][data-size="${size}"]`);
    if (!input) return;
    
    const maxQty = parseInt(item.colors[color][size]);
    const currentQty = parseInt(input.value);
    
    if (currentQty < maxQty) {
        input.value = currentQty + 1;
        successBeep.play();
        
        // Wait 2 seconds before enabling scanning again
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        errorBeep.play();
    }
}

// Handle modal bill button click
document.querySelector('.modal-bill-btn').addEventListener('click', function() {
    billOrder(currentOrderId);
    barcodeModal.hide();
});

// Event listeners for quantity controls in modal
document.getElementById('modalOrderContent').addEventListener('click', function(e) {
    if (e.target.classList.contains('decrease')) {
        const input = e.target.parentElement.querySelector('input');
        if (input.value > 0) input.value = parseInt(input.value) - 1;
    } else if (e.target.classList.contains('increase')) {
        const input = e.target.parentElement.querySelector('input');
        if (parseInt(input.value) < parseInt(input.max)) {
            input.value = parseInt(input.value) + 1;
        }
    }
});

// Event listeners for the quantity controls and buttons
document.getElementById('billingOrders').addEventListener('click', function(e) {
    if (e.target.classList.contains('decrease')) {
        const input = e.target.parentElement.querySelector('input');
        if (input.value > 0) input.value = parseInt(input.value) - 1;
    } else if (e.target.classList.contains('increase')) {
        const input = e.target.parentElement.querySelector('input');
        if (parseInt(input.value) < parseInt(input.max)) {
            input.value = parseInt(input.value) + 1;
        }
    } else if (e.target.classList.contains('bill-btn')) {
        const orderId = e.target.getAttribute('data-order-id');
        billOrder(orderId);
    }
});
// Function to update stock quantities after billing
// Add this function to stock.js to properly handle stock updates
// Enhanced billing system functions


// Helper function to merge billed items
function mergeOrderItems(existingItems, newItems) {
    const mergedItems = [...existingItems];

    newItems.forEach(newItem => {
        const existingItemIndex = mergedItems.findIndex(item =>
            item.name === newItem.name &&
            item.color === newItem.color &&
            item.size === newItem.size
        );

        if (existingItemIndex >= 0) {
            mergedItems[existingItemIndex].quantity += newItem.quantity;
        } else {
            mergedItems.push({ ...newItem });
        }
    });

    return mergedItems;
}

// Helper function to validate billing quantities
function validateBillingQuantity(quantity, maxQuantity) {
    const qty = parseInt(quantity);
    return qty > 0 && qty <= maxQuantity;
}

// Event listener for quantity input validation
function setupQuantityInputListeners() {
    document.querySelectorAll('.bill-quantity').forEach(input => {
        input.addEventListener('input', function(e) {
            const value = parseInt(this.value);
            const max = parseInt(this.getAttribute('max'));
            
            if (value < 0) this.value = 0;
            if (value > max) this.value = max;
        });
    });
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupQuantityInputListeners();
});
// Helper function to normalize order data

// Updated normalizeOrderData function to properly handle billedItems
async function billOrder(orderId) {
    try {
        const orderContainer = document.querySelector(`.order-container:has([data-order-id="${orderId}"])`);
        if (!orderContainer) {
            throw new Error("Order container not found");
        }

        // Get order details from Firebase first
        const orderSnapshot = await firebase.database().ref('billingOrders').child(orderId).once('value');
        const originalOrder = orderSnapshot.val();
        if (!originalOrder) {
            throw new Error("Order not found in database");
        }

        // Collect billed quantities with enhanced validation
        const billQuantities = {};
        const billedItems = [];
        let hasValidBilledItems = false;
        
        // Create a deep copy of original order items to track remaining quantities
        let remainingOrderItems = [];
        
        // Process each item in the order
        if (originalOrder.items && Array.isArray(originalOrder.items)) {
            remainingOrderItems = originalOrder.items.map(item => {
                const newItem = {
                    name: item.name,
                    colors: {}
                };

                if (item.colors) {
                    Object.entries(item.colors).forEach(([color, sizes]) => {
                        newItem.colors[color] = {};
                        Object.entries(sizes).forEach(([size, maxQty]) => {
                            // Find corresponding input in the DOM
                            const input = orderContainer.querySelector(
                                `.bill-quantity[data-item="${item.name}"][data-color="${color}"][data-size="${size}"]`
                            );
                            
                            const billedQty = input ? (parseInt(input.value) || 0) : 0;
                            if (billedQty > 0 && billedQty <= maxQty) {
                                hasValidBilledItems = true;
                                
                                // Initialize nested objects if they don't exist
                                if (!billQuantities[item.name]) billQuantities[item.name] = {};
                                if (!billQuantities[item.name][color]) billQuantities[item.name][color] = {};
                                
                                // Store the billed quantity
                                billQuantities[item.name][color][size] = billedQty;
                                
                                // Add to billedItems array
                                billedItems.push({
                                    name: item.name,
                                    color: color,
                                    size: size,
                                    quantity: billedQty
                                });

                                // Calculate remaining quantity
                                const remainingQty = maxQty - billedQty;
                                if (remainingQty > 0) {
                                    newItem.colors[color][size] = remainingQty;
                                }
                            } else {
                                // If not billed, keep original quantity
                                newItem.colors[color][size] = maxQty;
                            }
                        });
                        
                        // Remove color if no sizes have remaining quantity
                        if (Object.keys(newItem.colors[color]).length === 0) {
                            delete newItem.colors[color];
                        }
                    });
                }

                // Only return item if it has colors with remaining quantities
                if (Object.keys(newItem.colors).length > 0) {
                    return newItem;
                }
                return null;
            }).filter(item => item !== null); // Remove null items
        }

        if (!hasValidBilledItems) {
            throw new Error("Please enter valid billing quantities for at least one item");
        }

        // Start Firebase operations
        const db = firebase.database();

        // Create new sent order object
        const sentOrder = {
            orderNumber: originalOrder.orderNumber,
            partyName: originalOrder.partyName,
            date: originalOrder.dateTime,
            billingDate: new Date().toISOString(),
            billedItems: billedItems,
            status: 'completed'
        };

        // 1. Update stock quantities
        await updateStockQuantities(billQuantities);

        // 2. Add to sent orders
        const sentOrdersRef = db.ref('sentOrders');
        const newSentOrderRef = sentOrdersRef.push();
        await newSentOrderRef.set(sentOrder);

        // 3. Update or remove billing order based on remaining items
        if (remainingOrderItems.length > 0) {
            // Create updated order with remaining quantities
            const updatedOrder = {
                ...originalOrder,
                items: remainingOrderItems
            };
            await db.ref('billingOrders').child(orderId).set(updatedOrder);
        } else {
            // Remove order if fully billed
            await db.ref('billingOrders').child(orderId).remove();
        }

        // 4. Refresh displays
        await Promise.all([
            loadStockItemsFromFirebase(),
            loadBillingOrders(),
            loadSentOrders()
        ]);

        // Show success message
        const successMessage = `Order ${sentOrder.orderNumber} ${remainingOrderItems.length > 0 ? 'partially' : 'fully'} billed successfully!`;
        alert(successMessage);

    } catch (error) {
        console.error("Error in billOrder:", error);
        alert(`Error processing order: ${error.message}`);
    }
}

function normalizeOrderData(order, orderId) {
    if (!order) return null;
    
    // Ensure billedItems is properly formatted
    let billedItems = [];
    if (order.billedItems && Array.isArray(order.billedItems)) {
        billedItems = order.billedItems.map(item => ({
            name: item.name || '',
            color: item.color || '',
            size: item.size || '',
            quantity: parseInt(item.quantity) || 0
        })).filter(item => item.quantity > 0);
    }
    
    return {
        id: orderId,
        orderNumber: order.orderNumber || 'N/A',
        partyName: order.partyName || 'N/A',
        date: order.date || null,
        billingDate: order.billingDate || null,
        billedItems: billedItems,
        status: order.status || 'completed',
        deliveryStatus: order.deliveryStatus || 'Delivered' // Add delivery status with default value
    };
}




// Helper function to update delivery status in Firebase
function updateDeliveryStatus(orderId, newStatus) {
    return firebase.database().ref(`sentOrders/${orderId}`).update({
        deliveryStatus: newStatus
    }).catch(error => {
        console.error('Error updating delivery status:', error);
        throw error;
    });
}

function mergeOrders(orders) {
    const orderMap = new Map();
    
    orders.forEach(order => {
        if (!order) return;
        
        // Create key using orderNumber, partyName, and billingDate
        const billingDate = order.billingDate ? new Date(order.billingDate).toDateString() : '';
        const key = `${order.orderNumber}_${order.partyName}_${billingDate}`;
        
        if (!orderMap.has(key)) {
            orderMap.set(key, { ...order });
        } else {
            const existingOrder = orderMap.get(key);
            
            // Merge billedItems arrays
            const combinedItems = [...existingOrder.billedItems];
            
            order.billedItems.forEach(newItem => {
                const existingItemIndex = combinedItems.findIndex(item => 
                    item.name === newItem.name && 
                    item.color === newItem.color && 
                    item.size === newItem.size
                );
                
                if (existingItemIndex >= 0) {
                    combinedItems[existingItemIndex].quantity += newItem.quantity;
                } else {
                    combinedItems.push({ ...newItem });
                }
            });
            
            existingOrder.billedItems = combinedItems;
        }
    });
    
    return Array.from(orderMap.values());
}

async function updateStockQuantities(billedItems) {
    const db = firebase.database();
    const stockRef = db.ref('stock');
    
    try {
        const snapshot = await stockRef.once('value');
        let currentStock = snapshot.val() || [];
        
        if (!Array.isArray(currentStock)) {
            throw new Error("Invalid stock data format");
        }

        // Create a map for faster lookups
        const stockMap = new Map(
            currentStock.map(item => [
                `${item['item name']}_${item.color}_${item.size}`,
                item
            ])
        );

        // Update quantities
        Object.entries(billedItems).forEach(([itemName, colors]) => {
            Object.entries(colors).forEach(([color, sizes]) => {
                Object.entries(sizes).forEach(([size, billedQty]) => {
                    const key = `${itemName}_${color}_${size}`;
                    const stockItem = stockMap.get(key);
                    
                    if (stockItem) {
                        const currentQty = parseFloat(stockItem.quantity);
                        const newQty = Math.max(0, currentQty - billedQty);
                        stockItem.quantity = newQty.toFixed(3);
                    }
                });
            });
        });

        // Filter out items with zero quantity
        const updatedStock = Array.from(stockMap.values())
            .filter(item => parseFloat(item.quantity) > 0);

        // Update Firebase and IndexedDB
        await stockRef.set(updatedStock);
        await syncStockWithFirebase();

        console.log("Stock updated successfully");

    } catch (error) {
        console.error("Error in updateStockQuantities:", error);
        throw new Error(`Failed to update stock: ${error.message}`);
    }
}

// Helper function to load completed orders (add this if it doesn't exist)
function loadCompletedOrders() {
    return new Promise((resolve, reject) => {
        firebase.database().ref('completedOrders').once('value')
            .then(snapshot => {
                // Update UI for completed orders if needed
                resolve();
            })
            .catch(reject);
    });
}

// Enhanced error handling for stock sync
async function syncStockWithFirebase() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('stock').once('value');
        const stockData = snapshot.val();

        if (!stockData) {
            console.log("No stock data in Firebase");
            return;
        }

        // Clear and update IndexedDB
        await performDatabaseOperation(STOCK_STORE_NAME, 'clear', null, "readwrite");
        
        const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readwrite");
        const store = transaction.objectStore(STOCK_STORE_NAME);

        await Promise.all(stockData.map(item => {
            if (parseFloat(item.quantity) > 0) {
                const uniqueId = `${item['item name']}_${item.color}_${item.size}`
                    .replace(/\s+/g, '_')
                    .toLowerCase();
                const itemWithId = { ...item, id: uniqueId };
                return new Promise((resolve, reject) => {
                    const request = store.put(itemWithId);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
        }));

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        console.log("Stock sync completed successfully");
        
    } catch (error) {
        console.error("Error during stock sync:", error);
        throw error;
    }
}
