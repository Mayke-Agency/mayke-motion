"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const colors = ["#5e1f23", "#241915", "#9b6548", "#897a6f", "#b89a72"];
const chartLine = "#5e1f23";
const chartGrid = "rgba(36, 25, 21, 0.12)";
const chartText = "#6e6259";
const tooltipStyle = {
  borderRadius: 6,
  borderColor: "rgba(36, 25, 21, 0.16)",
  background: "rgba(255, 250, 242, 0.96)",
  color: "#241915",
  boxShadow: "0 18px 44px rgba(36, 25, 21, 0.12)"
};

export function RevenueChart({
  data
}: {
  data: {
    label: string;
    revenue: number;
  }[];
}) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="motionRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={chartLine} stopOpacity={0.26} />
              <stop offset="95%" stopColor={chartLine} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartGrid} strokeDasharray="3 7" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: chartText, fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={chartLine}
            strokeWidth={3}
            fill="url(#motionRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopItemsChart({
  data
}: {
  data: {
    name: string;
    value: number;
  }[];
}) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke={chartGrid} strokeDasharray="3 7" horizontal={false} />
          <XAxis type="number" tick={{ fill: chartText, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: chartText, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell fill={colors[index % colors.length]} key={entry.name} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CampaignPie({
  data
}: {
  data: {
    name: string;
    value: number;
  }[];
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell fill={colors[index % colors.length]} key={entry.name} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
