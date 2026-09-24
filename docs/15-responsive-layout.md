# Responsive layout

Updated September 24, 2026.

## Behavior

- Desktop navigation stays within the workspace below the account header, preventing the sidebar from covering the logo or title.
- Below 768px, navigation uses a dismissible drawer and closes after selecting a section.
- Account controls wrap, summary cards adapt to available space, and phone forms use one column.
- Tables retain readable columns and scroll horizontally inside their own area.
- Dialogs and detail panels fit the viewport and allow vertical scrolling. Phone inputs use readable text sizes.

## Implementation

`app/responsive.css` is loaded after the existing styles in `app/layout.tsx`. Mobile navigation selection is handled by `components/workspace-navigation.tsx`; the drawer close button is enabled in `components/ui/sidebar.tsx`.

## Verification

TypeScript checking and the production build passed. Browser verification completed on September 24, 2026: Overview at 320, 390, 768, 1024, and 1440 pixel widths had no page-wide horizontal overflow. At 1440 pixels the sidebar top matched the account header bottom (78.475 pixels), confirming that the overlap is resolved. Employees, inventory, suppliers, procurement, laptop arrangements, resigned/clearance, and forms pages were checked at tablet width; narrow-phone checks covered the same areas. Employee, asset, and procurement dialogs fit phone widths without horizontal overflow. Mobile navigation opened and closed after section selection. Inventory tables scrolled within their containers (342 pixel container / 660 pixel table at a 390 pixel viewport). No business records were changed during these checks.

For future regression checks, use widths 320, 390, 768, 1024, and 1440 pixels: header/sidebar separation, drawer open/close, Employees and Asset inventory pagination and tables, procurement and employee dialogs, and clearance forms. Verify there is no page-wide horizontal scrolling; horizontal scrolling inside wide tables is intentional. Also check keyboard access and portrait/landscape on actual devices before rollout.


## Account hamburger menu
The top-right hamburger opens the account name/role, Manage access (Admin/Super Admin), Change password and Sign out. Within account administration, Manage access becomes IT workspace. The existing accessible menu component supports keyboard navigation and dismissal. Verified menu navigation and 320px layout; type checking passed.
