import { useState } from 'react';
import { NetworkInterceptor } from '../components/NetworkInterceptor';

export function InterceptorPage() {
  const [isActive, setIsActive] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');

  return (
    <div className="h-full">
      <NetworkInterceptor
        isActive={isActive}
        onToggle={() => setIsActive(!isActive)}
        targetUrl={targetUrl}
        onTargetUrlChange={setTargetUrl}
      />
    </div>
  );
}