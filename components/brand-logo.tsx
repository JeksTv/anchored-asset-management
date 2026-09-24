export function BrandLogo({variant='sidebar'}:{variant?:'sidebar'|'login'|'header'}) {
  return <img className={`anchored-logo anchored-logo-${variant}`} src="/branding/anchored-logo.jpeg" alt="AnchorEd" width={2924} height={864}/>;
}
