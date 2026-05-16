import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Users } from 'lucide-react';

const GuestItem = ({ guest, index }) => (
  <Draggable draggableId={guest.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`p-3 rounded-lg backdrop-blur-sm shadow-md text-sm transition-all duration-200 ${
          snapshot.isDragging 
            ? 'bg-sage-300 dark:bg-sage-700 scale-105 shadow-xl' 
            : 'bg-white/30 dark:bg-gray-800/50'
        }`}
      >
        <p className="font-medium text-gray-900 dark:text-gray-100">{guest.name}</p>
        {guest.plus_one && guest.plus_one_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">+ {guest.plus_one_name}</p>
        )}
      </div>
    )}
  </Draggable>
);

export default function UnassignedGuests({ guests }) {
  return (
    <Droppable droppableId="unassigned">
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`lg:col-span-1 backdrop-blur-xl bg-white/10 dark:bg-gray-900/10 border border-white/20 dark:border-gray-700/30 shadow-2xl transition-colors h-full ${
            snapshot.isDraggingOver ? 'bg-white/20 dark:bg-gray-800/30' : ''
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
              <Users /> Unassigned Guests ({guests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 min-h-[200px] max-h-[60vh] overflow-y-auto p-4">
            {guests.length > 0 ? (
                guests.map((guest, index) => (
                    <GuestItem key={guest.id} guest={guest} index={index} />
                ))
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    All attending guests have been seated.
                </div>
            )}
            {provided.placeholder}
          </CardContent>
        </Card>
      )}
    </Droppable>
  );
}