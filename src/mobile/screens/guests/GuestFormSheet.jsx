import React, { useMemo } from 'react';
import FormSheet from '../../features/FormSheet';
import { guestFields, guestInitial, guestPayload } from './guestFields';

/**
 * Add or edit a guest in a full-height sheet with every field the desktop
 * GuestForm has (see guestFields.js). onSave(fields) receives the desktop's
 * submit shape; table_assignment is handed to the shared write path by the
 * container, as Guests.jsx does.
 */
export default function GuestFormSheet({ open, guest, mealOptions = [], country = 'AU', onClose, onSave, onDelete }) {
  const fields = useMemo(() => guestFields({ mealOptions, country }), [mealOptions, country]);
  const initial = useMemo(() => guestInitial(guest), [guest]);
  return (
    <FormSheet
      open={open}
      full
      title={guest ? 'Edit guest' : 'Add new guest'}
      fields={fields}
      initial={initial}
      required={['name']}
      onClose={onClose}
      onSave={(values) => onSave(guestPayload(values, country))}
      onDelete={onDelete}
      saveLabel={guest ? 'Save' : 'Add guest'}
    />
  );
}
