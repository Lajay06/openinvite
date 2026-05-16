import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

const StatCard = ({ title, value, icon: Icon, color, percentage }) => (
  <Card className="overflow-hidden transition-all duration-200 hover:shadow-md border-0 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {percentage !== undefined && (
            <p className="text-sm text-gray-500">{percentage}% of total</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function GuestStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Guests"
        value={stats.total}
        icon={Users}
        color="bg-blue-500"
      />
      
      <StatCard
        title="Attending"
        value={stats.attending}
        icon={UserCheck}
        color="bg-green-500"
        percentage={stats.total > 0 ? Math.round((stats.attending / stats.total) * 100) : 0}
      />
      
      <StatCard
        title="Declined"
        value={stats.declined}
        icon={UserX}
        color="bg-red-500"
        percentage={stats.total > 0 ? Math.round((stats.declined / stats.total) * 100) : 0}
      />
      
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={Clock}
        color="bg-yellow-500"
        percentage={stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}
      />
    </div>
  );
}