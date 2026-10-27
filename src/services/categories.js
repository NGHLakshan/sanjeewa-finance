import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "categories";

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Bonus & Allowances",
  "Freelance & Side Gig",
  "Investments & Returns",
  "Other Income",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Dining Out & Snacks",
  "Fuel & Transport",
  "Utility Bills",
  "House Rent & Upkeep",
  "Medical & Healthcare",
  "Shopping & Clothing",
  "Entertainment & Leisure",
  "Loan & Debt Payments",
  "Other Expense",
];

const executeWrite = async (writePromise) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    writePromise.catch((err) => console.error("Firestore offline write error:", err));
    return;
  }

  await Promise.race([
    writePromise,
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]);
};

/**
 * Add a new category document with a specific type (Income or Expense)
 */
export const addCategory = async (name, type = "Expense") => {
  const docRef = doc(collection(db, COLLECTION));
  const writePromise = setDoc(docRef, {
    name: name.trim(),
    type: type === "Income" ? "Income" : "Expense",
    createdAt: Timestamp.now(),
  });
  await executeWrite(writePromise);
  return docRef.id;
};

/**
 * Seed initial default categories if the collection is empty
 */
export const seedDefaultCategories = async () => {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    if (!snap.empty) return; // Already has categories

    const promises = [];
    for (const name of DEFAULT_INCOME_CATEGORIES) {
      const docRef = doc(collection(db, COLLECTION));
      promises.push(setDoc(docRef, {
        name,
        type: "Income",
        createdAt: Timestamp.now(),
      }));
    }
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      const docRef = doc(collection(db, COLLECTION));
      promises.push(setDoc(docRef, {
        name,
        type: "Expense",
        createdAt: Timestamp.now(),
      }));
    }
    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to seed categories:", err);
  }
};

/**
 * Update an existing category name and optional type.
 */
export const updateCategory = async (id, data) => {
  const categoryRef = doc(db, COLLECTION, id);
  const payload = typeof data === "string" ? { name: data.trim() } : {
    name: data.name?.trim(),
    ...(data.type ? { type: data.type } : {}),
  };
  payload.updatedAt = Timestamp.now();
  const writePromise = updateDoc(categoryRef, payload);
  await executeWrite(writePromise);
};

/**
 * Delete a category.
 */
export const deleteCategory = async (id) => {
  const categoryRef = doc(db, COLLECTION, id);
  const writePromise = deleteDoc(categoryRef);
  await executeWrite(writePromise);
};

/**
 * Subscribe to all categories, ordered by creation date.
 * Gracefully handles both new flat categories and legacy nested categories.
 */
export const subscribeToCategories = (callback) => {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    // If empty snapshot and user is online, trigger seed in background
    if (snapshot.empty && typeof navigator !== "undefined" && navigator.onLine) {
      seedDefaultCategories();
    }

    const categories = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      // Handle legacy format if exists
      if (Array.isArray(data.incomeTypes) && Array.isArray(data.expenseTypes) && !data.type) {
        data.incomeTypes.forEach((subName) => {
          categories.push({
            id: `${docSnap.id}_inc_${subName}`,
            name: subName,
            type: "Income",
            parentName: data.name,
            legacyDocId: docSnap.id,
          });
        });
        data.expenseTypes.forEach((subName) => {
          categories.push({
            id: `${docSnap.id}_exp_${subName}`,
            name: subName,
            type: "Expense",
            parentName: data.name,
            legacyDocId: docSnap.id,
          });
        });
      } else {
        categories.push({
          id: docSnap.id,
          name: data.name,
          type: data.type || "Expense",
          createdAt: data.createdAt,
        });
      }
    });

    callback(categories);
  });
};
