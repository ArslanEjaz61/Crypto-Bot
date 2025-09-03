import React from 'react';
import { Fade, Slide, Grow, Collapse, Box } from '@mui/material';

// Smooth transition wrapper for components
const SmoothTransition = ({ 
  children, 
  type = 'fade', 
  direction = 'up',
  timeout = 300,
  in: inProp = true,
  ...props 
}) => {
  const transitionProps = {
    in: inProp,
    timeout,
    ...props
  };

  switch (type) {
    case 'slide':
      return (
        <Slide direction={direction} {...transitionProps}>
          <Box>{children}</Box>
        </Slide>
      );
    case 'grow':
      return (
        <Grow {...transitionProps}>
          <Box>{children}</Box>
        </Grow>
      );
    case 'collapse':
      return (
        <Collapse {...transitionProps}>
          <Box>{children}</Box>
        </Collapse>
      );
    case 'fade':
    default:
      return (
        <Fade {...transitionProps}>
          <Box>{children}</Box>
        </Fade>
      );
  }
};

export default SmoothTransition;
