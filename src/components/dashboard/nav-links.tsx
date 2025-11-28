
import React from 'react';
import { Settings, Briefcase } from 'lucide-react';

export const navLinks = [
    {
        href: '/',
        label: 'Overview',
        icon: <Briefcase className="h-5 w-5" />,
    },
    {
        href: '/settings',
        label: 'Settings',
        icon: <Settings className="h-5 w-5" />,
    },
];
