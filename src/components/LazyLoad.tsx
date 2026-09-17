import { Suspense, ComponentType, ReactNode } from 'react';
import { Loading } from "@/components/ui/states";

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const DefaultFallback = () => (
  <Loading />
);

export const LazyLoad = ({ children, fallback = <DefaultFallback /> }: LazyLoadProps) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// HOC for lazy loading components
export const withLazyLoad = <P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <LazyLoad fallback={fallback}>
      <Component {...props} />
    </LazyLoad>
  );
};

export default LazyLoad;