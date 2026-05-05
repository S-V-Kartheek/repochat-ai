"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@/lib/api";
import { Repo } from "@/lib/types";
import { Loader2, AlertCircle } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from "recharts";

interface DashboardData {
  avg_faithfulness: number;
  avg_relevancy: number;
  avg_precision: number;
  timeline: {
    id: string;
    createdAt: string;
    faithfulness: number;
    relevancy: number;
    precision: number;
    overall: string;
  }[];
}

export default function EvalPage() {
  const { getToken } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = createApiClient(getToken);

  useEffect(() => {
    // Fetch repos
    api.repos.list().then(res => {
      setRepos(res);
      if (res.length > 0) {
        setSelectedRepoId(res[0].id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setError("Failed to load repositories.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedRepoId) return;

    setLoading(true);
    api.eval.getDashboard(selectedRepoId)
      .then(res => {
        setData(res);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load dashboard data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedRepoId]);

  const formatChartData = () => {
    if (!data?.timeline) return [];
    return data.timeline.map((t, index) => ({
      name: `Q${index + 1}`,
      Faithfulness: Math.round(t.faithfulness * 100),
      Relevancy: Math.round(t.relevancy * 100),
      // Precision is mostly 0 right now since it requires ground truth
    }));
  };

  const chartData = formatChartData();

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Evaluation Dashboard</h1>
          <p className="text-muted-foreground">Monitor AI answer quality with RAGAS metrics.</p>
        </div>
        
        <div>
          <select 
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="input text-sm px-3 py-2 bg-white rounded-md border shadow-sm"
          >
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle />
          <p>{error}</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl">
          <p>You haven&apos;t ingested any repositories yet.</p>
        </div>
      ) : !data || data.timeline.length === 0 ? (
        <div className="text-center h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl">
          <p>No evaluation data found for this repository.</p>
          <p className="text-sm mt-2">Chat with your repo to generate evaluation scores.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white border rounded-xl shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg. Faithfulness</p>
              <p className="text-3xl font-bold">{(data.avg_faithfulness * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Groundedness in context</p>
            </div>
            <div className="p-6 bg-white border rounded-xl shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg. Relevancy</p>
              <p className="text-3xl font-bold">{(data.avg_relevancy * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Addresses the question</p>
            </div>
          </div>

          {/* Chart */}
          <div className="p-6 bg-white border rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Score Trends</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                  <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={12} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value}%`, undefined]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Faithfulness" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Relevancy" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
