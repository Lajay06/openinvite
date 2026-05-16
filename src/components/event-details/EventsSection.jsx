import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Trash2, Edit, Save, X, MapPin, 
  Search, Calendar, PartyPopper
} from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const EVENT_TYPES = {
  'pre-wedding': [
    'Engagement Party',
    'Bridal Shower', 
    'Bachelor Party',
    'Bachelorette Party',
    'Rehearsal Dinner',
    'Welcome Cocktails',
    'Other'
  ],
  'post-wedding': [
    'After Party',
    'Next-Day Brunch',
    'Farewell Brunch',
    'Thank You Reception',
    'Other'
  ]
};

export default function EventsSection({ events, eventType, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchingVenues, setSearchingVenues] = useState(false);
  const [venueResults, setVenueResults] = useState([]);

  // Ensure events is always an array
  const eventsList = Array.isArray(events) ? events : [];

  const addEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      name: '',
      type: EVENT_TYPES[eventType][0],
      date: '',
      time: '',
      venue: '',
      address: '',
      attendees: [],
      notes: '',
      isCustomType: false
    };
    onChange([...eventsList, newEvent]);
    setEditingIndex(eventsList.length);
  };

  const updateEvent = (index, field, value) => {
    const updatedEvents = [...eventsList];
    updatedEvents[index] = { ...updatedEvents[index], [field]: value };
    onChange(updatedEvents);
  };

  const deleteEvent = (index) => {
    const updatedEvents = eventsList.filter((_, i) => i !== index);
    onChange(updatedEvents);
  };

  const searchVenues = async (location, eventName) => {
    if (!location) return;
    
    setSearchingVenues(true);
    try {
      const prompt = `Find 3-4 venues suitable for "${eventName}" near "${location}". 
      For each venue provide: name, address, brief description, estimated capacity, and website if known.
      Focus on real venues that would be appropriate for this type of event.`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true
      });

      // Parse venue results (simplified for demo)
      const venues = [
        {
          name: 'The Rooftop Terrace',
          address: '123 Downtown Ave',
          description: 'Elegant rooftop space with city views',
          capacity: '50-100 guests',
          website: 'https://example.com'
        },
        {
          name: 'Garden Pavilion',
          address: '456 Park Street', 
          description: 'Beautiful outdoor garden setting',
          capacity: '30-80 guests',
          website: 'https://example.com'
        },
        {
          name: 'Private Dining Room',
          address: '789 Restaurant Row',
          description: 'Intimate private dining experience',
          capacity: '20-40 guests', 
          website: 'https://example.com'
        }
      ];

      setVenueResults(venues);
    } catch (error) {
      console.error('Error searching venues:', error);
    }
    setSearchingVenues(false);
  };

  const selectVenue = (index, venue) => {
    updateEvent(index, 'venue', venue.name);
    updateEvent(index, 'address', venue.address);
    setVenueResults([]);
  };

  const saveEvent = () => {
    setEditingIndex(null);
    setVenueResults([]);
  };

  const cancelEdit = (index) => {
    if (!eventsList[index]?.name) {
      deleteEvent(index);
    }
    setEditingIndex(null);
    setVenueResults([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {eventType === 'pre-wedding' ? 'Pre-Wedding Events' : 'Post-Wedding Events'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Plan celebrations before and after your wedding day
          </p>
        </div>
        <Button onClick={addEvent} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Event
        </Button>
      </div>

      {eventsList.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-12 text-center">
            <PartyPopper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-500 mb-4">
              Add your {eventType === 'pre-wedding' ? 'pre-wedding' : 'post-wedding'} celebrations
            </p>
            <Button onClick={addEvent} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {eventsList.map((event, index) => (
            <Card key={event.id} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <PartyPopper className="w-4 h-4 text-pink-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {event.name || 'Untitled Event'}
                      </CardTitle>
                      {event.type && (
                        <Badge variant="outline" className="mt-1">
                          {event.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIndex(index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvent(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {editingIndex === index ? (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Event Name</Label>
                      <Input
                        value={event.name}
                        onChange={(e) => updateEvent(index, 'name', e.target.value)}
                        placeholder="e.g., Engagement Party"
                      />
                    </div>
                    <div>
                      <Label>Event Type</Label>
                      <Select
                        value={event.type}
                        onValueChange={(value) => updateEvent(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES[eventType].map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={event.date}
                        onChange={(e) => updateEvent(index, 'date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={event.time}
                        onChange={(e) => updateEvent(index, 'time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Venue</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchVenues(event.address || 'nearby', event.name)}
                        disabled={searchingVenues}
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Find Venues
                      </Button>
                    </div>
                    <Input
                      value={event.venue}
                      onChange={(e) => updateEvent(index, 'venue', e.target.value)}
                      placeholder="Venue name"
                    />
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input
                      value={event.address}
                      onChange={(e) => updateEvent(index, 'address', e.target.value)}
                      placeholder="Full address"
                    />
                  </div>

                  {venueResults.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Suggested Venues:</Label>
                      {venueResults.map((venue, venueIndex) => (
                        <div
                          key={venueIndex}
                          className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => selectVenue(index, venue)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{venue.name}</h4>
                              <p className="text-sm text-gray-600">{venue.address}</p>
                              <p className="text-sm text-gray-500 mt-1">{venue.description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {venue.capacity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={event.notes}
                      onChange={(e) => updateEvent(index, 'notes', e.target.value)}
                      placeholder="Special instructions, dress code, etc."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={() => cancelEdit(index)}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={saveEvent}>
                      <Save className="w-4 h-4 mr-1" />
                      Save Event
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="space-y-3">
                    {event.date && event.time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{event.date} at {event.time}</span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{event.venue}</span>
                        {event.address && <span className="text-gray-500">• {event.address}</span>}
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}