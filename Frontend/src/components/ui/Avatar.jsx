import { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../../api/client';
import { initials } from '../../lib/format';

export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const url = resolveAssetUrl(src);
  const showImage = url && !failed;

  return (
    <span className={`avatar avatar-${size} ${className}`.trim()} aria-hidden={showImage ? undefined : 'true'}>
      {showImage ? (
        <img src={url} alt={name ? `${name}'s avatar` : 'Avatar'} onError={() => setFailed(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
