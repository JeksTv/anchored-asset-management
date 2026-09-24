# AnchorEd logo

The official logo supplied on September 24, 2026 is stored unchanged as `public/branding/anchored-logo.jpeg`. It appears on sign-in, password change and the signed-in header (including the employee portal). The workspace sidebar contains navigation only: the repeated logo and product title were removed so desktop and mobile users see one brand mark in the workspace.

`components/brand-logo.tsx` provides the shared image with meaningful alternative text. Styles in `app/globals.css` preserve the original proportions and white background. No stretching, recoloring or image regeneration is applied. The product name remains AnchorEd Asset Management in page metadata. The source package includes the logo; no database migration is needed.

