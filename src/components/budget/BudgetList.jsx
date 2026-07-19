import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_COLORS = {
  venue:          { color: '#E03553', border: '1px solid #E03553' },
  catering:       { color: '#6b7700', border: '1px solid #DDF762' },
  photography:    { color: '#803D81', border: '1px solid #803D81' },
  flowers:        { color: '#803D81', border: '1px solid #803D81' },
  music:          { color: '#0A1930', border: '1px solid #0A1930' },
  attire:         { background: '#0A1930', color: '#FFFFFF', border: 'none' },
  transportation: { color: '#444444',  border: '1px solid rgba(10,10,10,0.25)' },
  decorations:    { color: '#E03553',  border: '1px solid #E03553' },
  rings:          { color: '#803D81',  border: '1px solid #803D81' },
  stationery:     { color: '#0A1930',  border: '1px solid #0A1930' },
  beauty:         { color: '#803D81',  border: '1px solid #803D81' },
  honeymoon:      { color: '#E03553',  border: '1px solid #E03553' },
  miscellaneous:  { color: '#444444',  border: '1px solid rgba(10,10,10,0.25)' },
};

const PAID_STYLE   = { background: '#DDF762', color: '#0A1930', border: 'none' };
const UNPAID_STYLE = { background: 'rgba(224,53,83,0.1)', color: '#E03553', border: '1px solid rgba(224,53,83,0.3)' };

const pillBase = {
  display: 'inline-block',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
};

const BadgePill = ({ style, children }) => (
  <span style={{ ...pillBase, background: 'transparent', ...style }}>{children}</span>
);

export default function BudgetList({ items, onEdit, onDelete, readOnly = false, loading = false }) {
  if (loading) return null;
  if (items.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <DollarSign size={28} style={{ color: '#DDF762', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          No expenses yet — add your first.
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
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Budget vs actual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment date</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const pct = item.budgeted_amount > 0
                ? ((item.actual_amount || 0) / item.budgeted_amount) * 100
                : 0;
              const over = pct > 100;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.item_name}
                    </p>
                    {item.notes && (
                      <p style={{ fontSize: 11, color: '#444444', margin: '2px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.notes}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <BadgePill style={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.miscellaneous}>
                      {item.category?.replace(/_/g, ' ')}
                    </BadgePill>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.vendor || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          ${(item.actual_amount || 0).toLocaleString()} / ${(item.budgeted_amount || 0).toLocaleString()}
                        </span>
                        {over && <AlertTriangle size={13} style={{ color: '#E03553', flexShrink: 0 }} />}
                      </div>
                      {/* Mini progress bar */}
                      <div style={{ width: '100%', maxWidth: 120, height: 2, background: 'rgba(10,10,10,0.08)', borderRadius: 0 }}>
                        <div style={{
                          width: `${Math.min(pct, 100)}%`, height: 2,
                          background: over ? '#E03553' : 'linear-gradient(90deg, #E03553 0%, #803D81 100%)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: over ? '#E03553' : '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {Math.round(pct)}% of budget{over ? ' — over' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BadgePill style={item.paid ? PAID_STYLE : UNPAID_STYLE}>
                      {item.paid ? 'Paid' : 'Unpaid'}
                    </BadgePill>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.payment_date ? format(new Date(item.payment_date), 'MMM d, yyyy') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(item.id)} style={{ color: '#E03553' }}>
                            <Trash2 size={13} style={{ marginRight: 8 }} />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
