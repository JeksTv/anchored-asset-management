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

## Provisioning asset selector

The available-asset selector spans the form width, displays control number before asset name, and sorts control numbers naturally (LT2 before LT10). Hardware choices omit the redundant one-available suffix. Long labels wrap in both the selected value and popup, with 44px minimum touch targets and viewport-bounded popup width. Other compact filters retain their existing layout.

## Overview laptop count

The Overview card displays Laptops assigned: distinct Hardware assets categorized as Laptop with at least one unresolved employee assignment. Returned assignments, other hardware types, temporary borrowing and imported source custody without an employee assignment are excluded.

## Default inventory section

Opening Asset Inventory defaults to the Laptop overview and laptop list, with all laptop states visible. Other asset types remain selectable through Inventory section. Returning to Asset Inventory resets the section to Laptop.

## Sidebar branding

The desktop IT workspace displays the AnchorEd logo at the top of the sidebar with Asset Management centered directly beneath it. Its header logo/title are hidden to avoid duplication. Mobile retains compact header branding and omits the duplicate drawer brand. Sign-in, employee portal and Manage access retain their header/login branding.

The sidebar brand lockup uses a restrained 204px maximum logo, a centered muted subtitle, a fine divider, and a smaller workspace label to separate branding from navigation. Mobile retains the header branding.

## Unified desktop toolbar

The IT workspace account menu sits at the right of the breadcrumb toolbar, eliminating the empty full-width dark header. Desktop toolbar padding reserves space for the menu. Other screens retain a neutral white account header; mobile keeps compact branding and accessible 44px account controls.

## AnchorEd theme

brand-theme.css defines navy (#0b103e) primary actions and headings, gold (#c6a35b) selection accents, white panels and pale neutral backgrounds. Gold is used as an accent; small text uses darker navy or gold-brown for legibility. Operational status colors stay distinct. The theme loads after responsive rules and changes color without changing responsive positioning.

The sign-in logo and Asset Management title form a centered vertical group with a compact gap; form labels remain left-aligned.


## Sidebar navigation order

The desktop sidebar and mobile drawer share the same navigation list. Display labels are separate from internal view names so reordering and capitalization preserve existing destinations.

1. Overview
2. Employees
3. Asset Inventory
4. Onboarding
5. Offboarding
6. Kit Templates
7. Account Requests
8. Laptop Arrangement
9. Deployment and Returns
10. Temporary Borrowing
11. Forms & Documents
12. Procurement
13. Suppliers
14. Manage Records
15. Resigned & Clearance
16. Audit Reports


## Light and dark appearance

Use the Light mode / Dark mode button beside the account menu, or on the sign-in screen. The choice is stored locally in this browser and persists across refresh and sign-out. On first visit the system preference is used. Dark mode uses navy surfaces with gold actions, readable status colors, and the original logo on white. Theme initialization runs before content renders to reduce flashing. This preference does not alter any employee or asset records.

Management tables explicitly use dark header, row and action-button surfaces in dark mode, including alternating rows and hover/focus states. Shared access tables cover employee/asset management and purchasing views.

Dark theme also covers provisioned-item panels, kit summaries, hardware summaries, form lists, purchasing pickers, search inputs, pagination and dialog/select surfaces. Printable forms retain white paper backgrounds and dark text.

Asset detail drawers use the same wrapping task navigation as employee profiles. Details opens first with specifications/notes. Purchase and warranty, location and borrowing, maintenance, verification/QR and history are separated. Imported laptop movements appear only in laptop History; verification remains hardware-only.
