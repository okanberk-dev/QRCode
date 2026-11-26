'use client';

// Code-split boundary for staff mode (CLAUDE.md §61): the counter screen
// (MemberActions, panel dialogs) is its own chunk, so customers opening
// their card never download it. Still server-rendered for staff.
import dynamic from 'next/dynamic';

const StaffCounterLazy = dynamic(() => import('./StaffCounterView'));

export default StaffCounterLazy;
