import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Mail, Phone, Users } from "lucide-react";

const RSVP_STYLES = {
  attending: { background: '#DDF762', color: '#0A1930', border: 'none' },
  declined:  { background: '#E03553', color: '#FFFFFF', border: 'none' },
  pending:   { background: 'rgba(10,10,10,0.07)', color: '#444444', border: 'none' },
  maybe:     { background: '#803D81', color: '#FFFFFF', border: 'none' },
};

const CATEGORY_STYLES = {
  family:           { background: 'transparent', color: '#E03553',          border: '1px solid #E03553' },
  friends:          { background: 'transparent', color: '#803D81',          border: '1px solid #803D81' },
  colleagues:       { background: 'transparent', color: '#0A1930',          border: '1px solid #0A1930' },
  partners_family:  { background: 'transparent', color: '#444444',          border: '1px solid rgba(10,10,10,0.25)' },
  partners_friends: { background: 'transparent', color: '#803D81',          border: '1px solid #803D81' },
};

const pillBase = {
  display: 'inline-block',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

const BadgePill = ({ style, children }) => (
  <span style={{ ...pillBase, ...style }}>{children}</span>
);

const getProfilePicture = (guest) => {
  if (guest.profile_picture_url) return guest.profile_picture_url;
  if (guest.email) {
    const hash = btoa(guest.email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=40`;
  }
  return null;
};

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const contactTextStyle = { fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" };

const SkeletonRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="skeleton-row" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton-row" style={{ width: 120, height: 14 }} />
          </div>
        </TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 140, height: 12 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 50, height: 14 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 30, height: 14 }} /></TableCell>
        <TableCell />
      </TableRow>
    ))}
  </>
);

export default function GuestList({ guests, onEdit, onDelete, loading }) {
  if (!loading && guests.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <Users size={28} style={{ color: '#803D81', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          No guests yet — add your first.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              <TableHead>Guest</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>+1</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows /> : guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell className="align-middle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar className="w-8 h-8" style={{ flexShrink: 0 }}>
                      <AvatarImage src={getProfilePicture(guest)} alt={guest.name} />
                      <AvatarFallback style={{ background: 'rgba(10,10,10,0.06)', color: '#0A0A0A', fontSize: 11, fontWeight: 700 }}>
                        {getInitials(guest.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.name}</p>
                      {guest.dietary_restrictions && (
                        <p style={{ fontSize: 11, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.dietary_restrictions}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-middle">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {guest.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...contactTextStyle }}>
                        <Mail size={11} />{guest.email}
                      </div>
                    )}
                    {guest.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...contactTextStyle }}>
                        <Phone size={11} />{guest.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-middle">
                  {guest.category && (
                    <BadgePill style={CATEGORY_STYLES[guest.category] || CATEGORY_STYLES.family}>
                      {guest.category.replace(/_/g, ' ')}
                    </BadgePill>
                  )}
                </TableCell>
                <TableCell className="align-middle">
                  <BadgePill style={RSVP_STYLES[guest.rsvp_status] || RSVP_STYLES.pending}>
                    {guest.rsvp_status || 'pending'}
                  </BadgePill>
                </TableCell>
                <TableCell className="align-middle">
                  <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {guest.table_assignment || '—'}
                  </span>
                </TableCell>
                <TableCell className="align-middle">
                  {guest.plus_one ? (
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1930', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Yes</span>
                      {guest.plus_one_name && (
                        <p style={{ fontSize: 11, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.plus_one_name}</p>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No</span>
                  )}
                </TableCell>
                <TableCell className="align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={15} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(guest)}>
                        <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(guest.id)} style={{ color: '#E03553' }}>
                        <Trash2 size={13} style={{ marginRight: 8 }} />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
