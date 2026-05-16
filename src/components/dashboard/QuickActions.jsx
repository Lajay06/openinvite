import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ACTIONS = [
  { label: "Guest List", url: "Guests", desc: "Manage RSVPs and guest info" },
  { label: "Budget", url: "Budget", desc: "Track expenses and spending" },
  { label: "Schedule", url: "Schedule", desc: "Build your wedding timeline" },
  { label: "Invitations", url: "Invitations", desc: "Design digital invites" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E0E0DC]">
      {ACTIONS.map(({ label, url, desc }) => (
        <Link key={label} to={createPageUrl(url)}
          className="group bg-white px-6 py-6 hover:bg-[#0A0A0A] transition-colors duration-200">
          <p className="label-caps text-[#888888] group-hover:text-[#555555] mb-2 transition-colors">{label}</p>
          <p className="text-[13px] text-[#0A0A0A] group-hover:text-white font-sans-ui transition-colors">{desc}</p>
        </Link>
      ))}
    </div>
  );
}