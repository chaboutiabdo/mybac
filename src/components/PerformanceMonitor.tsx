import { useEffect } from 'react';

/**
 * Performance Monitor Component
 * Tracks and reports performance metrics
 */
export const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    // Track page load performance
    const trackPerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
          'TCP Connection': navigation.connectEnd - navigation.connectStart,
          'Request': navigation.responseEnd - navigation.requestStart,
          'Response': navigation.responseEnd - navigation.responseStart,
          'DOM Processing': navigation.domContentLoadedEventEnd - navigation.responseEnd,
          'Total Load Time': navigation.loadEventEnd - navigation.navigationStart,
        };

        console.group('🚀 Performance Metrics');
        Object.entries(metrics).forEach(([key, value]) => {
          console.log(`${key}: ${value.toFixed(2)}ms`);
        });
        console.groupEnd();
      }
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
    }

    // Track memory usage (if available)
    const trackMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.group('💾 Memory Usage');
        console.log(`Used: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
        console.log(`Total: ${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`);
        console.log(`Limit: ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`);
        console.groupEnd();
      }
    };

    // Track memory every 30 seconds
    const memoryInterval = setInterval(trackMemory, 30000);

    return () => {
      window.removeEventListener('load', trackPerformance);
      clearInterval(memoryInterval);
    };
  }, []);

  return null;
};

export default PerformanceMonitor;
