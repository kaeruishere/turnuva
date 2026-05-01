import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { observeAuth, logout, deleteUserAccount } from './auth.js';

const nicknameInput = document.getElementById('profile-nickname');
const emailDisplay = document.getElementById('display-email');
const avatarDisplay = document.getElementById('avatar-display');
const emojiGrid = document.getElementById('emoji-grid');
const formProfile = document.getElementById('form-profile');
const btnLogout = document.getElementById('btn-logout-profile');
const btnDelete = document.getElementById('btn-delete-account');

let currentUser = null;
let selectedEmoji = null;

// Observe Auth
observeAuth(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    emailDisplay.innerText = user.email;
    
    // Load existing profile from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        nicknameInput.value = data.nickname || user.displayName;
        if (data.emoji) {
            selectedEmoji = data.emoji;
            updateAvatarPreview(data.emoji);
            highlightEmoji(data.emoji);
        } else {
            updateAvatarPreview(null, user.photoURL);
        }
    } else {
        nicknameInput.value = user.displayName;
        updateAvatarPreview(null, user.photoURL);
    }
});

function updateAvatarPreview(emoji, photoURL) {
    if (emoji) {
        avatarDisplay.innerHTML = emoji;
    } else if (photoURL) {
        avatarDisplay.innerHTML = `<img src="${photoURL}">`;
    }
}

function highlightEmoji(emoji) {
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.emoji === emoji);
    });
}

// Emoji selection
emojiGrid.onclick = (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (btn) {
        selectedEmoji = btn.dataset.emoji;
        updateAvatarPreview(selectedEmoji);
        highlightEmoji(selectedEmoji);
    }
};

// Save Profile
formProfile.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            nickname: nicknameInput.value,
            emoji: selectedEmoji,
            updatedAt: new Date()
        }, { merge: true });
        
        alert("Profil başarıyla güncellendi!");
    } catch (error) {
        console.error("Save Error:", error);
        alert("Profil kaydedilirken bir hata oluştu.");
    }
};

// Logout
btnLogout.onclick = () => {
    logout();
};

// Delete Account
btnDelete.onclick = async () => {
    if (confirm("HESABINIZI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\nBu işlem geri alınamaz ve tüm verileriniz silinir.")) {
        try {
            await deleteUserAccount();
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Hesap silinirken bir hata oluştu. Güvenlik nedeniyle tekrar giriş yapmanız gerekebilir.");
        }
    }
};
