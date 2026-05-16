import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Utensils, Wine } from 'lucide-react';
import VenueSearch from './VenueSearch';

const MEAL_TYPES = [
  'Plated Dinner',
  'Buffet',
  'Family Style',
  'Cocktail Reception',
  'Brunch',
  'Lunch',
  'Dessert Only'
];

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan', 
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Kosher',
  'Halal',
  'Keto',
  'Low-Carb'
];

const BAR_SERVICE_TYPES = [
  'Open Bar',
  'Limited Bar',
  'Wine & Beer Only',
  'Signature Cocktails',
  'Cash Bar',
  'No Alcohol'
];

export default function FoodBeverageSection({ data, onChange }) {
  const updateField = (field, value) => {
    onChange(field, value);
  };

  const handleCatererSelect = (venueData) => {
    updateField('caterer', venueData.venueName);
    if (venueData.address) updateField('catererAddress', venueData.address);
    if (venueData.phone) updateField('cateringPhone', venueData.phone);
  };

  const addMenuItem = (category) => {
    const currentItems = data[`${category}Items`] || [];
    const newItems = [...currentItems, { name: '', description: '' }];
    updateField(`${category}Items`, newItems);
  };

  const updateMenuItem = (category, index, field, value) => {
    const currentItems = data[`${category}Items`] || [];
    const newItems = [...currentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    updateField(`${category}Items`, newItems);
  };

  const removeMenuItem = (category, index) => {
    const currentItems = data[`${category}Items`] || [];
    const newItems = currentItems.filter((_, i) => i !== index);
    updateField(`${category}Items`, newItems);
  };

  const toggleDietaryOption = (option) => {
    const current = data.dietaryOptions || [];
    const updated = current.includes(option) 
      ? current.filter(item => item !== option)
      : [...current, option];
    updateField('dietaryOptions', updated);
  };

  return (
    <div className="space-y-6">
      {/* Catering Company */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-500" />
            Catering Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <VenueSearch
            label="Catering Company"
            venueName={data.caterer}
            address={data.catererAddress}
            onVenueSelect={handleCatererSelect}
            placeholder="Search for catering companies..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contact Person</Label>
              <Input
                value={data.cateringContact || ''}
                onChange={(e) => updateField('cateringContact', e.target.value)}
                placeholder="Primary contact name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={data.cateringPhone || ''}
                onChange={(e) => updateField('cateringPhone', e.target.value)}
                placeholder="555-123-4567"
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={data.cateringEmail || ''}
              onChange={(e) => updateField('cateringEmail', e.target.value)}
              placeholder="catering@company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Meal Service */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Meal Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Service Style</Label>
              <Select
                value={data.serviceStyle || ''}
                onValueChange={(value) => updateField('serviceStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service style" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guest Count</Label>
              <Input
                type="number"
                value={data.guestCount || ''}
                onChange={(e) => updateField('guestCount', e.target.value)}
                placeholder="Number of guests"
              />
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Menu Options</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addMenuItem('menu')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            {(data.menuItems || []).map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={item.name}
                    onChange={(e) => updateMenuItem('menu', index, 'name', e.target.value)}
                    placeholder="Menu item name"
                    className="flex-1 mr-3"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMenuItem('menu', index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateMenuItem('menu', index, 'description', e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* Dietary Options */}
          <div>
            <Label className="text-base font-medium mb-3 block">Dietary Accommodations</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DIETARY_OPTIONS.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={(data.dietaryOptions || []).includes(option)}
                    onCheckedChange={() => toggleDietaryOption(option)}
                  />
                  <Label htmlFor={option} className="text-sm">{option}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Service */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wine className="w-5 h-5 text-purple-500" />
            Bar Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bar Type</Label>
            <Select
              value={data.barType || ''}
              onValueChange={(value) => updateField('barType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bar service type" />
              </SelectTrigger>
              <SelectContent>
                {BAR_SERVICE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Signature Cocktails */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Signature Cocktails</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addMenuItem('cocktail')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Cocktail
              </Button>
            </div>
            {(data.cocktailItems || []).map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={item.name}
                    onChange={(e) => updateMenuItem('cocktail', index, 'name', e.target.value)}
                    placeholder="Cocktail name"
                    className="flex-1 mr-3"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMenuItem('cocktail', index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateMenuItem('cocktail', index, 'description', e.target.value)}
                  placeholder="Ingredients or description"
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div>
            <Label>Bar Service Notes</Label>
            <Textarea
              value={data.barNotes || ''}
              onChange={(e) => updateField('barNotes', e.target.value)}
              placeholder="Special instructions, timing, restrictions, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}