import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import AddTransaction from "./AddTransaction";

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyModelInfo, setAnomalyModelInfo] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [kpiStatus, setKpiStatus] = useState(null);
  const [kpiForm, setKpiForm] = useState({ expense_limit: "", min_savings: "", savings_rate_target: "" });
  const [kpiSaving, setKpiSaving] = useState(false);

  const token = localStorage.getItem("access");

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, analysisRes, anomalyRes, forecastRes, kpiRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/monthly-summary/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/category-analysis/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/spending-anomalies/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/expense-forecast/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/kpi/status/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSummary(summaryRes.data);
      setAnalysis(analysisRes.data);
      setAnomalies(anomalyRes.data.anomalies_detected || []);
      setAnomalyModelInfo(anomalyRes.data.model_info || null);
      setForecast(forecastRes.data);
      setKpiStatus(kpiRes.data);
      if (kpiRes.data.targets_set) {
        const t = kpiRes.data.kpis;
        setKpiForm({
          expense_limit: t[0].target !== null ? String(t[0].target) : "",
          min_savings: t[1].target !== null ? String(t[1].target) : "",
          savings_rate_target: t[2].target !== null ? String(t[2].target) : "",
        });
      }
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

  // Build chart data: last 6 months of actuals + 1 forecast point
  const buildForecastChartData = () => {
    if (!forecast) return [];
    const last6 = forecast.historical.slice(-6);
    const data = last6.map((h) => ({ month: h.month, actual: h.expense }));
    data.push({ month: forecast.forecast.month, predicted: forecast.forecast.predicted_expense });
    return data;
  };

  const forecastChartData = buildForecastChartData();
  const forecastMonth = forecast ? forecast.forecast.month : "";

  return (
    <div className="container">
      <h2>Financial Dashboard</h2>

      {/* Tabs */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("overview")}>Overview</button>{" "}
        <button onClick={() => setActiveTab("analytics")}>Analytics</button>{" "}
        <button onClick={() => setActiveTab("forecast")}>Forecast</button>{" "}
        <button onClick={() => setActiveTab("kpi")}>KPI</button>{" "}
        <button onClick={() => setActiveTab("add")}>Add Transaction</button>
      </div>

      {/* ---------------- OVERVIEW TAB ---------------- */}
      {activeTab === "overview" && (
        <>
          <div className="card">
            <div className="card-title">Monthly Summary</div>
            <div className="stats-grid">
              <div className="stat-box">
                <strong>Income</strong>
                <p>&#8377;{summary.total_income}</p>
              </div>
              <div className="stat-box">
                <strong>Expense</strong>
                <p>&#8377;{summary.total_expense}</p>
              </div>
              <div className="stat-box">
                <strong>Savings</strong>
                <p>&#8377;{summary.net_savings}</p>
              </div>
              <div className="stat-box">
                <strong>Burn Rate</strong>
                <p>&#8377;{summary.daily_burn_rate}/day</p>
              </div>
            </div>
            <p>Predicted Expense: &#8377;{summary.predicted_month_end_expense}</p>
            <p>Overspending Risk: {summary.overspending_risk ? "Yes" : "No"}</p>
          </div>

          <div className="card">
            <div className="card-title">
              Budget Health Score: {analysis.budget_health_score}/100
            </div>
            <p>Top Spending Category: {analysis.top_spending_category}</p>
          </div>

          <div className="card">
            <div className="card-title">Spending Alerts</div>
            {anomalyModelInfo && (
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
                Detection: {anomalyModelInfo.name}
              </p>
            )}
            {anomalies.length === 0 ? (
              <p>No unusual spending detected</p>
            ) : (
              anomalies.map((item, index) => (
                <div key={index} className="alert-box">
                  {item.category} is up {item.growth_percentage}% vs your average
                  {item.z_score !== null && (
                    <span style={{ fontSize: "12px", color: "#aaa" }}>
                      {" "}(Z-score: {item.z_score})
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ---------------- ANALYTICS TAB ---------------- */}
      {activeTab === "analytics" && (
        <div className="card">
          <div className="card-title">Category Breakdown</div>
          <PieChart width={450} height={350}>
            <Pie
              data={analysis.category_breakdown}
              dataKey="total"
              nameKey="category__name"
              outerRadius={120}
              fill="#6366f1"
              label
            >
              {analysis.category_breakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      )}

      {/* ---------------- FORECAST TAB ---------------- */}
      {activeTab === "forecast" && (
        <>
          <div className="card">
            <div className="card-title">Expense Forecast - Next Month</div>

            {forecast && forecast.forecast.method === "insufficient_data" ? (
              <p>Not enough data yet. Add at least 3 months of transactions to enable forecasting.</p>
            ) : forecast ? (
              <>
                <p style={{ marginBottom: "4px" }}>
                  Predicted expense for <strong>{forecastMonth}</strong>:{" "}
                  <strong>&#8377;{forecast.forecast.predicted_expense}</strong>
                </p>
                <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>
                  Model: {forecast.model_info.name} &nbsp;|&nbsp; Data points used:{" "}
                  {forecast.model_info.data_points_used}
                </p>

                <LineChart
                  width={550}
                  height={300}
                  data={forecastChartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `\u20B9${value}`} />
                  <Legend />
                  <ReferenceLine x={forecastMonth} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Actual Expense"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 6 }}
                    name="ARIMA Forecast"
                    connectNulls={false}
                  />
                </LineChart>
              </>
            ) : (
              <p>Loading forecast...</p>
            )}
          </div>

          {/* ML Concept Explanation Card */}
          {forecast && forecast.forecast.method !== "insufficient_data" && (
            <div className="card">
              <div className="card-title">How does this work?</div>
              <p style={{ lineHeight: "1.7" }}>{forecast.model_info.what_it_means}</p>
              <p style={{ marginTop: "10px", fontSize: "13px", color: "#888" }}>
                <strong>ARIMA(p, d, q)</strong> &mdash; p=1 (use last month's value), d=1 (remove trend),
                q=1 (smooth out one-time spikes). Falls back to a moving average if data is limited.
              </p>
            </div>
          )}
        </>
      )}

      {/* ---------------- KPI TAB ---------------- */}
      {activeTab === "kpi" && (
        <>
          {/* KPI Status Cards */}
          {kpiStatus && (
            <div className="card">
              <div className="card-title">KPI Status — This Month</div>
              {kpiStatus.kpis.map((kpi, i) => {
                const statusColors = {
                  on_track: "#16a34a",
                  at_risk: "#f59e0b",
                  over: "#ef4444",
                  off_track: "#ef4444",
                  not_set: "#9ca3af",
                };
                const statusLabels = {
                  on_track: "On Track",
                  at_risk: "At Risk",
                  over: "Over Limit",
                  off_track: "Off Track",
                  not_set: "No Target Set",
                };
                const color = statusColors[kpi.status] || "#9ca3af";
                const label = statusLabels[kpi.status] || kpi.status;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div>
                      <strong>{kpi.name}</strong>
                      <p style={{ margin: "2px 0", fontSize: "13px", color: "#6b7280" }}>
                        {kpi.note}
                      </p>
                      <p style={{ margin: "2px 0" }}>
                        Actual:{" "}
                        {kpi.unit === "percent"
                          ? `${kpi.actual}%`
                          : `\u20B9${kpi.actual}`}
                        {kpi.target !== null && (
                          <span style={{ color: "#6b7280", fontSize: "13px" }}>
                            {" "}/ Target:{" "}
                            {kpi.unit === "percent"
                              ? `${kpi.target}%`
                              : `\u20B9${kpi.target}`}
                          </span>
                        )}
                        {kpi.projected !== null && kpi.target !== null && (
                          <span style={{ color: "#6b7280", fontSize: "12px" }}>
                            {" "}(Projected: \u20B9{kpi.projected})
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      style={{
                        backgroundColor: color,
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Set KPI Targets Form */}
          <div className="card">
            <div className="card-title">Set KPI Targets</div>
            <div className="form-group">
              <label style={{ fontSize: "13px", color: "#6b7280" }}>
                Monthly Expense Limit (\u20B9)
              </label>
              <input
                type="number"
                placeholder="e.g. 20000"
                value={kpiForm.expense_limit}
                onChange={(e) => setKpiForm({ ...kpiForm, expense_limit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: "13px", color: "#6b7280" }}>
                Minimum Monthly Savings (\u20B9)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={kpiForm.min_savings}
                onChange={(e) => setKpiForm({ ...kpiForm, min_savings: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: "13px", color: "#6b7280" }}>
                Savings Rate Target (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={kpiForm.savings_rate_target}
                onChange={(e) => setKpiForm({ ...kpiForm, savings_rate_target: e.target.value })}
              />
            </div>
            <button
              disabled={kpiSaving}
              onClick={async () => {
                setKpiSaving(true);
                try {
                  const payload = {};
                  if (kpiForm.expense_limit !== "") payload.expense_limit = kpiForm.expense_limit;
                  if (kpiForm.min_savings !== "") payload.min_savings = kpiForm.min_savings;
                  if (kpiForm.savings_rate_target !== "") payload.savings_rate_target = kpiForm.savings_rate_target;
                  await axios.post(
                    `${process.env.REACT_APP_API_URL}/api/kpi/targets/`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  await fetchData();
                  alert("KPI targets saved!");
                } catch {
                  alert("Failed to save KPI targets.");
                } finally {
                  setKpiSaving(false);
                }
              }}
            >
              {kpiSaving ? "Saving..." : "Save Targets"}
            </button>
          </div>
        </>
      )}

      {/* ---------------- ADD TRANSACTION TAB ---------------- */}
      {activeTab === "add" && (
        <div className="card">
          <AddTransaction onTransactionAdded={fetchData} />
        </div>
      )}

      <br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
