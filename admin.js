import { auth, db, signOut, onAuthStateChanged, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from './firebase-config.js';

// DOM Elements
const authNotice = document.getElementById('authNotice');
const adminContent = document.getElementById('adminContent');
const logoutBtn = document.getElementById('logoutBtn');
const cakesList = document.getElementById('cakesList');

// Modal Elements
const cakeModal = document.getElementById('cakeModal');
const closeCakeModal = document.getElementById('closeCakeModal');
const addCakeBtn = document.getElementById('addCakeBtn');
const cakeForm = document.getElementById('cakeForm');
const modalTitle = document.getElementById('modalTitle');

const OWNER_EMAIL = "owner@cakebymadu.com"; // TODO: Replace with the actual admin email

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (user && user.email === OWNER_EMAIL) { // Basic authorization
        authNotice.style.display = 'none';
        adminContent.style.display = 'block';
        loadCakesTable();
    } else {
        authNotice.style.display = 'block';
        adminContent.style.display = 'none';
        
        // If logged in but not admin, sign out automatically
        if (user) {
            signOut(auth);
            alert("You are not authorized as an administrator.");
        }
    }
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
});

// --- Modal Logic ---
addCakeBtn.addEventListener('click', () => {
    cakeForm.reset();
    document.getElementById('cakeId').value = '';
    modalTitle.textContent = 'Add New Cake';
    cakeModal.classList.add('active');
});

closeCakeModal.addEventListener('click', () => {
    cakeModal.classList.remove('active');
});

// --- CRUD Operations ---
async function loadCakesTable() {
    try {
        const querySnapshot = await getDocs(collection(db, "cakes"));
        cakesList.innerHTML = '';
        
        if (querySnapshot.empty) {
            cakesList.innerHTML = '<tr><td colspan="4">No cakes found. Add one!</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cake = docSnap.data();
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td><img src="${cake.photoUrl}" alt="${cake.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td><strong>${cake.name}</strong></td>
                <td>LKR ${cake.basePrice}</td>
                <td>
                    <button class="btn-small edit-btn" data-id="${docSnap.id}" data-cake='${JSON.stringify(cake)}'>Edit</button>
                    <button class="btn-small btn-danger delete-btn" data-id="${docSnap.id}">Delete</button>
                </td>
            `;
            cakesList.appendChild(tr);
        });

        // Attach listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const cake = JSON.parse(e.target.getAttribute('data-cake'));
                
                document.getElementById('cakeId').value = id;
                document.getElementById('cakeName').value = cake.name;
                document.getElementById('cakeDesc').value = cake.description;
                document.getElementById('cakePrice').value = cake.basePrice;
                document.getElementById('cakeImage').value = cake.photoUrl;
                
                modalTitle.textContent = 'Edit Cake';
                cakeModal.classList.add('active');
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Are you sure you want to delete this cake?')) {
                    const id = e.target.getAttribute('data-id');
                    try {
                        await deleteDoc(doc(db, "cakes", id));
                        loadCakesTable();
                    } catch (error) {
                        console.error("Error deleting document: ", error);
                        alert("Error deleting cake. Check console.");
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error getting documents: ", error);
        cakesList.innerHTML = '<tr><td colspan="4" style="color:red;">Error loading cakes. Check Firebase config.</td></tr>';
    }
}

// Save Cake (Add or Update)
cakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('cakeId').value;
    const cakeData = {
        name: document.getElementById('cakeName').value,
        description: document.getElementById('cakeDesc').value,
        basePrice: parseFloat(document.getElementById('cakePrice').value),
        photoUrl: document.getElementById('cakeImage').value
    };

    try {
        const submitBtn = cakeForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        if (id) {
            // Update
            await updateDoc(doc(db, "cakes", id), cakeData);
        } else {
            // Add new
            await addDoc(collection(db, "cakes"), cakeData);
        }
        
        cakeModal.classList.remove('active');
        loadCakesTable();
    } catch (error) {
        console.error("Error saving cake: ", error);
        alert("Error saving. Check console.");
    } finally {
        const submitBtn = cakeForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Save Cake';
        submitBtn.disabled = false;
    }
});
