import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import AddTransaction from "./AddTransaction";

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const token = localStorage.getItem("access");

  const fetchData = useCallback(async () => {
    try {
      const summaryRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/monthly-summary/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const analysisRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/category-analysis/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const anomalyRes = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/spending-anomalies/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSummary(summaryRes.data);
      setAnalysis(analysisRes.data);
      setAnomalies(anomalyRes.data.anomalies_detected || []);
    } catch (error) {
      alert("Session expired. Please login again.");
      navigate("/");
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/");
  };

  if (!summary || !analysis) return <h3>Loading...</h3>;

  return (
    <div className="container">
      <h2>Financial Dashboard</h2>

      {/* Tabs */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("overview")}>
          Overview
        </button>{" "}
        <button onClick={() => setActiveTab("analytics")}>
          Analytics
        </button>{" "}
        <button onClick={() => setActiveTab("add")}>
          Add Transaction
        </button>
      </div>

      {/* ---------------- OVERVIEW TAB ---------------- */}
      {activeTab === "overview" && (
        <>
          <div className="card">
            <div className="card-title">Monthly Summary</div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>Income</strong>
                <p>₹{summary.total_income}</p>
              </div>
              <div className="stat-box">
                <strong>Expense</strong>
                <p>₹{summary.total_expense}</p>
              </div>
              <div className="stat-box">
                <strong>Savings</strong>
                <p>₹{summary.net_savings}</p>
              </div>
              <div className="stat-box">
                <strong>Burn Rate</strong>
                <p>₹{summary.daily_burn_rate}</p>
              </div>
            </div>

            <p>
              Predicted Expense: ₹
              {summary.predicted_month_end_expense}
            </p>
            <p>
              Overspending Risk:{" "}
              {summary.overspending_risk ? "⚠️ Yes" : "No"}
            </p>
          </div>

          <div className="card">
            <div className="card-title">
              Budget Health Score: {analysis.budget_health_score}/100
            </div>
            <p>
              Top Spending Category:{" "}
              {analysis.top_spending_category}
            </p>
          </div>

          <div className="card">
            <div className="card-title">Spending Alerts</div>

            {anomalies.length === 0 ? (
              <p>No unusual spending detected 🎉</p>
            ) : (
              anomalies.map((item, index) => (
                <div key={index} className="alert-box">
                  ⚠️ {item.category} increased by{" "}
                  {item.growth_percentage}% compared to last
                  month.
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ---------------- ANALYTICS TAB ---------------- */}
      {activeTab === "analytics" && (
        <div className="card">
          <div className="card-title">
            Category Breakdown
          </div>

          <PieChart width={450} height={350}>
            <Pie
              data={analysis.category_breakdown}
              dataKey="total"
              nameKey="category__name"
              outerRadius={120}
              fill="#6366f1"
              label
            >
              {analysis.category_breakdown.map(
                (entry, index) => (
                  <Cell key={`cell-${index}`} />
                )
              )}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      )}

      {/* ---------------- ADD TRANSACTION TAB ---------------- */}
      {activeTab === "add" && (
        <div className="card">
          <AddTransaction
            onTransactionAdded={fetchData}
          />
        </div>
      )}

      <br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;