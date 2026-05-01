import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const TOURNAMENTS_COL = "tournaments";

const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createTournament = async (name, password, user) => {
    const tournamentData = {
        name,
        password: password || null,
        code: generateCode(),
        participants: [{
            uid: user.uid,
            name: user.displayName,
            photoURL: user.photoURL,
            isReady: false
        }],
        status: 'waiting',
        format: 'league',
        createdAt: serverTimestamp(),
        adminId: user.uid,
        settings: {
            entryType: password ? 'password' : 'public',
            scoreEntry: 'admin' // admin or all
        }
    };

    const docRef = await addDoc(collection(db, TOURNAMENTS_COL), tournamentData);
    return docRef.id;
};

export const joinTournament = async (tournamentId, user) => {
    const docRef = doc(db, TOURNAMENTS_COL, tournamentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) throw new Error("Turnuva bulunamadı");
    
    const data = docSnap.data();
    const alreadyJoined = data.participants.some(p => p.uid === user.uid);
    
    if (!alreadyJoined) {
        await updateDoc(docRef, {
            participants: arrayUnion({
                uid: user.uid,
                name: user.displayName,
                photoURL: user.photoURL,
                isReady: false
            })
        });
    }
};

export const toggleReady = async (tournamentId, uid, isReady) => {
    const docRef = doc(db, TOURNAMENTS_COL, tournamentId);
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    
    const updatedParticipants = data.participants.map(p => {
        if (p.uid === uid) return { ...p, isReady };
        return p;
    });
    
    await updateDoc(docRef, { participants: updatedParticipants });
};

export const updateSettings = async (tournamentId, settings) => {
    const docRef = doc(db, TOURNAMENTS_COL, tournamentId);
    await updateDoc(docRef, { settings });
};

export const deleteTournament = async (tournamentId) => {
    // In v1 we just mark it as deleted or actually delete
    // For now, let's mark it as 'deleted' status
    const docRef = doc(db, TOURNAMENTS_COL, tournamentId);
    await updateDoc(docRef, { status: 'deleted' });
};

export const listenToTournaments = (callback) => {
    const q = query(collection(db, TOURNAMENTS_COL), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const tournaments = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(t => t.status !== 'deleted');
        callback(tournaments);
    });
};

export const getTournamentByCode = async (code) => {
    const q = query(collection(db, TOURNAMENTS_COL), where("code", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
};

export const getTournament = async (id) => {
    const docRef = doc(db, TOURNAMENTS_COL, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};
