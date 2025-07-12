import React from 'react';
import Logo from '../ui/Logo';

const PanoramaLogo: React.FC = React.memo(() => {
  return <Logo variant="default" position="absolute" />;
});

PanoramaLogo.displayName = 'PanoramaLogo';

export default PanoramaLogo;