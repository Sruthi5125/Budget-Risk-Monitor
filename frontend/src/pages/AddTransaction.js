import { useEffect, useState, useCallback } from "react";
import axios from "axios";

function AddTransaction({ onTransactionAdded }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: "",
    category_type: "EXPENSE",
  });

  const [form, setForm] = useState({
    category: "",
    transaction_type: "EXPENSE",
    amount: "",
    date: "",
    description: "",
  });

  const token = localStorage.getItem("access");

  /* ---------------- FETCH CATEGORIES ---------------- */
  const fetchCategories = useCallback(async () => {
    try {
      let all = [];
      let url = `${process.env.REACT_APP_API_URL}/api/transactions/categories/`;
      while (url) {
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.results !== undefined) {
          all = [...all, ...res.data.results];
          url = res.data.next;
        } else {
          all = res.data;
          url = null;
        }
      }
      setCategories(all);
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  /* ---------------- FETCH TRANSACTIONS (all pages) ---------------- */
  const fetchTransactions = useCallback(async () => {
    try {
      let all = [];
      let url = `${process.env.REACT_APP_API_URL}/api/transactions/`;
      while (url) {
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.results !== undefined) {
          all = [...all, ...res.data.results];
          url = res.data.next; // null when last page reached
        } else {
          all = res.data;
          url = null;
        }
      }
      setTransactions(all);
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, [fetchCategories, fetchTransactions]);

  /* ---------------- ADD CATEGORY ---------------- */
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert("Category name required");
      return;
    }
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/transactions/categories/`,
        newCategory,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Category added!");
      const createdCategory = res.data;
      await fetchCategories();
      setForm((prev) => ({
        ...prev,
        category: createdCategory.id,
        transaction_type: createdCategory.category_type,
      }));
      setNewCategory({ name: "", category_type: "EXPENSE" });
      setShowCategoryForm(false);
    } catch (error) {
      alert("Error adding category");
    }
  };

  /* ---------------- ADD TRANSACTION ---------------- */
  const handleSubmit = async () => {
    if (!form.category || !form.amount || !form.date) {
      alert("Please fill required fields");
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/transactions/`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Transaction added!");
      setForm({
        category: "",
        transaction_type: "EXPENSE",
        amount: "",
        date: "",
        description: "",
      });
      await fetchTransactions();
      await onTransactionAdded();
    } catch (error) {
      alert("Error adding transaction");
    }
  };

  /* ---------------- DELETE TRANSACTION ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/transactions/${id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchTransactions();
      await onTransactionAdded();
    } catch (error) {
      alert("Error deleting transaction");
    }
  };

  // Build a map of category id → name for the transaction list
  const categoryMap = {};
  categories.forEach((cat) => { categoryMap[cat.id] = cat.name; });

  return (
    <div>
      <h3>Add Transaction</h3>

      {/* CATEGORY DROPDOWN */}
      <div className="form-group">
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* ADD NEW CATEGORY BUTTON */}
      <button
        type="button"
        onClick={() => setShowCategoryForm(!showCategoryForm)}
        style={{ marginBottom: "10px", backgroundColor: "#16a34a" }}
      >
        + Add New Category
      </button>

      {/* INLINE CATEGORY FORM */}
      {showCategoryForm && (
        <div style={{ padding: "10px", marginBottom: "15px", backgroundColor: "#f3f4f6", borderRadius: "6px" }}>
          <div className="form-group">
            <input
              placeholder="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <select
              value={newCategory.category_type}
              onChange={(e) => setNewCategory({ ...newCategory, category_type: e.target.value })}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
          <button onClick={handleAddCategory}>Save Category</button>
        </div>
      )}

      {/* TRANSACTION TYPE */}
      <div className="form-group">
        <select
          value={form.transaction_type}
          onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
      </div>

      {/* AMOUNT */}
      <div className="form-group">
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
      </div>

      {/* DATE */}
      <div className="form-group">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </div>

      {/* DESCRIPTION */}
      <div className="form-group">
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <button onClick={handleSubmit}>Add Transaction</button>

      {/* ---------------- TRANSACTION HISTORY ---------------- */}
      <div style={{ marginTop: "30px" }}>
        <h3 style={{ marginBottom: "12px" }}>Transaction History</h3>

        {transactions.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No transactions yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
                <th style={th}>Date</th>
                <th style={th}>Category</th>
                <th style={th}>Type</th>
                <th style={th}>Amount</th>
                <th style={th}>Description</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={td}>{t.date}</td>
                  <td style={td}>{categoryMap[t.category] || "-"}</td>
                  <td style={td}>
                    <span style={{
                      color: t.transaction_type === "INCOME" ? "#16a34a" : "#ef4444",
                      fontWeight: "600",
                    }}>
                      {t.transaction_type}
                    </span>
                  </td>
                  <td style={td}>₹{t.amount}</td>
                  <td style={td}>{t.description || "-"}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#ef4444",
                        border: "none",
                        borderRadius: "6px",
                        padding: "3px 10px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th = { padding: "8px 10px", fontWeight: "600", color: "#374151" };
const td = { padding: "8px 10px", color: "#374151", verticalAlign: "middle" };

export default AddTransaction;
