import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const COLLECTION = "transactions";

/**
 * Execute a Firestore write with offline-first speed:
 * - If offline: writes to local cache (IndexedDB) immediately and resolves without waiting for Google Cloud server ack.
 * - If online: awaits server acknowledgement, but caps waiting at 800ms so network hiccups never freeze the UI.
 */
const executeWrite = async (writePromise) => {
  // Catch background write errors so they don't cause unhandled rejections
  writePromise.catch((err) => console.error("Firestore write error:", err));

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  // Resolve quickly (capped at 60ms) so user interactions feel instantaneous and snappy
  await Promise.race([
    writePromise,
    new Promise((resolve) => setTimeout(resolve, 60)),
  ]);
};

/**
 * Add a new transaction document to Firestore.
 * Generates client-side auto-ID and writes immediately to IndexedDB local cache.
 */
export const addTransaction = async (data) => {
  const docRef = doc(collection(db, COLLECTION));
  const payload = {
    date: Timestamp.fromDate(new Date(data.date)),
    time: data.time || "",
    type: data.type,
    category: data.category,
    subCategory: data.subCategory,
    amount: Number(data.amount),
    paymentMethod: data.paymentMethod,
    description: data.description || "",
    createdAt: Timestamp.now(),
  };

  const writePromise = setDoc(docRef, payload);
  await executeWrite(writePromise);
  return docRef.id;
};

/**
 * Update an existing transaction document in Firestore.
 */
export const updateTransaction = async (id, data) => {
  const docRef = doc(db, COLLECTION, id);
  const updatePayload = {
    type: data.type,
    category: data.category,
    subCategory: data.subCategory,
    amount: Number(data.amount),
    paymentMethod: data.paymentMethod,
    description: data.description || "",
    time: data.time || "",
    updatedAt: Timestamp.now(),
  };

  if (data.date) {
    updatePayload.date = data.date instanceof Date 
      ? Timestamp.fromDate(data.date) 
      : Timestamp.fromDate(new Date(data.date));
  }

  const writePromise = updateDoc(docRef, updatePayload);
  await executeWrite(writePromise);
};

/**
 * Delete a transaction document from Firestore.
 */
export const deleteTransaction = async (id) => {
  const docRef = doc(db, COLLECTION, id);
  const writePromise = deleteDoc(docRef);
  await executeWrite(writePromise);
};

/**
 * Subscribe to all transactions, ordered by date descending.
 * Returns an unsubscribe function to clean up the listener.
 * Reads from local IndexedDB cache when offline.
 */
export const subscribeToTransactions = (callback) => {
  const q = query(
    collection(db, COLLECTION),
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp → JS Date
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        amount: Number(data.amount),
      };
    });
    callback(transactions);
  }, (error) => {
    console.error("Firebase transaction sync error:", error);
    toast.error("Database Error: " + error.message, { duration: 6000 });
  });
};


/**
 * Permanently delete all transactions from Firestore (useful for customer handoff).
 */
export const clearAllTransactions = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  if (querySnapshot.empty) return 0;

  const docs = querySnapshot.docs;
  const chunks = [];
  for (let i = 0; i < docs.length; i += 400) {
    chunks.push(docs.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  return docs.length;
};
