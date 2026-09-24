# Inventory sections

Implemented September 22, 2026 in the company-server VS Code project.

## Using the inventory

Open **Asset inventory**, then choose **Laptop**, **Monitor**, or any other category in **Inventory section**. Each selection has its own overview and asset list. The selector includes counts, standard hardware categories (including empty ones), and additional categories recorded on assets. **All assets** searches across hardware and software; **Software** has its own section. Account requests remain in the employee/account workflow.

The overview shows Total, Available, Deployed, Under maintenance, and Retired. Click a count to filter the list. Total clears the status filter. Counts always cover the entire section, independent of search. In All assets, Total includes software; status cards explicitly count hardware only.

Search by name, tag, serial, model, supplier or custodian. Use the status selector for additional filters, including Service due. The list contains eight assets per page. Changing sections clears search and status and returns to page one. Open any asset to view its existing specifications, history, maintenance records and linked forms. Select an assigned employee to open their profile.

## Count rules and implementation

`lib/inventory-sections.ts` centralizes section matching and status classification. Maintenance and Retired take precedence over custody; Ready hardware with an unresolved assignment or recorded custodian is Deployed; Ready hardware without either is Available. Other states appear as Other. These groups do not overlap. Category matching trims whitespace and normalizes known category capitalization; missing categories appear under Uncategorized.

`components/hardware-dashboard.tsx` renders the selector and overview. `app/page.tsx` applies the section, search and status to the existing paginated list. Styling is in `app/globals.css`. No database migration or role changes are required. Existing inventory and employee relationships remain in the local database.

## Release checks

Run `pnpm typecheck` and `pnpm build`. Verify Laptop and another hardware section, select Available and Deployed, search within a section, switch from a later page to another section, and open an asset. Check Maintenance/Retired assets with custody are excluded from Deployed totals. Empty sections must remain navigable.
