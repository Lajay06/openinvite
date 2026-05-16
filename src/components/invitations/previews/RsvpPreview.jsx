import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export const RsvpPreview = ({ invitation, globalStyles }) => {
  return (
    <div className="p-4 md:p-8" style={{ fontFamily: globalStyles?.fontFamily }}>
      <form className="space-y-6">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="Your full name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="your@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Will you be attending?</Label>
          <RadioGroup defaultValue="attending" className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="attending" id="r1" />
              <Label htmlFor="r1">Joyfully Attending</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="declined" id="r2" />
              <Label htmlFor="r2">Regretfully Decline</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="message">Message for the couple</Label>
          <Textarea id="message" placeholder="Leave a note, a memory, or a song request!" />
        </div>
        <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white">
          Submit RSVP
        </Button>
      </form>
    </div>
  );
};

export default RsvpPreview;