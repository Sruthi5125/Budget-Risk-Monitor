import { useEffect, useState, useCallback } from "react";
import axios from "axios";

function AddTransaction({ onTransactionAdded }) {
  const [categories, setCategories] = useState([]);

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
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/transactions/categories/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCategories(res.data.results || []);
    } catch (error) {
      console.log(error);
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Category added!");

      const createdCategory = res.data;

      // Refresh categories
      await fetchCategories();

      // Auto select new category
      setForm((prev) => ({
        ...prev,
        category: createdCategory.id,
        transaction_type: createdCategory.category_type,
      }));

      // Reset category form
      setNewCategory({
        name: "",
        category_type: "EXPENSE",
      });

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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Transaction added!");

      setForm({
        category: "",
        transaction_type: "EXPENSE",
        amount: "",
        date: "",
        description: "",
      });

      onTransactionAdded();
    } catch (error) {
      alert("Error adding transaction");
    }
  };

  return (
    <div>
      <h3>Add Transaction</h3>

      {/* CATEGORY DROPDOWN */}
      <div className="form-group">
        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
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
        style={{
          marginBottom: "10px",
          backgroundColor: "#16a34a",
        }}
      >
        + Add New Category
      </button>

      {/* INLINE CATEGORY FORM */}
      {showCategoryForm && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
          }}
        >
          <div className="form-group">
            <input
              placeholder="Category Name"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div className="form-group">
            <select
              value={newCategory.category_type}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  category_type: e.target.value,
                })
              }
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>

          <button onClick={handleAddCategory}>
            Save Category
          </button>
        </div>
      )}

      {/* TRANSACTION TYPE */}
      <div className="form-group">
        <select
          value={form.transaction_type}
          onChange={(e) =>
            setForm({
              ...form,
              transaction_type: e.target.value,
            })
          }
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
          onChange={(e) =>
            setForm({ ...form, amount: e.target.value })
          }
        />
      </div>

      {/* DATE */}
      <div className="form-group">
        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
        />
      </div>

      {/* DESCRIPTION */}
      <div className="form-group">
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
        />
      </div>

      <button onClick={handleSubmit}>
        Add Transaction
      </button>
    </div>
  );
}

export default AddTransaction;