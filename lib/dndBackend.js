import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MouseTransition, TouchTransition } from 'dnd-multi-backend';

export const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        enableMouseEvents: false, // Disable to prevent conflicts on mobile
        delayTouchStart: 500, // Longer delay = more reliable drag detection
        touchSlop: 10, // Require 10px movement before drag starts
        ignoreContextMenu: true, // Prevent context menu interference
        scrollAngleRanges: [
          { start: 30, end: 150 }, // Allow vertical scrolling
          { start: 210, end: 330 }, // Allow vertical scrolling
        ],
      },
      preview: true,
      transition: TouchTransition,
    },
  ],
};
