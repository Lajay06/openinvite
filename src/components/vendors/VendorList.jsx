import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Briefcase, Phone, Mail, Globe, MapPin, Star, DollarSign, ExternalLink, FolderOpen } from "lucide-react";

const STATUS_STYLES = {
  booked:      { background: '#DDF762',              color: '#0A1930', border: 'none' },
  quoted:      { background: '#803D81',              color: '#FFFFFF', border: 'none' },
  contacted:   { background: '#0A1930',              color: '#FFFFFF', border: 'none' },
  researching: { background: 'rgba(10,10,10,0.07)', color: '#444444', border: '1px solid rgba(10,10,10,0.15)' },
  rejected:    { background: 'rgba(224,53,83,0.1)', color: '#E03553', border: '1px solid rgba(224,53,83,0.3)' },
};

const CATEGORY_STYLES = {
  venue:         { color: '#E03553', border: '1px solid #E03553' },
  catering:      { color: '#6b7700', border: '1px solid #DDF762' },
  photography:   { color: '#803D81', border: '1px solid #803D81' },
  videography:   { color: '#803D81', border: '1px solid #803D81' },
  flowers:       { color: '#803D81', border: '1px solid #803D81' },
  music:         { color: '#0A1930', border: '1px solid #0A1930' },
  bakery:        { color: '#6b7700', border: '1px solid #DDF762' },
  transportation:{ color: '#6b7700', border: '1px solid #DDF762' },
  beauty:        { color: '#E03553', border: '1px solid #E03553' },
  attire:        { background: '#0A1930', color: '#FFFFFF', border: 'none' },
  planning:      { color: '#803D81', border: '1px solid #803D81' },
  decorations:   { color: '#E03553', border: '1px solid #E03553' },
  entertainment: { color: '#0A1930', border: '1px solid #0A1930' },
  other:         { color: '#444444', border: '1px solid rgba(10,10,10,0.25)' },
};

const pillBase = {
  display: 'inline-block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
};

const BadgePill = ({ styleKey, styleMap, children }) => {
  const s = styleMap[styleKey] || styleMap.other || styleMap.researching;
  return (
    <span style={{ ...pillBase, background: s.background || 'transparent', color: s.color, border: s.border }}>
      {children}
    </span>
  );
};

export default function VendorList({ vendors, onEdit, onDelete, onManage }) {
  if (vendors.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <Briefcase size={28} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          No vendors found — add or search for providers.
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
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Quoted price</TableHead>
              <TableHead>Website</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {vendor.name}
                  </p>
                  {vendor.contact_person && (
                    <p style={{ fontSize: 11, color: '#444444', margin: '2px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {vendor.contact_person}
                    </p>
                  )}
                  {vendor.address && (
                    <p style={{ fontSize: 11, color: '#444444', margin: '2px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      <MapPin size={10} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginTop: 1 }} />
                      {vendor.address}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <BadgePill styleKey={vendor.category} styleMap={CATEGORY_STYLES}>
                    {vendor.category?.replace(/_/g, ' ')}
                  </BadgePill>
                </TableCell>
                <TableCell>
                  <BadgePill styleKey={vendor.status} styleMap={STATUS_STYLES}>
                    {vendor.status}
                  </BadgePill>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {vendor.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} style={{ color: 'rgba(10,10,10,0.4)' }} />
                        <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} style={{ color: 'rgba(10,10,10,0.4)' }} />
                        <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, whiteSpace: 'nowrap' }}>{vendor.email}</span>
                      </div>
                    )}
                    {(vendor.rating || vendor.google_rating) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={11} style={{ color: '#6b7700', fill: '#DDF762' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {vendor.rating || vendor.google_rating}
                        </span>
                        {vendor.google_reviews_count && (
                          <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>({vendor.google_reviews_count})</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {vendor.quoted_price ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={11} style={{ color: 'rgba(10,10,10,0.4)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {Number(vendor.quoted_price).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                  )}
                </TableCell>
                <TableCell>
                  {vendor.website ? (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: 'none', fontWeight: 600 }}>
                      <Globe size={11} />Visit<ExternalLink size={10} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal size={15} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onManage && (
                        <DropdownMenuItem onClick={() => onManage(vendor)}>
                          <FolderOpen size={13} style={{ marginRight: 8 }} />Manage
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(vendor)}>
                        <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(vendor.id)} style={{ color: '#E03553' }}>
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
