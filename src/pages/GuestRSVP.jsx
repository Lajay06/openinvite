import React, { useState, useEffect } from 'react';
import { Guest } from '@/entities/Guest';
import { Invitation } from '@/entities/Invitation';
import { WeddingDetails } from '@/entities/WeddingDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Heart, Check, X, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function GuestRSVPPage() {
  const [step, setStep] = useState('lookup'); // lookup, rsvp, success
  const [guestEmail, setGuestEmail] = useState('');
  const [guest, setGuest] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rsvpData, setRsvpData] = useState({
    rsvp_status: 'attending',
    meal_choice: '',
    dietary_restrictions: '',
    plus_one_name: '',
    plus_one_email: '',
    plus_one_rsvp: 'attending',
    plus_one_meal_choice: '',
    plus_one_dietary_restrictions: '',
    special_requests: ''
  });

  useEffect(() => {
    loadInvitationData();
  }, []);

  const loadInvitationData = async () => {
    try {
      const [invitations, details] = await Promise.all([
        Invitation.list(),
        WeddingDetails.list()
      ]);
      
      if (invitations.length > 0) {
        setInvitation(invitations[0]);
      }
      if (details.length > 0) {
        setWeddingDetails(details[0]);
      }
    } catch (error) {
      console.error('Error loading invitation data:', error);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!guestEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const guests = await Guest.list();
      const foundGuest = guests.find(g => 
        g.email && g.email.toLowerCase() === guestEmail.toLowerCase()
      );

      if (!foundGuest) {
        toast.error('No invitation found with that email address. Please check and try again.');
        setLoading(false);
        return;
      }

      setGuest(foundGuest);
      setRsvpData({
        rsvp_status: foundGuest.rsvp_status || 'attending',
        meal_choice: foundGuest.meal_choice || '',
        dietary_restrictions: foundGuest.dietary_restrictions || '',
        plus_one_name: foundGuest.plus_one_name || '',
        plus_one_email: foundGuest.plus_one_email || '',
        plus_one_rsvp: foundGuest.plus_one_rsvp || 'attending',
        plus_one_meal_choice: foundGuest.plus_one_meal_choice || '',
        plus_one_dietary_restrictions: foundGuest.plus_one_dietary_restrictions || '',
        special_requests: foundGuest.special_requests || ''
      });
      setStep('rsvp');
    } catch (error) {
      console.error('Error looking up guest:', error);
      toast.error('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handleSubmitRSVP = async (e) => {
    e.preventDefault();
    
    if (rsvpData.rsvp_status === 'attending' && !rsvpData.meal_choice) {
      toast.error('Please select your meal choice');
      return;
    }

    if (guest.plus_one && rsvpData.plus_one_rsvp === 'attending' && !rsvpData.plus_one_meal_choice) {
      toast.error('Please select a meal choice for your plus one');
      return;
    }

    setSubmitting(true);
    try {
      await Guest.update(guest.id, {
        ...rsvpData,
        rsvp_date: new Date().toISOString()
      });

      setStep('success');
      toast.success('RSVP submitted successfully!');
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast.error('Failed to submit RSVP. Please try again.');
    }
    setSubmitting(false);
  };

  const mealOptions = [
    { value: 'beef', label: 'Beef Tenderloin', description: 'With roasted vegetables and potatoes' },
    { value: 'chicken', label: 'Herb-Roasted Chicken', description: 'With seasonal vegetables and rice' },
    { value: 'fish', label: 'Grilled Salmon', description: 'With asparagus and lemon butter' },
    { value: 'vegetarian', label: 'Vegetarian', description: 'Grilled vegetable medley with quinoa' },
    { value: 'vegan', label: 'Vegan', description: 'Plant-based entrée' },
    { value: 'kids_meal', label: "Kids' Meal", description: 'Chicken fingers and fries' }
  ];

  // Lookup Step
  if (step === 'lookup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Toaster />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Heart className="w-12 h-12 text-pink-500 animate-pulse" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              {invitation?.couple_names || 'Our Wedding'}
            </h1>
            {invitation?.wedding_date && (
              <div className="flex items-center justify-center gap-2 text-xl text-gray-600">
                <Calendar className="w-5 h-5" />
                <span>{new Date(invitation.wedding_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-pink-200 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <CardTitle className="text-2xl text-center">RSVP to Our Wedding</CardTitle>
                <p className="text-center text-white/90 mt-2">
                  Enter your email to find your invitation
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleLookup} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-lg">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="h-12 text-lg border-gray-300 focus:border-pink-400"
                      required
                    />
                    <p className="text-sm text-gray-600">
                      Please use the email address from your invitation
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Finding Your Invitation...
                      </>
                    ) : (
                      'Find My Invitation'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // RSVP Form Step
  if (step === 'rsvp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Toaster />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-pink-200 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <CardTitle className="text-3xl">Welcome, {guest?.name}!</CardTitle>
                <p className="text-white/90 mt-2">We're so excited to celebrate with you</p>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmitRSVP} className="space-y-8">
                  {/* RSVP Status */}
                  <div className="space-y-4">
                    <Label className="text-xl font-semibold">Will you be attending?</Label>
                    <RadioGroup value={rsvpData.rsvp_status} onValueChange={(value) => setRsvpData({ ...rsvpData, rsvp_status: value })}>
                      <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-green-50 cursor-pointer"
                           style={{ borderColor: rsvpData.rsvp_status === 'attending' ? '#22c55e' : '#e5e7eb' }}>
                        <RadioGroupItem value="attending" id="attending" />
                        <Label htmlFor="attending" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-lg">Joyfully Accept</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-red-50 cursor-pointer"
                           style={{ borderColor: rsvpData.rsvp_status === 'declined' ? '#ef4444' : '#e5e7eb' }}>
                        <RadioGroupItem value="declined" id="declined" />
                        <Label htmlFor="declined" className="flex items-center gap-2 cursor-pointer flex-1">
                          <X className="w-5 h-5 text-red-600" />
                          <span className="text-lg">Regretfully Decline</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {rsvpData.rsvp_status === 'attending' && (
                    <>
                      {/* Meal Choice */}
                      <div className="space-y-4">
                        <Label className="text-xl font-semibold">Select Your Meal</Label>
                        <RadioGroup value={rsvpData.meal_choice} onValueChange={(value) => setRsvpData({ ...rsvpData, meal_choice: value })}>
                          {mealOptions.map((meal) => (
                            <div key={meal.value} 
                                 className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-pink-50 cursor-pointer"
                                 style={{ borderColor: rsvpData.meal_choice === meal.value ? '#ec4899' : '#e5e7eb' }}>
                              <RadioGroupItem value={meal.value} id={`meal-${meal.value}`} className="mt-1" />
                              <Label htmlFor={`meal-${meal.value}`} className="cursor-pointer flex-1">
                                <div className="font-semibold text-gray-900">{meal.label}</div>
                                <div className="text-sm text-gray-600">{meal.description}</div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* Dietary Restrictions */}
                      <div className="space-y-2">
                        <Label htmlFor="dietary" className="text-lg font-semibold">Dietary Restrictions or Allergies</Label>
                        <Textarea
                          id="dietary"
                          value={rsvpData.dietary_restrictions}
                          onChange={(e) => setRsvpData({ ...rsvpData, dietary_restrictions: e.target.value })}
                          placeholder="Please let us know of any dietary restrictions or allergies..."
                          className="h-24"
                        />
                      </div>

                      {/* Plus One Section */}
                      {guest?.plus_one && (
                        <div className="space-y-6 p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <h3 className="text-2xl font-bold text-purple-900">Plus One Details</h3>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="plusOneName" className="text-lg">Guest Name *</Label>
                              <Input
                                id="plusOneName"
                                value={rsvpData.plus_one_name}
                                onChange={(e) => setRsvpData({ ...rsvpData, plus_one_name: e.target.value })}
                                placeholder="Full name of your guest"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="plusOneEmail" className="text-lg">Guest Email</Label>
                              <Input
                                id="plusOneEmail"
                                type="email"
                                value={rsvpData.plus_one_email}
                                onChange={(e) => setRsvpData({ ...rsvpData, plus_one_email: e.target.value })}
                                placeholder="guest@example.com"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-4">
                              <Label className="text-lg font-semibold">Will your guest be attending?</Label>
                              <RadioGroup value={rsvpData.plus_one_rsvp} onValueChange={(value) => setRsvpData({ ...rsvpData, plus_one_rsvp: value })}>
                                <div className="flex items-center space-x-3 p-3 border-2 rounded-lg hover:bg-green-50 cursor-pointer"
                                     style={{ borderColor: rsvpData.plus_one_rsvp === 'attending' ? '#22c55e' : '#e5e7eb' }}>
                                  <RadioGroupItem value="attending" id="plusone-attending" />
                                  <Label htmlFor="plusone-attending" className="cursor-pointer">Yes, attending</Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 border-2 rounded-lg hover:bg-red-50 cursor-pointer"
                                     style={{ borderColor: rsvpData.plus_one_rsvp === 'declined' ? '#ef4444' : '#e5e7eb' }}>
                                  <RadioGroupItem value="declined" id="plusone-declined" />
                                  <Label htmlFor="plusone-declined" className="cursor-pointer">Not attending</Label>
                                </div>
                              </RadioGroup>
                            </div>

                            {rsvpData.plus_one_rsvp === 'attending' && (
                              <>
                                <div className="space-y-4">
                                  <Label className="text-lg font-semibold">Guest Meal Choice</Label>
                                  <RadioGroup value={rsvpData.plus_one_meal_choice} onValueChange={(value) => setRsvpData({ ...rsvpData, plus_one_meal_choice: value })}>
                                    {mealOptions.map((meal) => (
                                      <div key={`plusone-${meal.value}`} 
                                           className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-purple-100 cursor-pointer"
                                           style={{ borderColor: rsvpData.plus_one_meal_choice === meal.value ? '#9333ea' : '#e5e7eb' }}>
                                        <RadioGroupItem value={meal.value} id={`plusone-meal-${meal.value}`} className="mt-1" />
                                        <Label htmlFor={`plusone-meal-${meal.value}`} className="cursor-pointer flex-1">
                                          <div className="font-semibold text-gray-900">{meal.label}</div>
                                          <div className="text-sm text-gray-600">{meal.description}</div>
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="plusOneDietary" className="text-lg">Guest Dietary Restrictions</Label>
                                  <Textarea
                                    id="plusOneDietary"
                                    value={rsvpData.plus_one_dietary_restrictions}
                                    onChange={(e) => setRsvpData({ ...rsvpData, plus_one_dietary_restrictions: e.target.value })}
                                    placeholder="Any dietary restrictions or allergies..."
                                    className="h-20"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Special Requests */}
                      <div className="space-y-2">
                        <Label htmlFor="special" className="text-lg font-semibold">Special Requests or Notes</Label>
                        <Textarea
                          id="special"
                          value={rsvpData.special_requests}
                          onChange={(e) => setRsvpData({ ...rsvpData, special_requests: e.target.value })}
                          placeholder="Accessibility needs, seating preferences, or any other special requests..."
                          className="h-24"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('lookup')}
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit RSVP'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Success Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Toaster />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <Card className="border-2 border-green-200 shadow-2xl">
            <CardContent className="p-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {rsvpData.rsvp_status === 'attending' ? 'See You There!' : 'Thank You'}
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                {rsvpData.rsvp_status === 'attending' 
                  ? "We can't wait to celebrate with you!"
                  : "We'll miss you, but we understand."
                }
              </p>
              <div className="text-gray-700 space-y-2">
                <p>Your RSVP has been recorded.</p>
                <p>A confirmation has been sent to {guest?.email}</p>
              </div>
              
              {invitation?.wedding_date && weddingDetails?.mainCeremony && rsvpData.rsvp_status === 'attending' && (
                <div className="mt-8 p-6 bg-pink-50 rounded-lg border border-pink-200">
                  <h3 className="font-semibold text-lg mb-4">Event Details</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-pink-600 mt-0.5" />
                      <div>
                        <div className="font-semibold">Date</div>
                        <div className="text-gray-700">
                          {new Date(invitation.wedding_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                    {weddingDetails.mainCeremony.startTime && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-pink-600 mt-0.5" />
                        <div>
                          <div className="font-semibold">Time</div>
                          <div className="text-gray-700">{weddingDetails.mainCeremony.startTime}</div>
                        </div>
                      </div>
                    )}
                    {weddingDetails.mainCeremony.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-pink-600 mt-0.5" />
                        <div>
                          <div className="font-semibold">Location</div>
                          <div className="text-gray-700">{weddingDetails.mainCeremony.venueName}</div>
                          <div className="text-gray-600 text-sm">{weddingDetails.mainCeremony.address}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}