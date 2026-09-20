import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, getDocs } from './firebase-config.js';

// DOM Elements
const cakeGrid = document.getElementById('cakeGrid');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Order Modal Elements
const orderModal = document.getElementById('orderModal');
const closeOrderModal = document.getElementById('closeOrderModal');
const orderForm = document.getElementById('orderForm');
const cakeWeight = document.getElementById('cakeWeight');
const customWeightGroup = document.getElementById('customWeightGroup');
const customWeight = document.getElementById('customWeight');
const requireDelivery = document.getElementById('requireDelivery');
const deliveryDetails = document.getElementById('deliveryDetails');
const totalPriceEl = document.getElementById('totalPrice');

let currentUser = null;
let currentSelectedCake = null;
const DELIVERY_CHARGE = 500; // Fixed delivery charge in LKR
const OWNER_WHATSAPP = "947XXXXXXXX"; // TODO: Replace with actual WhatsApp number with country code

// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        loginModal.classList.remove('active');
        
        // Show admin link if user is admin (You'll need a way to flag admin users in Firestore, or hardcode owner email)
        // For demonstration, let's say if email equals owner email, show admin link
        const ownerEmail = "owner@cakebymadu.com"; // TODO: Replace
        if (user.email === ownerEmail) {
            adminLink.style.display = 'inline-block';
        }
    } else {
        currentUser = null;
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        adminLink.style.display = 'none';
    }
});

loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.add('active');
});

closeLoginModal.addEventListener('click', () => {
    loginModal.classList.remove('active');
});

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Failed to login. Check console for details.");
    }
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
});


// --- Load Cakes ---
async function loadCakes() {
    try {
        const querySnapshot = await getDocs(collection(db, "cakes"));
        cakeGrid.innerHTML = '';
        
        if (querySnapshot.empty) {
            cakeGrid.innerHTML = '<p>No cakes available right now. Check back later!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const cake = doc.data();
            cake.id = doc.id;
            
            const card = document.createElement('div');
            card.className = 'cake-card';
            card.innerHTML = `
                <img src="${cake.photoUrl || 'https://via.placeholder.com/300x250?text=Cake'}" alt="${cake.name}" class="cake-img">
                <div class="cake-info">
                    <h3>${cake.name}</h3>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem; flex-grow: 1;">${cake.description}</p>
                    <div class="price">LKR ${cake.basePrice} <span style="font-size:0.8rem; font-weight:normal; color:#888;">(per Kg)</span></div>
                    <button class="btn-primary order-btn" data-cake='${JSON.stringify(cake)}'>Order Now</button>
                </div>
            `;
            cakeGrid.appendChild(card);
        });

        // Add event listeners to order buttons
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cakeData = JSON.parse(e.target.getAttribute('data-cake'));
                openOrderModal(cakeData);
            });
        });

    } catch (error) {
        console.error("Error loading cakes:", error);
        cakeGrid.innerHTML = '<p>Error loading menu. Ensure Firebase config is correct.</p>';
    }
}


// --- Order Logic ---
function openOrderModal(cake) {
    if (!currentUser) {
        loginModal.classList.add('active');
        return;
    }

    currentSelectedCake = cake;
    document.getElementById('modalCakeName').textContent = `Order: ${cake.name}`;
    document.getElementById('modalCakeDesc').textContent = cake.description;
    
    // Reset form
    orderForm.reset();
    customWeightGroup.style.display = 'none';
    deliveryDetails.classList.remove('active');
    document.getElementById('deliveryAddress').removeAttribute('required');
    
    updatePrice();
    orderModal.classList.add('active');
}

closeOrderModal.addEventListener('click', () => {
    orderModal.classList.remove('active');
});

// Calculate price dynamically
function updatePrice() {
    if (!currentSelectedCake) return;

    let selectedWeight = cakeWeight.value;
    if (selectedWeight === 'custom') {
        customWeightGroup.style.display = 'block';
        selectedWeight = customWeight.value || 0;
    } else {
        customWeightGroup.style.display = 'none';
    }

    let price = currentSelectedCake.basePrice * parseFloat(selectedWeight);
    
    if (requireDelivery.checked) {
        price += DELIVERY_CHARGE;
        deliveryDetails.classList.add('active');
        document.getElementById('deliveryAddress').setAttribute('required', 'true');
    } else {
        deliveryDetails.classList.remove('active');
        document.getElementById('deliveryAddress').removeAttribute('required');
    }

    totalPriceEl.textContent = `LKR ${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    return price; // return for form submission
}

cakeWeight.addEventListener('change', updatePrice);
customWeight.addEventListener('input', updatePrice);
requireDelivery.addEventListener('change', updatePrice);

// Submit Order
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let weight = cakeWeight.value === 'custom' ? customWeight.value : cakeWeight.value;
    const finalPrice = updatePrice();
    const isDelivery = requireDelivery.checked;
    const address = isDelivery ? document.getElementById('deliveryAddress').value : 'Pickup';

    // Generate WhatsApp Message
    const message = `Hello Madu, I'd like to place a new order!
    
*Customer Name:* ${currentUser.displayName || currentUser.email}
*Cake:* ${currentSelectedCake.name}
*Weight:* ${weight} Kg
*Delivery:* ${isDelivery ? 'Yes' : 'No'}
${isDelivery ? `*Address:* ${address}\n` : ''}
*Total Amount:* LKR ${finalPrice}

Please confirm my order. Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodedMessage}`;

    // Here we can also save the order to Firebase Firestore (Optional but recommended)
    // await addDoc(collection(db, 'orders'), { ... })

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    orderModal.classList.remove('active');
});

// Initialization
loadCakes();
