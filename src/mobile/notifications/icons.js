import { UserCheck, UserX, HelpCircle, MessageCircle, BookOpen, Music2, BarChart2, Gift, ListChecks, AlertCircle, Receipt, Sparkles } from 'lucide-react';

/** Circular icon tile per type: which Lucide icon and which tile colour. */
export function typeIcon(type) {
  switch (type) {
    case 'rsvp_attending': return { icon: UserCheck, tile: 'ok' };
    case 'rsvp_declined': return { icon: UserX, tile: 'blush' };
    case 'rsvp_maybe': return { icon: HelpCircle, tile: 'warn' };
    case 'message': return { icon: MessageCircle, tile: 'primary' };
    case 'guestbook': return { icon: BookOpen, tile: 'sand' };
    case 'song_request': return { icon: Music2, tile: 'ink' };
    case 'poll_vote': return { icon: BarChart2, tile: 'sand' };
    case 'gift': return { icon: Gift, tile: 'blush' };
    case 'task_due': return { icon: ListChecks, tile: 'warn' };
    case 'task_overdue': return { icon: AlertCircle, tile: 'primary' };
    case 'payment_due': return { icon: Receipt, tile: 'warn' };
    default: return { icon: Sparkles, tile: 'ink' };
  }
}
