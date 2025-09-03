import React, { Suspense } from 'react';
import { Box, Skeleton, LinearProgress } from '@mui/material';

// Loading fallback component with skeleton
const ComponentSkeleton = ({ height = 400, variant = 'rectangular' }) => (
  <Box sx={{ p: 2 }}>
    <LinearProgress sx={{ mb: 2 }} />
    <Skeleton variant={variant} width="100%" height={height} />
  </Box>
);

// Lazy component wrapper with error boundary
const LazyComponentLoader = ({ 
  children, 
  fallback, 
  height = 400,
  variant = 'rectangular'
}) => {
  const defaultFallback = <ComponentSkeleton height={height} variant={variant} />;
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyComponentLoader;
