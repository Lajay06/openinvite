import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, alert }) => (
  <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 border border-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {alert && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Alert
          </Badge>
        )}
        {trend && !alert && (
          <Badge variant="outline" className="text-xs bg-white border-gray-200">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
            )}
            {trend.value}
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function BudgetStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Budget"
        value={`$${stats.totalBudgeted.toLocaleString()}`}
        subtitle="Planned expenses"
        icon={DollarSign}
        color="bg-blue-500"
      />
      
      <StatCard
        title="Amount Spent"
        value={`$${stats.totalSpent.toLocaleString()}`}
        subtitle={`${Math.round(stats.percentageUsed)}% of budget used`}
        icon={TrendingUp}
        color="bg-green-500"
        trend={{ 
          direction: stats.percentageUsed <= 100 ? 'up' : 'down', 
          value: `${Math.round(stats.percentageUsed)}%` 
        }}
      />
      
      <StatCard
        title="Remaining Budget"
        value={`$${Math.abs(stats.remaining).toLocaleString()}`}
        subtitle={stats.remaining >= 0 ? "Available to spend" : "Over budget"}
        icon={stats.remaining >= 0 ? DollarSign : AlertTriangle}
        color={stats.remaining >= 0 ? "bg-purple-500" : "bg-red-500"}
        alert={stats.remaining < 0}
      />
      
      <StatCard
        title="Unpaid Amount"
        value={`$${stats.unpaidAmount.toLocaleString()}`}
        subtitle="Outstanding payments"
        icon={CreditCard}
        color="bg-orange-500"
      />
    </div>
  );
}