import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search, Users, UserCheck, UserX, Clock } from 'lucide-react';

const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function AssignGuestModal({ guests, assignedGuestIds, onAssign, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assignmentFilter, setAssignmentFilter] = useState('unassigned');

    const filteredGuests = useMemo(() => {
        return guests.filter(guest => {
            // Search filter
            const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                guest.email?.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Status filter
            let matchesStatus = true;
            if (statusFilter !== 'all') {
                matchesStatus = guest.rsvp_status === statusFilter;
            }
            
            // Assignment filter
            let matchesAssignment = true;
            if (assignmentFilter === 'assigned') {
                matchesAssignment = assignedGuestIds.has(guest.id);
            } else if (assignmentFilter === 'unassigned') {
                matchesAssignment = !assignedGuestIds.has(guest.id);
            }
            
            return matchesSearch && matchesStatus && matchesAssignment;
        });
    }, [guests, searchTerm, statusFilter, assignmentFilter, assignedGuestIds]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'attending': return 'bg-green-100 text-green-800';
            case 'declined': return 'bg-red-100 text-red-800';
            case 'maybe': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'attending': return <UserCheck className="w-3 h-3" />;
            case 'declined': return <UserX className="w-3 h-3" />;
            case 'maybe': return <Clock className="w-3 h-3" />;
            default: return <Clock className="w-3 h-3" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Assign Guest to Seat</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                
                {/* Search and Filters */}
                <div className="p-6 border-b space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search for a guest..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filter by RSVP Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="attending">Attending</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                    <SelectItem value="maybe">Maybe</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex-1">
                            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filter by Assignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Guests</SelectItem>
                                    <SelectItem value="unassigned">Unassigned Only</SelectItem>
                                    <SelectItem value="assigned">Assigned Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                
                {/* Guest List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredGuests.length > 0 ? (
                        filteredGuests.map(guest => (
                            <div
                                key={guest.id}
                                onClick={() => !assignedGuestIds.has(guest.id) && onAssign(guest.id)}
                                className={`flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors ${
                                    assignedGuestIds.has(guest.id) 
                                        ? 'cursor-not-allowed opacity-60 bg-gray-50' 
                                        : 'cursor-pointer'
                                }`}
                            >
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={guest.profile_picture_url} alt={guest.name} />
                                    <AvatarFallback className="text-xs bg-pink-100 text-pink-700">
                                        {getInitials(guest.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{guest.name}</span>
                                        <Badge className={`${getStatusColor(guest.rsvp_status)} text-xs flex items-center gap-1`}>
                                            {getStatusIcon(guest.rsvp_status)}
                                            {guest.rsvp_status}
                                        </Badge>
                                        {assignedGuestIds.has(guest.id) && (
                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                                Already Seated
                                            </Badge>
                                        )}
                                    </div>
                                    {guest.email && (
                                        <p className="text-xs text-gray-500">{guest.email}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No guests found</p>
                            <p className="text-sm">Try adjusting your filters or search term.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t">
                    <Button variant="outline" className="w-full" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}