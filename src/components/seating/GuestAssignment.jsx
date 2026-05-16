import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserCheck, Clock } from 'lucide-react';

const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const GuestCard = ({ guest }) => {
    const isAssigned = !!guest.table_assignment;
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            isAssigned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}>
            <Avatar className="w-10 h-10">
                <AvatarImage src={guest.profile_picture_url} alt={guest.name} />
                <AvatarFallback className="text-xs bg-pink-100 text-pink-700">
                    {getInitials(guest.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="font-medium text-gray-900">{guest.name}</p>
                {guest.email && (
                    <p className="text-xs text-gray-500">{guest.email}</p>
                )}
                {isAssigned && (
                    <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                        <UserCheck className="w-3 h-3"/> {guest.table_assignment}
                    </p>
                )}
            </div>
            {guest.plus_one && (
                <div className="text-xs text-gray-500">+1</div>
            )}
        </div>
    );
};

export default function GuestAssignment({ guests, tables }) {
    const assignedGuestIds = new Set(tables.flatMap(t => (t.assigned_guests || []).map(g => g.guest_id)));
    const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));
    const assignedGuests = guests.filter(g => assignedGuestIds.has(g.id));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unassigned Guests */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        Unassigned Guests
                        <span className="text-sm font-normal text-gray-500">({unassignedGuests.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                    {unassignedGuests.length > 0 ? (
                        unassignedGuests.map((guest) => (
                            <GuestCard key={guest.id} guest={guest} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">All guests are seated!</p>
                            <p className="text-sm">Everyone has been assigned to a table.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assigned Guests */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-500" />
                        Assigned Guests
                        <span className="text-sm font-normal text-gray-500">({assignedGuests.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                    {assignedGuests.length > 0 ? (
                        assignedGuests.map((guest) => (
                            <GuestCard key={guest.id} guest={guest} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No guests assigned yet</p>
                            <p className="text-sm">Start assigning guests to tables in the Layout tab.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}