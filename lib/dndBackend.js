import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MouseTransition, TouchTransition, MultiBackend } from 'react-dnd-multi-backend';

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
      options: { enableMouseEvents: true, delayTouchStart: 200 },
      preview: true,
      transition: TouchTransition,
    },
  ],
};
