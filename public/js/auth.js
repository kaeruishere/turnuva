import { 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { auth, provider } from "./firebase-config.js";

export const login = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Login Error:", error);
        return null;
    }
};

export const logout = () => signOut(auth);

export const deleteUserAccount = async () => {
    const user = auth.currentUser;
    if (user) {
        await deleteUser(user);
        return true;
    }
    return false;
};

export const observeAuth = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;
