
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, CheckCircle, FileText, DollarSign } from "lucide-react";

export default function VendorStats({ stats }) {
  const statCards = [
    {
      title: "Total Vendors",
      value: stats.totalVendors,
      icon: Briefcase,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Booked",
      value: stats.bookedVendors,
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Quoted",
      value: stats.quotedVendors,
      icon: FileText,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Total Budget",
      value: `$${stats.totalBudget.toLocaleString()}`,
      icon: DollarSign,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
