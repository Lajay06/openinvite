import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';

export default function CalendarView({ events, onAddEvent, onDeleteEvent }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    description: '',
    type: 'custom'
  });

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      toast.error('Please enter event title and date');
      return;
    }
    onAddEvent(newEvent);
    setNewEvent({ title: '', date: '', time: '', description: '', type: 'custom' });
    setShowEventForm(false);
    toast.success('Event added!');
  };

  const exportToICalendar = () => {
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Planner//EN',
      'CALSCALE:GREGORIAN',
    ];

    events.forEach(event => {
      const startDate = event.date.replace(/-/g, '');
      const startTime = event.time ? event.time.replace(/:/g, '') + '00' : '000000';
      
      icalContent.push('BEGIN:VEVENT');
      icalContent.push(`DTSTART:${startDate}T${startTime}`);
      icalContent.push(`SUMMARY:${event.title}`);
      if (event.description) {
        icalContent.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
      }
      icalContent.push(`UID:${event.id || Math.random().toString(36).substring(7)}@weddingplanner.com`);
      icalContent.push('END:VEVENT');
    });

    icalContent.push('END:VCALENDAR');

    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding-events.ics';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported!');
  };

  const getEventColor = (type) => {
    const colors = {
      wedding: 'bg-pink-100 text-pink-700 border-pink-200',
      vendor: 'bg-blue-100 text-blue-700 border-blue-200',
      catering: 'bg-orange-100 text-orange-700 border-orange-200',
      custom: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[type] || colors.custom;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="text-base font-semibold text-gray-900">Event Calendar</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth} className="h-7 w-7 border-gray-300">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-7 w-7 border-gray-300">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToICalendar}
            className="border-gray-300 h-8 text-xs"
            disabled={events.length === 0}
          >
            <Download className="w-3 h-3 mr-2" />
            Export Calendar
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowEventForm(true)}
            className="bg-gray-900 hover:bg-gray-800 h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Add Event Form */}
      {showEventForm && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Add New Event</h4>
            <Button variant="ghost" size="icon" onClick={() => setShowEventForm(false)} className="h-6 w-6">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Event Title</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Final Catering Meeting"
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Date</Label>
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Time</Label>
              <Input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className="h-8 text-sm border-gray-300"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Add details about the event..."
                className="text-sm border-gray-300 min-h-[60px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowEventForm(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddEvent} className="bg-gray-900 hover:bg-gray-800 h-7 text-xs">
              Add Event
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {blanks.map(blank => (
            <div key={`blank-${blank}`} className="border-b border-r border-gray-200 p-2 h-24 bg-gray-50" />
          ))}
          {days.map(day => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={day} 
                className={`border-b border-r border-gray-200 p-2 h-24 hover:bg-gray-50 transition-colors ${
                  isToday ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isToday ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {day}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-16">
                  {dayEvents.map((event, idx) => (
                    <div 
                      key={idx} 
                      className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${
                        getEventColor(event.type)
                      }`}
                      title={event.title}
                      onClick={() => setSelectedDate({ date, events: dayEvents })}
                    >
                      {event.time && <span className="font-medium">{event.time}</span>} {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && selectedDate.events.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Events on {selectedDate.date.toLocaleDateString()}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)} className="h-6 w-6">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-3">
            {selectedDate.events.map((event, idx) => (
              <div key={idx} className="py-3 border-b border-gray-200 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-semibold text-gray-900">{event.title}</h5>
                      <Badge className={`text-xs border ${getEventColor(event.type)}`}>
                        {event.type}
                      </Badge>
                    </div>
                    {event.time && (
                      <p className="text-xs text-gray-600 mb-1">Time: {event.time}</p>
                    )}
                    {event.description && (
                      <p className="text-xs text-gray-600">{event.description}</p>
                    )}
                  </div>
                  {event.type === 'custom' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onDeleteEvent(event)}
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-medium text-gray-700">Event Types:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-pink-100 border border-pink-200" />
          <span className="text-gray-600">Wedding</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span className="text-gray-600">Vendor</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
          <span className="text-gray-600">Catering</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
          <span className="text-gray-600">Custom</span>
        </div>
      </div>
    </div>
  );
}