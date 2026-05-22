import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';

const LEVELS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function levelForCount(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export default function ContributionHeatmap({ username }) {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api
      .get(`/user-api/users/profile/${username}/contributions`, { params: { year } })
      .then((res) => setData(res.data.payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [username, year]);

  const weeks = useMemo(() => {
    if (!data?.days) return [];
    const map = new Map(data.days.map((d) => [d.date, d.count]));
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const grid = [];
    let week = [];
    const pad = start.getDay();
    for (let i = 0; i < pad; i += 1) week.push(null);
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      week.push({ date: key, count: map.get(key) || 0 });
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      grid.push(week);
    }
    return grid;
  }, [data, year]);

  if (loading) {
    return <div className="h-24 bg-gray-100 animate-pulse rounded-md" />;
  }

  if (!data) {
    return <p className="text-sm text-gray-500">No contribution data yet.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-[#1f2328]">{data.total}</span> contributions in {year}
          {data.maxStreak > 0 && (
            <span className="ml-2">· Longest streak {data.maxStreak} days</span>
          )}
        </p>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          {[year, year - 1, year - 2].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div
                  key={day.date}
                  title={`${day.count} contributions on ${day.date}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: LEVELS[levelForCount(day.count)] }}
                />
              ) : (
                <div key={`empty-${wi}-${di}`} className="w-3 h-3" />
              )
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
        <span>Less</span>
        {LEVELS.map((c) => (
          <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
