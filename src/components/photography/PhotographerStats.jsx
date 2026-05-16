import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Video, Users, DollarSign } from 'lucide-react';

export default function PhotographerStats({ stats }) {
  const statCards = [
    {
      title: 'Total Professionals',
      value: stats.total,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Photographers',
      value: stats.photographersCount,
      icon: Camera,
      gradient: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      title: 'Videographers',
      value: stats.videographersCount,
      icon: Video,
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Booked',
      value: stats.totalSpent > 0 ? `$${stats.totalSpent.toLocaleString()}` : stats.bookedCount,
      icon: DollarSign,
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}