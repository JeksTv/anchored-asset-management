# Selected-brand team summary

Selecting a specific brand in Employees displays Total team members, Using company laptop, Availed gadget loan and Using personal laptop. All brands keeps the compact directory without the summary.

Counts use the matching directory population before pagination, including personnel, status and search filters. Internal personnel remains the default. Team members count people, not devices. Company-laptop users are distinct people with unresolved laptop assignments. Gadget loans include Active and Completed arrangements; personal use requires Yes. A person may belong to multiple laptop categories. Unlinked source custody is not attributed to a person. Unknown arrangements are not inferred. Counts refresh with workspace data.

No migration is needed. Workspace returns arrangement status fields alongside its existing data. TypeScript validation passed.

Summary cards are clickable filters with an accessible selected state. Total team members resets the laptop-use filter. Counts remain based on the brand/search/status/personnel scope rather than the selected card. Changing brand or navigating sections resets the card filter; card changes reset pagination. The same shared predicate determines both counts and list membership.
